import { App, PluginSettingTab, Setting } from 'obsidian';

import CursorCuesPlugin from './main';

export interface CursorCuesPluginSettings {
	blockCursorMode: 'always' | 'flash' | 'off';
	blockCursorStyle: 'block' | 'thick-vertical';
	lineHighlightMode: 'left' | 'centered' | 'right' | 'off';
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
	blockCursorStyle: 'block',
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
			.setName('Custom Cursor')
			.setDesc('When to show a custom cursor')
			.addDropdown(dropdown => dropdown
				.addOption('always', 'Always on')
				.addOption('flash', 'Only during flash')
				.addOption('off', 'Off (use Obsidian default cursor)')
				.setValue(this.plugin.settings.blockCursorMode)
				.onChange(async (value: 'always' | 'flash' | 'off') => {
					this.plugin.settings.blockCursorMode = value;
					await this.plugin.saveSettings();
					this.display();
				}));
	
		new Setting(containerEl)
			.setName('Custom Cursor Style')
			.setDesc('Visual style of the custom cursor')
			.addDropdown(dropdown => dropdown
				.addOption('block', 'Block')
				.addOption('thick-vertical', 'Thick vertical')
				.setValue(this.plugin.settings.blockCursorStyle)
				.onChange(async (value: 'block' | 'thick-vertical') => {
					this.plugin.settings.blockCursorStyle = value;
					await this.plugin.saveSettings();
					this.display();
				}));
	
		// ===========================================
		// CURSOR MOVE FLASH
		// ===========================================
		new Setting(containerEl)
			.setName('Cursor Move Flash')
			.setHeading();

		new Setting(containerEl)
			.setName('Flash')
			.setDesc('Show a gradient highlight on the current line during a flash')
			.addDropdown(dropdown => dropdown
				.addOption('off', 'Off')
				.addOption('centered', 'Centered around cursor')
				.addOption('left', 'Left to Right')
				.addOption('right', 'Right to Left')
				.setValue(this.plugin.settings.lineHighlightMode)
				.onChange(async (value: 'left' | 'centered' | 'right' | 'off') => {
					this.plugin.settings.lineHighlightMode = value;
					await this.plugin.saveSettings();
					this.display();
				}));

		const fadeDurationSetting = new Setting(containerEl)
			.setName('Fade duration')
			.setDesc(`How long the flash takes to fade out (0.2s - 1.5s) - ${(this.plugin.settings.lineDuration / 1000).toFixed(2)}s`)
			.addSlider(slider => slider
				.setLimits(0.2, 1.5, 0.05)
				.setValue(this.plugin.settings.lineDuration / 1000)
				.setDynamicTooltip()
				.onChange(async (value: number) => {
					this.plugin.settings.lineDuration = Math.round(value * 1000);
					this.plugin.settings.cursorDuration = Math.round(value * 1000);
					fadeDurationSetting.setDesc(`How long the flash takes to fade out (0.2s - 1.5s) - ${value.toFixed(2)}s`);
					await this.plugin.saveSettings();
				}));

		const flashSizeSetting = new Setting(containerEl)
			.setName('Flash size')
			.setDesc(`Width of the flash (4-15 characters) - ${this.plugin.settings.flashSize}ch`)
			.addSlider(slider => slider
				.setLimits(4, 15, 1)
				.setValue(this.plugin.settings.flashSize)
				.setDynamicTooltip()
				.onChange(async (value: number) => {
					this.plugin.settings.flashSize = value;
					flashSizeSetting.setDesc(`Width of the flash (4-15 characters) - ${value}ch`);
					await this.plugin.saveSettings();
				}));

		// ===========================================
		// FLASH TRIGGERS
		// ===========================================
		new Setting(containerEl)
			.setName('Flash Triggers')
			.setHeading();

		new Setting(containerEl)
			.setName('On scroll')
			.setDesc('Show flash when the view scrolls')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.flashOnWindowScrolls)
				.onChange(async (value) => {
					this.plugin.settings.flashOnWindowScrolls = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('On file switch')
			.setDesc('Show flash when switching between notes or panes')
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
			.setDesc('Based on your Obsidian theme\'s accent color')
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
				.setDesc('Color for light theme')
				.addColorPicker(colorPicker => colorPicker
					.setValue(this.plugin.settings.cursorColorLight)
					.onChange(async (value) => {
						this.plugin.settings.cursorColorLight = value;
						await this.plugin.saveSettings();
						this.plugin.refreshDecorations();
					}));
	
			new Setting(containerEl)
				.setName('Dark theme color')
				.setDesc('Color for dark theme')
				.addColorPicker(colorPicker => colorPicker
					.setValue(this.plugin.settings.cursorColorDark)
					.onChange(async (value) => {
						this.plugin.settings.cursorColorDark = value;
						await this.plugin.saveSettings();
						this.plugin.refreshDecorations();
					}));
		}
	}
}
