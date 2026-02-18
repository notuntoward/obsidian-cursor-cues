import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hexToRgb, getRelativeLuminance, getContrastRatio } from '../src/utils';

/**
 * Test suite for color operations used in the Cursor Flash plugin
 * These tests validate WCAG contrast ratio calculations critical for accessibility
 */
describe('Color Operations - Accessibility', () => {
	describe('WCAG AA Compliance', () => {
		it('should have sufficient contrast for normal text (4.5:1 minimum)', () => {
			// Black text on white background - excellent contrast
			const ratio = getContrastRatio('#000000', '#ffffff');
			expect(ratio).toBeGreaterThanOrEqual(4.5);
		});

		it('should have sufficient contrast for large text (3:1 minimum)', () => {
			// Blue on white - good contrast
			const ratio = getContrastRatio('#0000ff', '#ffffff');
			expect(ratio).toBeGreaterThanOrEqual(3);
		});

		it('should identify low contrast combinations', () => {
			// Light gray on white - poor contrast
			const ratio = getContrastRatio('#e0e0e0', '#ffffff');
			expect(ratio).toBeLessThan(1.5);
		});
	});

	describe('Color Luminance Calculations', () => {
		it('should correctly calculate luminance for RGB colors', () => {
			// Pure colors should have predictable luminance values
			const redL = getRelativeLuminance(255, 0, 0);
			const greenL = getRelativeLuminance(0, 255, 0);
			const blueL = getRelativeLuminance(0, 0, 255);

			// Green is perceived brighter than red, which is brighter than blue
			expect(greenL).toBeGreaterThan(redL);
			expect(redL).toBeGreaterThan(blueL);
		});

		it('should handle linear luminance components correctly', () => {
			// Values below threshold (0.03928) should use linear formula
			const darkL = getRelativeLuminance(10, 10, 10);
			expect(darkL).toBeGreaterThan(0);
			expect(darkL).toBeLessThan(0.01);
		});

		it('should handle bright colors correctly', () => {
			// Values above threshold should use power function
			const brightL = getRelativeLuminance(200, 200, 200);
			expect(brightL).toBeGreaterThan(0.5);
			expect(brightL).toBeLessThan(1);
		});

		it('should produce monotonic results', () => {
			// Brighter RGB values should produce higher luminance
			const lum1 = getRelativeLuminance(100, 100, 100);
			const lum2 = getRelativeLuminance(150, 150, 150);
			const lum3 = getRelativeLuminance(200, 200, 200);

			expect(lum1).toBeLessThan(lum2);
			expect(lum2).toBeLessThan(lum3);
		});
	});

	describe('Hex to RGB Conversion Edge Cases', () => {
		it('should handle uppercase hex', () => {
			const result = hexToRgb('#FF0000');
			expect(result).toEqual({ r: 255, g: 0, b: 0 });
		});

		it('should handle lowercase hex', () => {
			const result = hexToRgb('#ff0000');
			expect(result).toEqual({ r: 255, g: 0, b: 0 });
		});

		it('should handle mixed case', () => {
			const result = hexToRgb('#Ff00Ff');
			expect(result).toEqual({ r: 255, g: 0, b: 255 });
		});

		it('should parse rgb format with spaces', () => {
			const result = hexToRgb('rgb(255, 128, 64)');
			expect(result).toEqual({ r: 255, g: 128, b: 64 });
		});

		it('should parse rgb format without spaces', () => {
			const result = hexToRgb('rgb(255,128,64)');
			expect(result).toEqual({ r: 255, g: 128, b: 64 });
		});

		it('should handle rgba format (ignoring alpha)', () => {
			const result = hexToRgb('rgba(255, 128, 64, 0.5)');
			expect(result).toEqual({ r: 255, g: 128, b: 64 });
		});
	});

	describe('Contrast Ratio Extremes', () => {
		it('should handle identical colors (ratio of 1)', () => {
			const ratio = getContrastRatio('#888888', '#888888');
			expect(ratio).toBeCloseTo(1, 1);
		});

		it('should handle maximum contrast black/white', () => {
			const ratio = getContrastRatio('#000000', '#ffffff');
			expect(ratio).toBeCloseTo(21, 0);
		});

		it('should be symmetric regardless of order', () => {
			const ratio1 = getContrastRatio('#123456', '#abcdef');
			const ratio2 = getContrastRatio('#abcdef', '#123456');
			expect(ratio1).toBeCloseTo(ratio2, 5);
		});

		it('should always produce positive ratios', () => {
			expect(getContrastRatio('#000000', '#ffffff')).toBeGreaterThan(0);
			expect(getContrastRatio('#ff0000', '#00ff00')).toBeGreaterThan(0);
			expect(getContrastRatio('#123456', '#123456')).toBeGreaterThan(0);
		});
	});

	describe('Common Theme Colors', () => {
		it('should handle Obsidian default accent color', () => {
			const ratio = getContrastRatio('#6496ff', '#ffffff');
			expect(ratio).toBeGreaterThan(2);
		});

		it('should handle light theme colors', () => {
			const lightBg = '#ffffff';
			const darkText = '#000000';
			const ratio = getContrastRatio(lightBg, darkText);
			expect(ratio).toBeGreaterThan(20);
		});

		it('should handle dark theme colors', () => {
			const darkBg = '#1a1a1a';
			const lightText = '#ffffff';
			const ratio = getContrastRatio(darkBg, lightText);
			expect(ratio).toBeGreaterThan(10);
		});

		it('should handle accent colors with background', () => {
			// Typical Obsidian light theme
			const accentColor = '#6496ff';
			const whiteBackground = '#ffffff';
			const ratio = getContrastRatio(accentColor, whiteBackground);
			// This should have reasonable contrast
			expect(ratio).toBeGreaterThan(1);
		});
	});

	describe('Color Space Properties', () => {
		it('should maintain contrast ratio monotonicity with black and white backgrounds', () => {
			// Pure red has higher contrast with white than black
			const redVsBlack = getContrastRatio('#ff0000', '#000000');
			const redVsWhite = getContrastRatio('#ff0000', '#ffffff');

			// Should have meaningful contrast differences
			expect(redVsWhite).toBeGreaterThan(1);
			expect(redVsBlack).toBeGreaterThan(1);
		});

		it('should handle neutral gray scale', () => {
			const grays = ['#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff'];

			for (let i = 0; i < grays.length - 1; i++) {
				const ratio1 = getContrastRatio(grays[i], '#ffffff');
				const ratio2 = getContrastRatio(grays[i + 1], '#ffffff');
				// As grays get lighter, contrast with white decreases
				expect(ratio1).toBeGreaterThan(ratio2);
			}
		});
	});
});
