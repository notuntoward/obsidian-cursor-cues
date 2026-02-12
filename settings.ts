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
}

export const DEFAULT_SETTINGS: CursorCuesPluginSettings = {
	blockCursorMode: 'always',
	lineHighlightMode: 'centered',
	cursorColorLight: '#6496ff',
	cursorColorDark: '#6496ff',
	lineDuration: 800,
	cursorDuration: 800,
	useThemeColors: true,
	flashOnWindowScrolls: true,
	flashOnWindowChanges: true
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

		new Setting(containerEl)
			.setName('Fade duration')
			.setDesc('How long the line highlight takes to fade out (milliseconds)')
			.addText(text => text
				.setPlaceholder('800')
				.setValue(this.plugin.settings.lineDuration.toString())
				.onChange(async (value) => {
					const num = parseInt(value);
					if (!isNaN(num) && num > 0 && num <= 5000) {
						this.plugin.settings.lineDuration = num;
						this.plugin.settings.cursorDuration = num;
						await this.plugin.saveSettings();
					}
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
