import { Plugin, MarkdownView } from 'obsidian';
import { EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { CursorCuesPluginSettings, DEFAULT_SETTINGS, CursorCuesSettingTab } from './settings';

class EndOfLineWidget extends WidgetType {
	constructor(private markerColor: string, private contrastColor: string) {
		super();
	}
	toDOM() {
		const span = document.createElement('span');
		span.textContent = ' ';
		span.style.cssText = `
			background-color: ${this.markerColor};
			color: ${this.contrastColor};
			display: inline-block;
			width: 0.5em;
			pointer-events: none;
		`;
		span.setAttribute('aria-hidden', 'true');
		return span;
	}
	
}

export default class CursorCuesPlugin extends Plugin {
	settings: CursorCuesPluginSettings;
	private styleElement: HTMLStyleElement | null = null;

	private lastViewChange: number = 0;
	private cueTimeout: NodeJS.Timeout | null = null;
	private resetCueTimeout: NodeJS.Timeout | null = null;
	private scrollDebounceTimer: NodeJS.Timeout | null = null;
	private lastScrollPosition: number = 0;
	private cueFlashActive: boolean = false;
	private decorationView: EditorView | null = null;
	private clickFenceActive: boolean = false;
	private pendingCueTrigger: string | null = null;
	private scrollCueSuppressedUntil: number = 0;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new CursorCuesSettingTab(this.app, this));

		const decorationPlugin = this.createCueDecorationPlugin();
		this.registerEditorExtension([
			decorationPlugin,
			this.createDOMEventHandlers()
		]);

		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				if (this.settings.flashOnWindowChanges) {
					requestAnimationFrame(() => requestAnimationFrame(() => this.scheduleCue('view-change', false)));
				}
			})
		);

		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				if (this.settings.flashOnWindowChanges) {
					requestAnimationFrame(() => requestAnimationFrame(() => this.scheduleCue('layout-change', false)));
				}
			})
		);

		this.registerEvent(
			this.app.workspace.on('css-change', () => {
				this.app.workspace.updateOptions();
			})
		);

		// Global click fence: block cue work during pointer->click and a short tail
		const startFence = () => { this.clickFenceActive = true; };
		const endFenceSoon = () => { setTimeout(() => { this.clickFenceActive = false; }, 400); };
		window.addEventListener('pointerdown', startFence, { capture: true });
		window.addEventListener('pointerup', endFenceSoon, { capture: true });
		window.addEventListener('pointercancel', endFenceSoon, { capture: true });
		window.addEventListener('click', () => { endFenceSoon(); }, { capture: true });
	}

	createCueDecorationPlugin() {
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

				const showAlwaysOn = plugin.settings.blockCursorMode === 'always';
				const showFlash = plugin.settings.blockCursorMode === 'flash' && plugin.cueFlashActive;
				const shouldShowCursor = showAlwaysOn || showFlash;

				if (!shouldShowCursor) {
					return builder.finish() as DecorationSet;
				}

				const pos = view.state.selection.main.head;
				const markerColor = plugin.getCueColor().color;
				const contrastColor = plugin.getContrastColor(markerColor);
				plugin.updateCursorStyles(markerColor, contrastColor);

				if (pos >= view.state.doc.length) {
					if (view.state.doc.length > 0) {
						const widget = Decoration.widget({
							widget: new EndOfLineWidget(markerColor, contrastColor),
							side: 1
						});
						builder.add(view.state.doc.length, view.state.doc.length, widget);
					}
				} else {
					const char = view.state.doc.sliceString(pos, pos + 1);
					if (char === '\n' || char === '') {
						const widget = Decoration.widget({
							widget: new EndOfLineWidget(markerColor, contrastColor),
							side: 1
						});
						builder.add(pos, pos, widget);
					} else {
						const cursorClass = plugin.settings.blockCursorStyle === 'thick-vertical'
							? 'cursor-cues-thick-vertical'
							: 'cursor-cues-block-mark';
						const decoration = Decoration.mark({
							attributes: {
								class: cursorClass,
								}
						});
						builder.add(pos, pos + 1, decoration);
					}
				}

				return builder.finish() as DecorationSet;
			}
		}, {
			decorations: v => v.decorations
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

				// While a cue is active (or was recently shown), keep extending the
				// suppression window and cancel any pending debounce.  This prevents
				// momentum / inertial scrolling from triggering a second flash.
				const now = Date.now();
				if (plugin.cueFlashActive || now < plugin.scrollCueSuppressedUntil) {
					plugin.scrollCueSuppressedUntil = now + 300;
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
					plugin.scheduleCue('scroll', false);
					plugin.scrollDebounceTimer = null;
				}, debounceTime);

				return false;
			}
		});
	}

	scheduleCue(trigger: string, isMouseClick: boolean) {
		if (isMouseClick) return;
		const isViewTrigger = trigger === 'view-change' || trigger === 'layout-change';
		// View/layout triggers bypass click fence because
		// switching notes inherently involves a click.
		if (!isViewTrigger && this.clickFenceActive) return;
		if (this.cueFlashActive || this.pendingCueTrigger) return;
		const now = Date.now();
		if (now - this.lastViewChange < 100) return;

		this.lastViewChange = now;
		if (this.cueTimeout) {
			clearTimeout(this.cueTimeout);
		}

		this.pendingCueTrigger = trigger;
		this.cueTimeout = setTimeout(() => {
			this.showCue();
			this.pendingCueTrigger = null;
		}, 50);
	}

	showCue() {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view || !view.editor) return;

		const editorView = (view.editor as any).cm as EditorView;
		if (!editorView) return;

		// Cancel any pending scroll debounce so it can't fire after this cue
		if (this.scrollDebounceTimer) {
			clearTimeout(this.scrollDebounceTimer);
			this.scrollDebounceTimer = null;
		}

		if (this.settings.lineHighlightMode === 'left') {
			this.showLineCue(editorView);
		} else if (this.settings.lineHighlightMode === 'centered') {
			this.showCursorCenteredCue(editorView);
		}

		// Always set cueFlashActive as a cooldown guard to prevent
		// double-triggering (e.g. scroll → showCue → layout shift → scroll)
		this.cueFlashActive = true;
		if (this.resetCueTimeout) {
			clearTimeout(this.resetCueTimeout);
		}

		// Only dispatch when blockCursorMode is 'flash' (to toggle the decoration).
		// Allow dispatch during click fence for view-change/layout-change triggers.
		const isViewCueTrigger = this.pendingCueTrigger === 'view-change' || this.pendingCueTrigger === 'layout-change';
		if (this.settings.blockCursorMode === 'flash') {
			if (isViewCueTrigger || !this.clickFenceActive) { editorView.dispatch({}); }
		}

		this.resetCueTimeout = setTimeout(() => {
			this.cueFlashActive = false;
			if (this.settings.blockCursorMode === 'flash') {
				editorView.dispatch({});
			}
		}, this.settings.lineDuration);
	}

	showLineCue(editorView: EditorView) {
		const cursor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
		if (!cursor) return;

		const pos = (cursor as any).posToOffset(cursor.getCursor());
		const coords = editorView.coordsAtPos(pos);
		if (!coords) return;

		const editorElement = editorView.contentDOM;
		const editorRect = editorElement.getBoundingClientRect();
		const lineHeight = editorView.defaultLineHeight;
		const { color, opacity } = this.getCueColor();
		const rgb = this.hexToRgb(color);
		// Calculate highlight distance based on flashSize setting (in character widths)
		const fontSize = parseFloat(getComputedStyle(editorElement).fontSize) || 16;
		const charWidth = fontSize * 0.6; // Approximate character width
		const highlightDistance = this.settings.flashSize * charWidth; // Direct width in pixels
		const highlightPercent = Math.min(100, (highlightDistance / editorRect.width) * 100);

		const lineHighlight = document.createElement('div');
		lineHighlight.className = 'obsidian-cue-line';
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
		animation: cue-line-fade ${this.settings.lineDuration}ms ease-out;
		`;

		document.body.appendChild(lineHighlight);
		setTimeout(() => {
			lineHighlight.remove();
		}, this.settings.lineDuration);
	}

	showCursorCenteredCue(editorView: EditorView) {
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
		const { color, opacity } = this.getCueColor();
		const rgb = this.hexToRgb(color);

		const lineHighlight = document.createElement('div');
		lineHighlight.className = 'obsidian-cue-cursor-line';
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
		animation: cue-line-fade ${this.settings.lineDuration}ms ease-out;
		`;

		document.body.appendChild(lineHighlight);
		setTimeout(() => {
			lineHighlight.remove();
		}, this.settings.lineDuration);
	}

	getCueColor(): { color: string, opacity: number } {
		const isDark = document.body.classList.contains('theme-dark');
		if (this.settings.useThemeColors) {
			let accentColor = getComputedStyle(document.body)
				.getPropertyValue('--interactive-accent').trim();

			// For light theme, use color-mix to create a much lighter version
			if (!isDark && accentColor) {
				// Mix 25% of accent color with 75% white to create a very light tint
				accentColor = `color-mix(in srgb, ${accentColor} 25%, white)`;
				console.log(`Light theme: Using lightened accent color: ${accentColor}`);
			}

			return { color: accentColor || '#6496ff', opacity: 0.8 };
		}
		const color = isDark ? this.settings.cursorColorDark : this.settings.cursorColorLight;
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
		const rgb1 = this.hexToRgb(color1);
		const rgb2 = this.hexToRgb(color2);

		const L1 = this.getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
		const L2 = this.getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);

		const lighter = Math.max(L1, L2);
		const darker = Math.min(L1, L2);

		return (lighter + 0.05) / (darker + 0.05);
	}

	getContrastColor(hexColor: string): string {
		const whiteContrast = this.getContrastRatio(hexColor, '#ffffff');
		const blackContrast = this.getContrastRatio(hexColor, '#000000');
		console.log(`Cursor color ${hexColor}: white=${whiteContrast.toFixed(2)}, black=${blackContrast.toFixed(2)}, choosing ${whiteContrast > blackContrast ? 'WHITE' : 'BLACK'}`);
		return whiteContrast > blackContrast ? '#ffffff' : '#000000';
	}

	private updateCursorStyles(markerColor: string, contrastColor: string): void {
		console.log(`updateCursorStyles called: bg=${markerColor}, fg=${contrastColor}`);
		if (this.styleElement) {
			this.styleElement.remove();
		}
		
		this.styleElement = document.createElement('style');
		this.styleElement.id = 'cursor-cues-dynamic-styles';
		
		let styleContent = `
			.cursor-cues-block-mark {
				background-color: ${markerColor} !important;
				color: ${contrastColor} !important;
			}
		`;
		
		if (this.settings.blockCursorStyle === 'thick-vertical') {
			styleContent += `
			.cursor-cues-thick-vertical {
				background: linear-gradient(to right,
					${markerColor} 0%,
					${markerColor} 35%,
					transparent 35%
				) !important;
				color: ${contrastColor} !important;
			}
			`;
		}
		
		this.styleElement.textContent = styleContent;
		document.head.appendChild(this.styleElement);
		console.log(`Dynamic CSS injected for cursor`);
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

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload() {
		if (this.cueTimeout) {
			if (this.styleElement) {
				this.styleElement.remove();
			}
			clearTimeout(this.cueTimeout);
		}
		if (this.resetCueTimeout) {
			clearTimeout(this.resetCueTimeout);
		}
		if (this.scrollDebounceTimer) {
			clearTimeout(this.scrollDebounceTimer);
		}
	}
}
