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
	flashOnLongSingleMoveRepeats: boolean;
	flashOnCursorJumpKeys: boolean;
	flashOnMouseClick: boolean;
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
	flashOnWindowChanges: true,
	flashOnLongSingleMoveRepeats: true,
	flashOnCursorJumpKeys: true,
	flashOnMouseClick: false
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
		containerEl.createEl('h2', {text: 'Cursor Cues Settings'});
		containerEl.createEl('p', {text: 'Configure when and how cursor cues appear.'});

		new Setting(containerEl)
			.setName('Block cursor')
			.setDesc('Show block around character at cursor: always visible, only during cue flash, or off')
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

		new Setting(containerEl)
			.setName('Flash line highlight')
			.setDesc('Position of line highlight gradient: left-aligned, centered around cursor, or off')
			.addDropdown(dropdown => dropdown
				.addOption('left', 'Left-aligned')
				.addOption('centered', 'Centered around cursor')
				.addOption('off', 'Off')
				.setValue(this.plugin.settings.lineHighlightMode)
				.onChange(async (value: 'left' | 'centered' | 'off') => {
					this.plugin.settings.lineHighlightMode = value;
					await this.plugin.saveSettings();
					this.display();
				}));

		new Setting(containerEl)
			.setName('Use theme colors')
			.setDesc('Automatically derive cue colors from your Obsidian theme (uses accent color)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useThemeColors)
				.onChange(async (value) => {
					this.plugin.settings.useThemeColors = value;
					await this.plugin.saveSettings();
					this.display();
				}));

		if (!this.plugin.settings.useThemeColors) {
			containerEl.createEl('h3', {text: 'Color Settings'});

			if (this.plugin.settings.lineHighlightMode !== 'off') {
				containerEl.createEl('h4', {text: 'Cursor Highlight Colors'});

				new Setting(containerEl)
					.setName('Light theme cursor color')
					.setDesc('Cursor highlight color for light theme (hex code, default: #6496ff)')
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
					.setName('Dark theme cursor color')
					.setDesc('Cursor highlight color for dark theme (hex code, default: #6496ff)')
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

		containerEl.createEl('h3', {text: 'Animation Settings'});

		if (this.plugin.settings.lineHighlightMode !== 'off') {
			new Setting(containerEl)
				.setName('Line fade duration')
				.setDesc('How long the line highlight takes to fade out in milliseconds (default: 800)')
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
		}

		containerEl.createEl('h3', {text: 'When to show cues'});

		new Setting(containerEl)
			.setName('Flash on window scrolls')
			.setDesc('Show cue when the view scrolls significantly')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.flashOnWindowScrolls)
				.onChange(async (value) => {
					this.plugin.settings.flashOnWindowScrolls = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Flash on window changes')
			.setDesc('Show cue when switching between files or panes')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.flashOnWindowChanges)
				.onChange(async (value) => {
					this.plugin.settings.flashOnWindowChanges = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Flash on long single move repeats')
			.setDesc('Show cue when cursor moves a large pixel distance from held key (>200px)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.flashOnLongSingleMoveRepeats)
				.onChange(async (value) => {
					this.plugin.settings.flashOnLongSingleMoveRepeats = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Flash after cursor jump keys')
			.setDesc('Show cue after jumping to line start/end or note start/end, e.g. with Home/End or Ctrl+Home/End')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.flashOnCursorJumpKeys)
				.onChange(async (value) => {
					this.plugin.settings.flashOnCursorJumpKeys = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Flash on mouse click')
			.setDesc('Show cue when clicking to move cursor')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.flashOnMouseClick)
				.onChange(async (value) => {
					this.plugin.settings.flashOnMouseClick = value;
					await this.plugin.saveSettings();
				}));
	}
}
