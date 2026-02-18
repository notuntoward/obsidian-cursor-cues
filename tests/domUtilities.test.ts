import { describe, it, expect } from 'vitest';
import {
	calculateLineHeightFromFontSize,
	calculateCharacterWidth,
	calculateHighlightDistance,
	calculatePercentage
} from '../src/utils';

/**
 * Test suite for DOM measurement utilities
 * These tests validate calculations for visual elements
 */
describe('DOM Measurement Utilities', () => {
	describe('Line Height Calculation', () => {
		it('should calculate typical editor line height', () => {
			// 16px is common editor font size
			const lineHeight = calculateLineHeightFromFontSize(16);
			expect(lineHeight).toBe(24);
		});

		it('should scale properly for different font sizes', () => {
			const sizes = [10, 12, 14, 16, 18, 20, 24, 32];
			sizes.forEach(size => {
				const lineHeight = calculateLineHeightFromFontSize(size);
				expect(lineHeight).toBe(size * 1.5);
			});
		});

		it('should maintain ratio for fractional sizes', () => {
			const lineHeight = calculateLineHeightFromFontSize(15.5);
			expect(lineHeight).toBeCloseTo(23.25, 5);
		});

		it('should handle very small sizes', () => {
			expect(calculateLineHeightFromFontSize(8)).toBe(12);
		});

		it('should handle very large sizes', () => {
			expect(calculateLineHeightFromFontSize(96)).toBe(144);
		});
	});

	describe('Character Width Calculation', () => {
		it('should calculate typical monospace character width', () => {
			// Common approximation: 0.6x font size
			const charWidth = calculateCharacterWidth(16);
			expect(charWidth).toBe(9.6);
		});

		it('should scale for different fonts', () => {
			const sizes = [10, 12, 14, 16, 18, 20];
			sizes.forEach(size => {
				const charWidth = calculateCharacterWidth(size);
				expect(charWidth).toBe(size * 0.6);
			});
		});

		it('should work with fractional sizes', () => {
			const charWidth = calculateCharacterWidth(12.5);
			expect(charWidth).toBe(7.5);
		});

		it('should handle zero and negative gracefully', () => {
			expect(calculateCharacterWidth(0)).toBe(0);
		});
	});

	describe('Highlight Distance Calculation', () => {
		it('should multiply flash size by character width', () => {
			const charWidth = calculateCharacterWidth(16); // 9.6
			const flashSize = 8;
			const distance = calculateHighlightDistance(flashSize, charWidth);
			expect(distance).toBe(76.8);
		});

		it('should scale with flash size preference', () => {
			const charWidth = 10;
			expect(calculateHighlightDistance(4, charWidth)).toBe(40);
			expect(calculateHighlightDistance(8, charWidth)).toBe(80);
			expect(calculateHighlightDistance(15, charWidth)).toBe(150);
		});

		it('should scale with different character widths', () => {
			const flashSize = 10;
			expect(calculateHighlightDistance(flashSize, 5)).toBe(50);
			expect(calculateHighlightDistance(flashSize, 10)).toBe(100);
			expect(calculateHighlightDistance(flashSize, 15)).toBe(150);
		});

		it('should handle edge cases', () => {
			expect(calculateHighlightDistance(0, 10)).toBe(0);
			expect(calculateHighlightDistance(8, 0)).toBe(0);
			expect(calculateHighlightDistance(0, 0)).toBe(0);
		});

		it('should work with real-world settings', () => {
			// Typical: 16px font → 9.6 char width, 8 char flash size
			const fontSize = 16;
			const charWidth = calculateCharacterWidth(fontSize);
			const flashSize = 8;
			const distance = calculateHighlightDistance(flashSize, charWidth);
			
			// Approximately 76.8px
			expect(distance).toBeCloseTo(76.8, 1);
		});
	});

	describe('Percentage Calculation', () => {
		it('should calculate percentage of container', () => {
			expect(calculatePercentage(50, 1000)).toBe(5);
			expect(calculatePercentage(100, 1000)).toBe(10);
			expect(calculatePercentage(500, 1000)).toBe(50);
		});

		it('should cap at 100 percent', () => {
			expect(calculatePercentage(1000, 1000)).toBe(100);
			expect(calculatePercentage(1500, 1000)).toBe(100);
			expect(calculatePercentage(2000, 1000)).toBe(100);
		});

		it('should handle zero container width', () => {
			// Avoid division by zero - should return 100
			expect(calculatePercentage(50, 0)).toBe(100);
		});

		it('should work with typical editor dimensions', () => {
			// Common editor width: 1920px viewport
			expect(calculatePercentage(100, 1920)).toBeCloseTo(5.2, 1);
			expect(calculatePercentage(200, 1920)).toBeCloseTo(10.4, 1);
		});

		it('should work with small containers', () => {
			expect(calculatePercentage(50, 200)).toBe(25);
			expect(calculatePercentage(100, 200)).toBe(50);
			expect(calculatePercentage(200, 200)).toBe(100);
		});

		it('should handle fractional results', () => {
			expect(calculatePercentage(33, 100)).toBe(33);
			expect(calculatePercentage(1, 3)).toBeCloseTo(33.33, 1);
		});
	});

	describe('Integration - Complete Flash Highlight Calculation', () => {
		it('should calculate complete flash highlight dimensions', () => {
			// Simulate typical settings
			const fontSize = 16; // Editor font size
			const charWidth = calculateCharacterWidth(fontSize);
			const flashSize = 8; // User setting: 8 characters
			const editorWidth = 1920; // Typical viewport width

			// Calculate highlight extent
			const highlightDistance = calculateHighlightDistance(flashSize, charWidth);
			const highlightPercent = calculatePercentage(highlightDistance, editorWidth);

			// Should be reasonable (not 100% of width for reasonable settings)
			expect(highlightPercent).toBeGreaterThan(0);
			expect(highlightPercent).toBeLessThan(100);
		});

		it('should handle various editor sizes', () => {
			const editorWidths = [800, 1200, 1600, 1920, 2560];
			const fontSize = 16;
			const charWidth = calculateCharacterWidth(fontSize);
			const flashSize = 8;
			const distance = calculateHighlightDistance(flashSize, charWidth);

			editorWidths.forEach(width => {
				const percent = calculatePercentage(distance, width);
				// All should be valid percentages
				expect(percent).toBeGreaterThanOrEqual(0);
				expect(percent).toBeLessThanOrEqual(100);
			});
		});

		it('should respect flash size settings', () => {
			// Test minimum and maximum flash sizes
			const fontSize = 16;
			const charWidth = calculateCharacterWidth(fontSize);
			const editorWidth = 1000;

			const minDistance = calculateHighlightDistance(4, charWidth);
			const maxDistance = calculateHighlightDistance(15, charWidth);
			const minPercent = calculatePercentage(minDistance, editorWidth);
			const maxPercent = calculatePercentage(maxDistance, editorWidth);

			// Larger flash size should produce larger percentage
			expect(maxPercent).toBeGreaterThan(minPercent);
		});
	});

	describe('Edge Cases and Robustness', () => {
		it('should handle decimal values consistently', () => {
			const values = [12.5, 14.3, 16.7, 18.2];
			values.forEach(size => {
				const lineHeight = calculateLineHeightFromFontSize(size);
				const charWidth = calculateCharacterWidth(size);
				
				// Should maintain ratio
				expect(lineHeight).toBeCloseTo(size * 1.5, 5);
				expect(charWidth).toBeCloseTo(size * 0.6, 5);
			});
		});

		it('should not produce NaN values', () => {
			const values = [0, 1, 10, 100, 1000];
			values.forEach(v => {
				expect(calculateLineHeightFromFontSize(v)).not.toBeNaN();
				expect(calculateCharacterWidth(v)).not.toBeNaN();
				expect(calculateHighlightDistance(v, 10)).not.toBeNaN();
				expect(calculatePercentage(v, 100)).not.toBeNaN();
			});
		});

		it('should maintain type safety with inputs', () => {
			// All functions should accept numbers and return numbers
			const result1 = calculateLineHeightFromFontSize(16);
			const result2 = calculateCharacterWidth(16);
			const result3 = calculateHighlightDistance(8, 10);
			const result4 = calculatePercentage(80, 1000);

			expect(typeof result1).toBe('number');
			expect(typeof result2).toBe('number');
			expect(typeof result3).toBe('number');
			expect(typeof result4).toBe('number');
		});
	});
});
