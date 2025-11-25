import { Plugin, MarkdownView } from 'obsidian';
import { EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet, WidgetType } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { CursorCuesPluginSettings, DEFAULT_SETTINGS, CursorCuesSettingTab } from './settings';

class EndOfLineWidget extends WidgetType {
	constructor(private blockColor: string, private contrastColor: string) {
		super();
	}
	toDOM() {
		const span = document.createElement('span');
		span.textContent = ' ';
		span.style.cssText = `
			background-color: ${this.blockColor};
			color: ${this.contrastColor};
			display: inline-block;
			width: 0.5em;
			pointer-events: none;           /* ← add this */
		`;
		span.setAttribute('aria-hidden', 'true'); /* optional */
		return span;
	}
	
}

export default class CursorCuesPlugin extends Plugin {
	settings: CursorCuesPluginSettings;
	private styleElement: HTMLStyleElement | null = null;

	private lastCursorPosition: number | null = null;
	private lastCursorCoords: { x: number, y: number } | null = null;
	private keyPressStartCoords: { x: number, y: number } | null = null;
	private pendingKeyPressStartCapture: boolean = false;
	private wasJumpKey: boolean = false;

	private lastViewChange: number = 0;
	private cueTimeout: NodeJS.Timeout | null = null;
	private resetCueTimeout: NodeJS.Timeout | null = null;
	private scrollDebounceTimer: NodeJS.Timeout | null = null;
	private lastScrollPosition: number = 0;
	private mouseDownFlag: boolean = false;
	private isKeyHeld: boolean = false;
	private cueFlashActive: boolean = false;
	private decorationView: EditorView | null = null;
	private ambientMuteUntil: number = 0;
	private clickFenceActive: boolean = false;
	private pendingCueTrigger: string | null = null;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new CursorCuesSettingTab(this.app, this));

		const decorationPlugin = this.createCueDecorationPlugin();
		this.registerEditorExtension([
			decorationPlugin,
			this.createDOMEventHandlers(),
			this.createUpdateListener()
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

		window.addEventListener('keydown', (event: KeyboardEvent) => {
			if (this.isLinkNavigationKey(event)) {
				return;
			}
			const isMovementKey = this.isNavigationKey(event);
			const isJumpKey = this.isJumpNavigationKey(event);

			if (isMovementKey && !this.isKeyHeld) {
				console.log('DEBUG: keydown -', event.key);
				this.isKeyHeld = true;
				this.pendingKeyPressStartCapture = true;
				this.wasJumpKey = isJumpKey;
			}
		}, false);

		window.addEventListener('keyup', (event: KeyboardEvent) => {
			if (this.isNavigationKey(event) && this.isKeyHeld) {
				console.log('DEBUG: keyup -', event.key);
				this.handleKeyRelease();
			}
		}, false)
		// Global click fence (max-compat): block cue work during pointer->click and a short tail; also mute ambient cues
		const startFence = () => { this.clickFenceActive = true; };
		const endFenceSoon = () => { setTimeout(() => { this.clickFenceActive = false; }, 400); }; // 400ms tail
		window.addEventListener('pointerdown', startFence, { capture: true });
		window.addEventListener('pointerup', endFenceSoon, { capture: true });
		window.addEventListener('pointercancel', endFenceSoon, { capture: true });
		window.addEventListener('click', () => { 
			endFenceSoon(); 
			this.ambientMuteUntil = Date.now() + 500; // mute ambient cues for 500ms after any click
		}, { capture: true });
;
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
				const blockColor = plugin.getCueColor().color;
				const contrastColor = plugin.getContrastColor(blockColor);
				plugin.updateCursorStyles(blockColor, contrastColor);

				if (pos >= view.state.doc.length) {
					if (view.state.doc.length > 0) {
						const widget = Decoration.widget({
							widget: new EndOfLineWidget(blockColor, contrastColor),
							side: 1
						});
						builder.add(view.state.doc.length, view.state.doc.length, widget);
					}
				} else {
					const char = view.state.doc.sliceString(pos, pos + 1);
					if (char === '\n' || char === '') {
						const widget = Decoration.widget({
							widget: new EndOfLineWidget(blockColor, contrastColor),
							side: 1
						});
						builder.add(pos, pos, widget);
					} else {

						const decoration = Decoration.mark({
							attributes: {
								class: 'cursor-cues-block-mark',
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

	// ✅ helper must be outside the handlers object
	const isEditorLink = (el: Element | null): boolean => {
	if (!el) return false;
	
	// Check element itself and all parents up to 5 levels
	let current: Element | null = el;
	let depth = 0;
	while (current && depth < 5) {
		// Check for link-related classes and attributes
		if (current.matches('a, [data-href], [href]')) return true;
		if (current.classList.contains('internal-link')) return true;
		if (current.classList.contains('external-link')) return true;
		if (current.classList.contains('cm-link')) return true;
		if (current.classList.contains('cm-hmd-internal-link')) return true;
		if (current.classList.contains('cm-url')) return true;
		
		// Check if this element or any parent has link-related data attributes
		if (current.hasAttribute('data-href')) return true;
		
		current = current.parentElement;
		depth++;
	    }
		return false;
	};

	return EditorView.domEventHandlers({
		scroll: (event: Event, view: EditorView) => {
		if (!plugin.settings.flashOnWindowScrolls) return false;

		const currentScrollPos = view.scrollDOM.scrollTop;
		const scrollDelta = Math.abs(currentScrollPos - plugin.lastScrollPosition);
		plugin.lastScrollPosition = currentScrollPos;

		if (plugin.scrollDebounceTimer) {
			clearTimeout(plugin.scrollDebounceTimer);
		}

		const debounceTime = scrollDelta < 5 ? 250 : 150;
		plugin.scrollDebounceTimer = setTimeout(() => {
			plugin.scheduleCue('scroll', false);
			plugin.scrollDebounceTimer = null;
		}, debounceTime);

		return false;
		},

		// ✅ handlers are properties; no const declarations here
		mousedown(event: MouseEvent) {
			const target = event.target as HTMLElement;
			if (isEditorLink(target)) {
				return true; // Return true to let event propagate normally
			}
			plugin.mouseDownFlag = true;
			// Remove the mouse-click cue scheduling entirely - it interferes
			return false;
		},

		mouseup: (event: MouseEvent) => {
		const target = event.target as HTMLElement;
		if (isEditorLink(target)) return false; // don't interfere with real links

		setTimeout(() => {
			plugin.mouseDownFlag = false;
		}, 10);
		return false;
		},
	});
	}


	private handleKeyRelease() {
		if (this.isKeyHeld) {
			if (this.wasJumpKey && this.settings.flashOnCursorJumpKeys) {
				console.log('DEBUG: Triggering cue for jump key');
				this.scheduleCue('key-navigation', false);
			} else if (this.keyPressStartCoords && this.lastCursorCoords && this.settings.flashOnLongSingleMoveRepeats) {
				const dx = this.lastCursorCoords.x - this.keyPressStartCoords.x;
				const dy = this.lastCursorCoords.y - this.keyPressStartCoords.y;
				const pixelDistance = Math.sqrt(dx * dx + dy * dy);
				console.log('DEBUG: Distance calculated', pixelDistance);

				if (pixelDistance > 200) {
					console.log('DEBUG: Triggering cue');
					this.scheduleCue('key-navigation', false);
				}
			}
		}

		this.isKeyHeld = false;
		this.keyPressStartCoords = null;
		this.pendingKeyPressStartCapture = false;
		this.wasJumpKey = false;
	}

	createUpdateListener() {
		const plugin = this;
		return EditorView.updateListener.of((update: ViewUpdate) => {
			if (!update.view.hasFocus) return;

			const currentPos = update.state.selection.main.head;
			const coords = update.view.coordsAtPos(currentPos);
			const currentCoords = coords ? { x: coords.left, y: coords.top } : null;

			if (plugin.pendingKeyPressStartCapture && currentCoords) {
				console.log('DEBUG: Capturing keyPressStartCoords', currentCoords);
				plugin.keyPressStartCoords = currentCoords;
				plugin.pendingKeyPressStartCapture = false;
			}

			if (plugin.lastCursorPosition !== null && currentCoords && plugin.lastCursorCoords) {
				const dx = currentCoords.x - plugin.lastCursorCoords.x;
				const dy = currentCoords.y - plugin.lastCursorCoords.y;
				const pixelDistance = Math.sqrt(dx * dx + dy * dy);

				if (plugin.settings.flashOnLongSingleMoveRepeats &&
					pixelDistance > 200 &&
					!plugin.isKeyHeld &&
					plugin.settings.flashOnMouseClick &&
					!plugin.mouseDownFlag) {
					plugin.scheduleCue('cursor-jump', false);
				}
			}

			plugin.lastCursorPosition = currentPos;
			plugin.lastCursorCoords = currentCoords;
		});
	}

	isNavigationKey(event: KeyboardEvent): boolean {
		const key = event.key;
		const ctrl = event.ctrlKey;
		const alt = event.altKey;

		if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) return true;
		if (['PageUp', 'PageDown', 'Home', 'End'].includes(key)) return true;
		if (['h', 'j', 'k', 'l', 'w', 'b', 'e', 'g', 'G'].includes(key) && !ctrl && !alt) return true;
		if (ctrl && ['n', 'p', 'f', 'b', 'a', 'e', 'd', 'k'].includes(key)) return true;
		if (alt && ['f', 'b'].includes(key)) return true;
		return false;
	}

	isJumpNavigationKey(event: KeyboardEvent): boolean {
		const key = event.key;
		const ctrl = event.ctrlKey;

		if (['Home', 'End'].includes(key)) return true;
		if (ctrl && ['Home', 'End', 'a', 'e'].includes(key)) return true;
		return false;
	}

	private isLinkNavigationKey(event: KeyboardEvent): boolean {
            const key = event.key;
            const ctrl = event.ctrlKey;
            const meta = event.metaKey;
            const alt = event.altKey;
            if (key === 'Enter' && (ctrl || meta || alt)) return true;
            if ((ctrl || meta) && key === 'o') return true;
            return false;
        }
    
    scheduleCue(trigger: string, isMouseClick: boolean) {
		if (isMouseClick) return; // remove mouse-click cues entirely
		if (this.clickFenceActive) return;
		const now = Date.now();
		if ((trigger === 'view-change' || trigger === 'layout-change' || trigger === 'css-change') && now < this.ambientMuteUntil) return;
		if (isMouseClick && !this.settings.flashOnMouseClick) return;
		if (this.cueFlashActive || this.pendingCueTrigger) return;
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

		if (this.settings.lineHighlightMode === 'left') {
			this.showLineCue(editorView);
		} else if (this.settings.lineHighlightMode === 'centered') {
			this.showCursorCenteredCue(editorView);
		}

		if (this.settings.blockCursorMode === 'flash') {
			this.cueFlashActive = true;
			if (this.resetCueTimeout) {
				clearTimeout(this.resetCueTimeout);
			}

			if (!this.clickFenceActive) { editorView.dispatch({}); }
			this.resetCueTimeout = setTimeout(() => {
				this.cueFlashActive = false;
				if (!this.clickFenceActive) { editorView.dispatch({}); }
			}, this.settings.lineDuration);
		}
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
			rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.5}) 25%,
			rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0) 50%,
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
		const fadeOpacity = opacity * 0.5;
		const leftEdge = Math.max(0, cursorPercent - 25);
		const rightEdge = Math.min(100, cursorPercent + 25);

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
			const accentColor = getComputedStyle(document.body)
				.getPropertyValue('--interactive-accent').trim();
			return { color: accentColor || '#6496ff', opacity: 0.4 };
		}
		const color = isDark ? this.settings.lineColorDark : this.settings.lineColorLight;
		return { color, opacity: 0.4 };
	}

	getRelativeLuminance(r: number, g: number, b: number): number {
		const rsRGB = r / 255;
		const gsRGB = g / 255;
		const bsRGB = b / 255;

		const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
		const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
		const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

		return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
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

	private updateCursorStyles(blockColor: string, contrastColor: string): void {
		console.log(`updateCursorStyles called: bg=${blockColor}, fg=${contrastColor}`);
		if (this.styleElement) {
			this.styleElement.remove();
		}
		
		this.styleElement = document.createElement('style');
		this.styleElement.id = 'cursor-cues-dynamic-styles';
		this.styleElement.textContent = `
			.cursor-cues-block-mark {
				background-color: ${blockColor} !important;
				color: ${contrastColor} !important;
			}
		`;
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
