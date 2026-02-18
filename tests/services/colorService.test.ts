import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ColorService } from '../../src/services/colorService';

describe('ColorService', () => {
  let colorService: ColorService;

  beforeEach(() => {
    colorService = new ColorService();
  });

  describe('getColor', () => {
    it('should return custom light color when useThemeColors is false and theme is light', () => {
      const settings = {
        customCursorMode: 'always' as const,
        useThemeColors: false,
        customCursorStyle: 'block' as const,
        cursorCustomColorLight: '#1a1a1a',
        cursorCustomColorDark: '#ffffff',
        lineHighlightMode: 'centered' as const,
        lineDuration: 500,
        flashDuration: 500,
        flashOnWindowScrolls: true,
        flashOnWindowChanges: true,
        flashSize: 8,
      };

      const result = colorService.getColor(settings);
      expect(result.opacity).toBe(0.8);
      expect(result.color).toBe('#1a1a1a');
    });

    it('should return custom dark color when useThemeColors is false and theme is dark', () => {
      vi.spyOn(colorService, 'isDarkTheme').mockReturnValue(true);

      const settings = {
        customCursorMode: 'always' as const,
        useThemeColors: false,
        customCursorStyle: 'block' as const,
        cursorCustomColorLight: '#1a1a1a',
        cursorCustomColorDark: '#ffffff',
        lineHighlightMode: 'centered' as const,
        lineDuration: 500,
        flashDuration: 500,
        flashOnWindowScrolls: true,
        flashOnWindowChanges: true,
        flashSize: 8,
      };

      const result = colorService.getColor(settings);
      expect(result.opacity).toBe(0.8);
      expect(result.color).toBe('#ffffff');
    });

    it('should return fallback color when theme accent color not found', () => {
      const settings = {
        customCursorMode: 'always' as const,
        useThemeColors: true,
        customCursorStyle: 'block' as const,
        cursorCustomColorLight: '#1a1a1a',
        cursorCustomColorDark: '#ffffff',
        lineHighlightMode: 'centered' as const,
        lineDuration: 500,
        flashDuration: 500,
        flashOnWindowScrolls: true,
        flashOnWindowChanges: true,
        flashSize: 8,
      };

      // Mock getThemeAccentColor to return empty string
      vi.spyOn(colorService as any, 'getThemeAccentColor').mockReturnValue('');

      const result = colorService.getColor(settings);
      expect(result.color).toBe('#6496ff');
      expect(result.opacity).toBe(0.8);
    });
  });

  // Note: getContrastColor requires DOM integration testing
  // (getComputedStyle, document manipulation)
  // These are tested in colorOperations.test.ts with proper DOM mocking

  describe('isDarkTheme', () => {
    it('should return false when theme-dark class not present', () => {
      expect(colorService.isDarkTheme()).toBe(false);
    });
  });

  describe('resolveColorToRgb', () => {
    it('should parse hex colors', () => {
      const result = colorService.resolveColorToRgb('#ff0000');
      expect(result.r).toBe(255);
      expect(result.g).toBe(0);
      expect(result.b).toBe(0);
    });

    it('should parse rgb strings', () => {
      const result = colorService.resolveColorToRgb('rgb(255, 128, 64)');
      expect(result.r).toBe(255);
      expect(result.g).toBe(128);
      expect(result.b).toBe(64);
    });

    it('should return default for invalid colors', () => {
      const result = colorService.resolveColorToRgb('invalid-color-xyz');
      expect(result.r).toBe(100);
      expect(result.g).toBe(150);
      expect(result.b).toBe(255);
    });
  });
});
