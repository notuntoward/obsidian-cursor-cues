import { Plugin, MarkdownView } from 'obsidian';
import { EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { VisibleCursorPluginSettings, DEFAULT_SETTINGS, VisibleCursorSettingTab } from './settings';

class EndOfLineWidget extends WidgetType {
	constructor(private markerColor: string, private contrastColor: string, private style: 'block' | 'bar' = 'block', private lineHeight?: number) {
		super();
	}
	toDOM() {
		const span = document.createElement('span');
		span.textContent = ' ';
		
		if (this.style === 'bar') {
			span.className = 'cursor-flash-bar';
			const heightStyle = this.lineHeight ? `height: ${this.lineHeight}px;` : 'height: 1em;';
			span.style.cssText = `
				display: inline-block;
				width: 4px;
				${heightStyle}
				background-color: ${this.markerColor};
				pointer-events: none;
				vertical-align: text-bottom;
				margin-left: -1px;
			`;
		} else {
			span.className = 'cursor-flash-block-mark';
			span.style.cssText = `
				background-color: ${this.markerColor};
				color: ${this.contrastColor};
				display: inline-block;
				width: 0.5em;
				pointer-events: none;
			`;
		}
		span.setAttribute('aria-hidden', 'true');
		return span;
	}
}

class BarCursorWidget extends WidgetType {
	constructor(private markerColor: string, private lineHeight: number) {
		super();
	}
	toDOM() {
		const span = document.createElement('span');
		span.className = 'cursor-flash-bar';
		span.style.cssText = `
			display: inline-block;
			width: 3px;
			height: ${this.lineHeight}px;
			background-color: ${this.markerColor};
			pointer-events: none;
			vertical-align: text-bottom;
			position: relative;
			margin-left: -1px;
			z-index: 1;
		`;
		span.setAttribute('aria-hidden', 'true');
		return span;
	}
}

export default class VisibleCursorPlugin extends Plugin {
	settings: VisibleCursorPluginSettings;
	private styleElement: HTMLStyleElement | null = null;

	private lastViewChange: number = 0;
	private flashTimeout: NodeJS.Timeout | null = null;
	private resetFlashTimeout: NodeJS.Timeout | null = null;
	private scrollDebounceTimer: NodeJS.Timeout | null = null;
	private lastScrollPosition: number = 0;
	private flashActive: boolean = false;
	private decorationView: EditorView | null = null;
	private clickFenceActive: boolean = false;
	private pendingFlashTrigger: string | null = null;
	private scrollFlashSuppressedUntil: number = 0;
	private boundStartFence: () => void;
	private boundEndFenceSoon: () => void;
	private boundClickEndFence: () => void;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new VisibleCursorSettingTab(this.app, this));

		const decorationPlugin = this.createDecorationPlugin();
		this.registerEditorExtension([
			decorationPlugin,
			this.createDOMEventHandlers()
		]);

		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				if (this.settings.flashOnWindowChanges) {
						requestAnimationFrame(() => requestAnimationFrame(() => this.scheduleFlash('view-change', false)));
				}
			})
		);

		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				if (this.settings.flashOnWindowChanges) {
					requestAnimationFrame(() => requestAnimationFrame(() => this.scheduleFlash('layout-change', false)));
				}
			})
		);

		this.registerEvent(
			this.app.workspace.on('css-change', () => {
				this.app.workspace.updateOptions();
			})
		);

		// Global click fence: block flash work during pointer->click and a short tail
		this.boundStartFence = () => { this.clickFenceActive = true; };
		this.boundEndFenceSoon = () => { setTimeout(() => { this.clickFenceActive = false; }, 400); };
		this.boundClickEndFence = () => { this.boundEndFenceSoon(); };
		window.addEventListener('pointerdown', this.boundStartFence, { capture: true });
		window.addEventListener('pointerup', this.boundEndFenceSoon, { capture: true });
		window.addEventListener('pointercancel', this.boundEndFenceSoon, { capture: true });
		window.addEventListener('click', this.boundClickEndFence, { capture: true });
	}

	createDecorationPlugin() {
		const plugin = this;
		return ViewPlugin.fromClass(class {
			decorations: DecorationSet;

			constructor(view: EditorView) {
				this.decorations = Decoration.none;
				plugin.decorationView = view;
			}

			update(update: ViewUpdate) {
				this.decorations = this.buildDecorations(update.view);
			}

			buildDecorations(view: EditorView): DecorationSet {
				const builder = new RangeSetBuilder();
				if (!view.hasFocus) {
					return builder.finish() as DecorationSet;
				}

				const showAlwaysOn = plugin.settings.customCursorMode === 'always';
				const showFlash = plugin.settings.customCursorMode === 'flash' && plugin.flashActive;
				const shouldShowCursor = showAlwaysOn || showFlash;

				if (!shouldShowCursor) {
					return builder.finish() as DecorationSet;
				}

				const pos = view.state.selection.main.head;
				const markerColor = plugin.getColor().color;
				const contrastColor = plugin.getContrastColor(markerColor);
				plugin.updateCursorStyles(markerColor, contrastColor);

				// Get the actual line height from font-size which is more reliable
				let actualLineHeight = view.defaultLineHeight;
				try {
					const domAtPos = view.domAtPos(pos);
					if (domAtPos && domAtPos.node) {
						const element = domAtPos.node.nodeType === 1
							? domAtPos.node as HTMLElement
							: domAtPos.node.parentElement;
						if (element) {
							const lineElement = element.closest('.cm-line');
							if (lineElement) {
								const computedStyle = getComputedStyle(lineElement);
								// Use font-size which matches cursor height better
								const fontSize = computedStyle.fontSize;
								const parsed = parseFloat(fontSize);
								if (!isNaN(parsed)) {
									actualLineHeight = parsed * 1.5; // Approximate line height as 1.5x font size
								}
							}
						}
					}
				} catch (e) {
					// Fallback to default if there's any error
					actualLineHeight = view.defaultLineHeight;
				}

				if (pos >= view.state.doc.length) {
					if (view.state.doc.length > 0) {
					const widgetStyle = plugin.settings.customCursorStyle === 'bar' ? 'bar' : 'block';
						const widget = Decoration.widget({
							widget: new EndOfLineWidget(markerColor, contrastColor, widgetStyle, actualLineHeight),
							side: 1
						});
						builder.add(view.state.doc.length, view.state.doc.length, widget);
					}
				} else {
					const char = view.state.doc.sliceString(pos, pos + 1);
					if (char === '\n' || char === '') {
						const widgetStyle = plugin.settings.customCursorStyle === 'bar' ? 'bar' : 'block';
						const widget = Decoration.widget({
							widget: new EndOfLineWidget(markerColor, contrastColor, widgetStyle, actualLineHeight),
							side: 1
						});
						builder.add(pos, pos, widget);
					} else {
						if (plugin.settings.customCursorStyle === 'bar') {
							// Use a widget positioned before the character for bar cursor
							const widget = Decoration.widget({
								widget: new BarCursorWidget(markerColor, actualLineHeight),
								side: 0
							});
							builder.add(pos, pos, widget);
						} else {
							// Use mark decoration for block cursor
							const decoration = Decoration.mark({
								attributes: {
									class: 'cursor-flash-block-mark',
								}
							});
							builder.add(pos, pos + 1, decoration);
						}
					}
				}

				return builder.finish() as DecorationSet;
			}
		}, {
			decorations: (v: any) => v.decorations
		});
	}

	createDOMEventHandlers() {
		const plugin = this;

		return EditorView.domEventHandlers({
			scroll: (event: Event, view: EditorView) => {
				if (!plugin.settings.flashOnWindowScrolls) return false;

				const currentScrollPos = view.scrollDOM.scrollTop;
				const scrollDelta = Math.abs(currentScrollPos - plugin.lastScrollPosition);
				plugin.lastScrollPosition = currentScrollPos;

				// While a flash is active (or was recently shown), keep extending the
				// suppression window and cancel any pending debounce.  This prevents
				// momentum / inertial scrolling from triggering a second flash.
				const now = Date.now();
				if (plugin.flashActive || now < plugin.scrollFlashSuppressedUntil) {
					plugin.scrollFlashSuppressedUntil = now + 300;
					if (plugin.scrollDebounceTimer) {
						clearTimeout(plugin.scrollDebounceTimer);
						plugin.scrollDebounceTimer = null;
					}
					return false;
				}

				if (plugin.scrollDebounceTimer) {
					clearTimeout(plugin.scrollDebounceTimer);
				}

				const debounceTime = scrollDelta < 5 ? 250 : 150;
				plugin.scrollDebounceTimer = setTimeout(() => {
					plugin.scheduleFlash('scroll', false);
					plugin.scrollDebounceTimer = null;
				}, debounceTime);

				return false;
			}
		});
	}

	scheduleFlash(trigger: string, isMouseClick: boolean) {
		if (isMouseClick) return;
		const isViewTrigger = trigger === 'view-change' || trigger === 'layout-change';
		// View/layout triggers bypass click fence because
		// switching notes inherently involves a click.
		if (!isViewTrigger && this.clickFenceActive) return;
		if (this.flashActive || this.pendingFlashTrigger) return;
		const now = Date.now();
		if (now - this.lastViewChange < 100) return;

		this.lastViewChange = now;
		if (this.flashTimeout) {
			clearTimeout(this.flashTimeout);
		}

		this.pendingFlashTrigger = trigger;
		this.flashTimeout = setTimeout(() => {
			this.showFlash();
			this.pendingFlashTrigger = null;
		}, 50);
	}

	showFlash() {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view || !view.editor) return;

		const editorView = (view.editor as any).cm as EditorView;
		if (!editorView) return;

		// Cancel any pending scroll debounce so it can't fire after this flash
		if (this.scrollDebounceTimer) {
			clearTimeout(this.scrollDebounceTimer);
			this.scrollDebounceTimer = null;
		}

		if (this.settings.lineHighlightMode === 'left') {
			this.showLineFlash(editorView);
		} else if (this.settings.lineHighlightMode === 'centered') {
			this.showCursorCenteredFlash(editorView);
		} else if (this.settings.lineHighlightMode === 'right') {
			this.showLineFlashRightToLeft(editorView);
		}

		// Always set flashActive as a cooldown guard to prevent
		// double-triggering (e.g. scroll → showFlash → layout shift → scroll)
		this.flashActive = true;
		if (this.resetFlashTimeout) {
			clearTimeout(this.resetFlashTimeout);
		}

		// Only dispatch when customCursorMode is 'flash' (to toggle the decoration).
		// Allow dispatch during click fence for view-change/layout-change triggers.
		const isViewFlashTrigger = this.pendingFlashTrigger === 'view-change' || this.pendingFlashTrigger === 'layout-change';
		if (this.settings.customCursorMode === 'flash') {
			if (isViewFlashTrigger || !this.clickFenceActive) { editorView.dispatch({}); }
		}

		this.resetFlashTimeout = setTimeout(() => {
			this.flashActive = false;
			if (this.settings.customCursorMode === 'flash') {
				editorView.dispatch({});
			}
		}, this.settings.lineDuration);
	}

	showLineFlash(editorView: EditorView) {
		const cursor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
		if (!cursor) return;

		const pos = (cursor as any).posToOffset(cursor.getCursor());
		const coords = editorView.coordsAtPos(pos);
		if (!coords) return;

		const editorElement = editorView.contentDOM;
		const editorRect = editorElement.getBoundingClientRect();
		const lineHeight = editorView.defaultLineHeight;
		const { color, opacity } = this.getColor();
		const rgb = this.hexToRgb(color);
		// Calculate highlight distance based on flashSize setting (in character widths)
		const fontSize = parseFloat(getComputedStyle(editorElement).fontSize) || 16;
		const charWidth = fontSize * 0.6; // Approximate character width
		const highlightDistance = this.settings.flashSize * charWidth; // Direct width in pixels
		const highlightPercent = Math.min(100, (highlightDistance / editorRect.width) * 100);

		const lineHighlight = document.createElement('div');
		lineHighlight.className = 'obsidian-flash-line';
		lineHighlight.style.cssText = `
		position: fixed;
		left: ${editorRect.left}px;
		top: ${coords.top}px;
		width: ${editorRect.width}px;
		height: ${lineHeight}px;
		background: linear-gradient(to right,
			rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity}) 0%,
			rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.5}) ${highlightPercent * 0.5}%,
			rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0) ${highlightPercent}%,
			rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0) 100%
		);
		pointer-events: none;
		z-index: 1;
		animation: flash-line-fade ${this.settings.lineDuration}ms ease-out;
		`;

		document.body.appendChild(lineHighlight);
		setTimeout(() => {
			lineHighlight.remove();
		}, this.settings.lineDuration);
	}

	showLineFlashRightToLeft(editorView: EditorView) {
		const cursor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
		if (!cursor) return;

		const pos = (cursor as any).posToOffset(cursor.getCursor());
		const coords = editorView.coordsAtPos(pos);
		if (!coords) return;

		const editorElement = editorView.contentDOM;
		const editorRect = editorElement.getBoundingClientRect();
		const lineHeight = editorView.defaultLineHeight;
		const { color, opacity } = this.getColor();
		const rgb = this.hexToRgb(color);
		// Calculate highlight distance based on flashSize setting (in character widths)
		const fontSize = parseFloat(getComputedStyle(editorElement).fontSize) || 16;
		const charWidth = fontSize * 0.6; // Approximate character width
		const highlightDistance = this.settings.flashSize * charWidth; // Direct width in pixels
		const highlightPercent = Math.min(100, (highlightDistance / editorRect.width) * 100);

		const lineHighlight = document.createElement('div');
		lineHighlight.className = 'obsidian-flash-line';
		lineHighlight.style.cssText = `
		position: fixed;
		left: ${editorRect.left}px;
		top: ${coords.top}px;
		width: ${editorRect.width}px;
		height: ${lineHeight}px;
		background: linear-gradient(to left,
			rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity}) 0%,
			rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.5}) ${highlightPercent * 0.5}%,
			rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0) ${highlightPercent}%,
			rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0) 100%
		);
		pointer-events: none;
		z-index: 1;
		animation: flash-line-fade ${this.settings.lineDuration}ms ease-out;
		`;

		document.body.appendChild(lineHighlight);
		setTimeout(() => {
			lineHighlight.remove();
		}, this.settings.lineDuration);
	}

	showCursorCenteredFlash(editorView: EditorView) {
		const cursor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
		if (!cursor) return;

		const pos = (cursor as any).posToOffset(cursor.getCursor());
		const coords = editorView.coordsAtPos(pos);
		if (!coords) return;

		const editorElement = editorView.contentDOM;
		const editorRect = editorElement.getBoundingClientRect();
		const lineHeight = editorView.defaultLineHeight;
		const cursorX = coords.left - editorRect.left;
		const editorWidth = editorRect.width;
		const cursorPercent = (cursorX / editorWidth) * 100;
		const { color, opacity } = this.getColor();
		const rgb = this.hexToRgb(color);

		const lineHighlight = document.createElement('div');
		lineHighlight.className = 'obsidian-flash-cursor-line';
		const peakOpacity = opacity;
		const fadeOpacity = opacity * 0.75;
		// Calculate spread distance based on flashSize setting (in character widths)
		const fontSize = parseFloat(getComputedStyle(editorElement).fontSize) || 16;
		const charWidth = fontSize * 0.6; // Approximate character width
		const spreadDistance = (this.settings.flashSize / 2) * charWidth; // flashSize/2 on each side
		const spreadPercent = (spreadDistance / editorRect.width) * 100;
		const leftEdge = Math.max(0, cursorPercent - spreadPercent);
		const rightEdge = Math.min(100, cursorPercent + spreadPercent);

		lineHighlight.style.cssText = `
		position: fixed;
		left: ${editorRect.left}px;
		top: ${coords.top}px;
		width: ${editorRect.width}px;
		height: ${lineHeight}px;
		background: linear-gradient(to right,
			rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0) 0%,
			rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0) ${leftEdge}%,
			rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${fadeOpacity}) ${(leftEdge + cursorPercent) / 2}%,
			rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${peakOpacity}) ${cursorPercent}%,
			rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${fadeOpacity}) ${(cursorPercent + rightEdge) / 2}%,
			rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0) ${rightEdge}%,
			rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0) 100%
		);
		pointer-events: none;
		z-index: 1;
		animation: flash-line-fade ${this.settings.lineDuration}ms ease-out;
		`;

		document.body.appendChild(lineHighlight);
		setTimeout(() => {
			lineHighlight.remove();
		}, this.settings.lineDuration);
	}

	getColor(): { color: string, opacity: number } {
		const isDark = document.body.classList.contains('theme-dark');
		if (this.settings.useThemeColors) {
			const accentColor = getComputedStyle(document.body)
				.getPropertyValue('--interactive-accent').trim();

			if (accentColor) {
				if (this.settings.customCursorStyle === 'bar') {
					// Bar cursor: use accent as-is
					return { color: accentColor, opacity: 0.8 };
				}
				
				// Block cursor: adjust accent color for better text readability
				// We want a color that works well with either white or black text
				if (isDark) {
					// Dark theme: lighten the accent slightly so white text is more readable
					// Mix 85% accent with 15% white for a slightly lighter background
					return { color: `color-mix(in srgb, ${accentColor} 85%, white)`, opacity: 0.8 };
				} else {
					// Light theme: significantly lighten the accent so black text is readable
					// Mix 30% accent with 70% white for a light pastel background
					return { color: `color-mix(in srgb, ${accentColor} 30%, white)`, opacity: 0.8 };
				}
			}

			return { color: accentColor || '#6496ff', opacity: 0.8 };
		}
		const color = isDark ? this.settings.cursorCustomColorDark : this.settings.cursorCustomColorLight;
		return { color, opacity: 0.8 };
	}

	getRelativeLuminance(r: number, g: number, b: number): number {
		const rsRGB = r / 255;
		const gsRGB = g / 255;
		const bsRGB = b / 255;

		const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
		const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
		const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

		return 0.2126 * rLinear + 0.7150 * gLinear + 0.0722 * bLinear;
	}

	getContrastRatio(color1: string, color2: string): number {
		const rgb1 = this.resolveColorToRgb(color1);
		const rgb2 = this.resolveColorToRgb(color2);

		const L1 = this.getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
		const L2 = this.getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);

		const lighter = Math.max(L1, L2);
		const darker = Math.min(L1, L2);

		return (lighter + 0.05) / (darker + 0.05);
	}

	getContrastColor(cursorBackgroundColor: string): string {
		const computedStyle = getComputedStyle(document.body);
		
		// Get theme colors for candidate text colors
		const bgColor = computedStyle.getPropertyValue('--background-primary').trim() || '#ffffff';
		const textColor = computedStyle.getPropertyValue('--text-normal').trim() || '#000000';
		const textOnAccent = computedStyle.getPropertyValue('--text-on-accent').trim();
		
		// Resolve the cursor background color to RGB for contrast calculation
		// This handles CSS variables like --interactive-accent
		let resolvedCursorColor = cursorBackgroundColor;
		if (cursorBackgroundColor.startsWith('var(') || cursorBackgroundColor.startsWith('color-mix')) {
			// Create temp element to resolve the color
			const temp = document.createElement('div');
			temp.style.cssText = `background-color: ${cursorBackgroundColor}; display: none;`;
			document.body.appendChild(temp);
			resolvedCursorColor = getComputedStyle(temp).backgroundColor;
			document.body.removeChild(temp);
		}
		
		// Candidate text colors to try, in order of preference:
		// 1. Theme's --text-on-accent (if available) - designed for text on accent colors
		// 2. White (#ffffff) - works well on dark/medium backgrounds
		// 3. Black (#000000) - works well on light backgrounds
		// 4. Theme's normal text color
		// 5. Theme's background color (inverted from normal)
		const candidates: { color: string; priority: number }[] = [];
		
		if (textOnAccent) {
			candidates.push({ color: textOnAccent, priority: 1 });
		}
		candidates.push({ color: '#ffffff', priority: 2 });
		candidates.push({ color: '#000000', priority: 3 });
		candidates.push({ color: textColor, priority: 4 });
		candidates.push({ color: bgColor, priority: 5 });
		
		// Calculate contrast ratios and find the best option
		let bestColor = '#ffffff';
		let bestContrast = 0;
		let bestPriority = Infinity;
		
		for (const candidate of candidates) {
			try {
				const contrast = this.getContrastRatio(resolvedCursorColor, candidate.color);
				// Prefer higher contrast, but among similar contrast levels, prefer lower priority
				// Use a threshold of 0.5 to consider contrast "similar"
				if (contrast > bestContrast + 0.5 || 
					(contrast > bestContrast - 0.5 && candidate.priority < bestPriority)) {
					bestContrast = contrast;
					bestColor = candidate.color;
					bestPriority = candidate.priority;
				}
			} catch (e) {
				// Skip invalid colors
			}
		}
		
		// Minimum contrast ratio for readability (WCAG AA for normal text is 4.5:1)
		// If we can't achieve good contrast, at least return the best we found
		return bestColor;
	}

	private updateCursorStyles(markerColor: string, contrastColor: string): void {
		if (this.styleElement) {
			this.styleElement.remove();
		}
		
		this.styleElement = document.createElement('style');
		this.styleElement.id = 'cursor-flash-dynamic-styles';
		
		let styleContent = `
			.cursor-flash-block-mark {
				background-color: ${markerColor} !important;
				color: ${contrastColor} !important;
			}
		`;
		
		if (this.settings.customCursorStyle === 'bar') {
			styleContent += `
			.cursor-flash-bar {
				background: linear-gradient(90deg, ${markerColor} 0px, ${markerColor} 3px, transparent 3px) !important;
			}
			`;
		}
		
		this.styleElement.textContent = styleContent;
		document.head.appendChild(this.styleElement);
	}

	hexToRgb(hex: string): { r: number, g: number, b: number } {
		if (hex.startsWith('rgb')) {
			const matches = hex.match(/\d+/g);
			if (matches && matches.length >= 3) {
				return {
					r: parseInt(matches[0]),
					g: parseInt(matches[1]),
					b: parseInt(matches[2])
				};
			}
		}
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : { r: 100, g: 150, b: 255 };
	}

	/**
	 * Resolve any CSS color (including color-mix(), var(), etc.) to RGB values
	 * by creating a temporary element and reading the computed color
	 */
	resolveColorToRgb(color: string): { r: number, g: number, b: number } {
		// First try parsing as hex or rgb
		if (color.startsWith('#') || color.startsWith('rgb')) {
			return this.hexToRgb(color);
		}
		
		// For color-mix(), var(), or other CSS functions, use a temporary element
		try {
			const temp = document.createElement('div');
			temp.style.cssText = `color: ${color}; display: none;`;
			document.body.appendChild(temp);
			const computed = getComputedStyle(temp).color;
			document.body.removeChild(temp);
			
			// Parse the computed rgb() or rgba() value
			const matches = computed.match(/\d+/g);
			if (matches && matches.length >= 3) {
				return {
					r: parseInt(matches[0]),
					g: parseInt(matches[1]),
					b: parseInt(matches[2])
				};
			}
		} catch (e) {
			// Fall through to default
		}
		
		// Default fallback
		return { r: 100, g: 150, b: 255 };
	}

	refreshDecorations() {
		if (this.decorationView && this.decorationView.hasFocus) {
			// Force a rebuild by dispatching with selection change to trigger update
			this.decorationView.dispatch({
				selection: this.decorationView.state.selection
			});
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		// Migrate old setting names and values
		const anySettings = this.settings as any;
		// Migrate 'blockCursorMode' to 'customCursorMode'
		if (anySettings.blockCursorMode !== undefined && anySettings.customCursorMode === undefined) {
			anySettings.customCursorMode = anySettings.blockCursorMode;
			delete anySettings.blockCursorMode;
		}
		// Migrate 'blockCursorStyle' to 'customCursorStyle'
		if (anySettings.blockCursorStyle !== undefined && anySettings.customCursorStyle === undefined) {
			anySettings.customCursorStyle = anySettings.blockCursorStyle;
			delete anySettings.blockCursorStyle;
		}
		// Migrate old 'thick-vertical' setting value to 'bar'
		if (anySettings.customCursorStyle === 'thick-vertical') {
			anySettings.customCursorStyle = 'bar';
		}
		await this.saveSettings();
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload() {
		if (this.styleElement) {
			this.styleElement.remove();
		}
		if (this.flashTimeout) {
			clearTimeout(this.flashTimeout);
		}
		if (this.resetFlashTimeout) {
			clearTimeout(this.resetFlashTimeout);
		}
		if (this.scrollDebounceTimer) {
			clearTimeout(this.scrollDebounceTimer);
		}
		// Remove global event listeners added in onload
		window.removeEventListener('pointerdown', this.boundStartFence, { capture: true });
		window.removeEventListener('pointerup', this.boundEndFenceSoon, { capture: true });
		window.removeEventListener('pointercancel', this.boundEndFenceSoon, { capture: true });
		window.removeEventListener('click', this.boundClickEndFence, { capture: true });
	}
}
