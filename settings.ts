import { App, PluginSettingTab, Setting } from 'obsidian';

import CursorCuesPlugin from './main';

export interface CursorCuesPluginSettings {
	blockCursorMode: 'always' | 'flash' | 'off';
	lineHighlightMode: 'left' | 'centered' | 'off';
	cursorColorLight: string;
	cursorColorDark: string;
	lineDuration: number;
	cursorDuration: number;
	useThemeColors: boolean;
	flashOnWindowScrolls: boolean;
	flashOnWindowChanges: boolean;
	flashSize: number;
}

export const DEFAULT_SETTINGS: CursorCuesPluginSettings = {
	blockCursorMode: 'always',
	lineHighlightMode: 'centered',
	cursorColorLight: '#6496ff',
	cursorColorDark: '#6496ff',
	lineDuration: 500,
	cursorDuration: 500,
	useThemeColors: true,
	flashOnWindowScrolls: true,
	flashOnWindowChanges: true,
	flashSize: 8
}

export class CursorCuesSettingTab extends PluginSettingTab {
	plugin: CursorCuesPlugin;

	constructor(app: App, plugin: CursorCuesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		// ===========================================
		// CURSOR
		// ===========================================
		new Setting(containerEl)
			.setName('Cursor')
			.setHeading();

		new Setting(containerEl)
			.setName('Block cursor')
			.setDesc('Show a colored block around the character at the cursor position')
			.addDropdown(dropdown => dropdown
				.addOption('always', 'Always on')
				.addOption('flash', 'Only during cue flash')
				.addOption('off', 'Off')
				.setValue(this.plugin.settings.blockCursorMode)
				.onChange(async (value: 'always' | 'flash' | 'off') => {
					this.plugin.settings.blockCursorMode = value;
					await this.plugin.saveSettings();
					this.display();
				}));

		// ===========================================
		// LINE HIGHLIGHT
		// ===========================================
		new Setting(containerEl)
			.setName('Line Highlight')
			.setHeading();

		new Setting(containerEl)
			.setName('Position')
			.setDesc('Show a gradient highlight on the current line during a cue')
			.addDropdown(dropdown => dropdown
				.addOption('off', 'Off')
				.addOption('left', 'Left-aligned')
				.addOption('centered', 'Centered around cursor')
				.setValue(this.plugin.settings.lineHighlightMode)
				.onChange(async (value: 'left' | 'centered' | 'off') => {
					this.plugin.settings.lineHighlightMode = value;
					await this.plugin.saveSettings();
					this.display();
				}));

		const fadeDurationSetting = new Setting(containerEl)
			.setName('Fade duration')
			.setDesc(`How long the line highlight takes to fade out (0.25s - 1.5s) - ${(this.plugin.settings.lineDuration / 1000).toFixed(2)}s`)
			.addSlider(slider => slider
				.setLimits(0.25, 1.5, 0.05)
				.setValue(this.plugin.settings.lineDuration / 1000)
				.setDynamicTooltip()
				.onChange(async (value: number) => {
					this.plugin.settings.lineDuration = Math.round(value * 1000);
					this.plugin.settings.cursorDuration = Math.round(value * 1000);
					fadeDurationSetting.setDesc(`How long the line highlight takes to fade out (0.25s - 1.5s) - ${value.toFixed(2)}s`);
					await this.plugin.saveSettings();
				}));

		const flashSizeSetting = new Setting(containerEl)
			.setName('Flash size')
			.setDesc(`Width of the line highlight flash (4-15 characters) - ${this.plugin.settings.flashSize}ch`)
			.addSlider(slider => slider
				.setLimits(4, 15, 1)
				.setValue(this.plugin.settings.flashSize)
				.setDynamicTooltip()
				.onChange(async (value: number) => {
					this.plugin.settings.flashSize = value;
					flashSizeSetting.setDesc(`Width of the line highlight flash (4-15 characters) - ${value}ch`);
					await this.plugin.saveSettings();
				}));

		// ===========================================
		// MOVEMENT FLASH TRIGGERS
		// ===========================================
		new Setting(containerEl)
			.setName('Movement Flash Triggers')
			.setHeading();

		new Setting(containerEl)
			.setName('On scroll')
			.setDesc('Show cue when the view scrolls')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.flashOnWindowScrolls)
				.onChange(async (value) => {
					this.plugin.settings.flashOnWindowScrolls = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('On file switch')
			.setDesc('Show cue when switching between notes or panes')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.flashOnWindowChanges)
				.onChange(async (value) => {
					this.plugin.settings.flashOnWindowChanges = value;
					await this.plugin.saveSettings();
				}));

		// ===========================================
		// COLORS
		// ===========================================
		new Setting(containerEl)
			.setName('Colors')
			.setHeading();

		new Setting(containerEl)
			.setName('Use theme colors')
			.setDesc('Automatically use your Obsidian theme\'s accent color')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useThemeColors)
				.onChange(async (value) => {
					this.plugin.settings.useThemeColors = value;
					await this.plugin.saveSettings();
					this.display();
				}));

		if (!this.plugin.settings.useThemeColors) {
			new Setting(containerEl)
				.setName('Light theme color')
				.setDesc('Cue color for light theme (hex code)')
				.addText(text => text
					.setPlaceholder('#6496ff')
					.setValue(this.plugin.settings.cursorColorLight)
					.onChange(async (value) => {
						if (/^#[0-9A-F]{6}$/i.test(value)) {
							this.plugin.settings.cursorColorLight = value;
							await this.plugin.saveSettings();
						}
					}));

			new Setting(containerEl)
				.setName('Dark theme color')
				.setDesc('Cue color for dark theme (hex code)')
				.addText(text => text
					.setPlaceholder('#6496ff')
					.setValue(this.plugin.settings.cursorColorDark)
					.onChange(async (value) => {
						if (/^#[0-9A-F]{6}$/i.test(value)) {
							this.plugin.settings.cursorColorDark = value;
							await this.plugin.saveSettings();
						}
					}));
		}
	}
}
