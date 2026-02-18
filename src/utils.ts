/**
 * Utility functions for the Cursor Flash plugin
 * Extracted for testability
 */

/**
 * Convert a hex color string to RGB values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
	if (hex.startsWith('rgb')) {
		const matches = hex.match(/\d+/g);
		if (matches && matches.length >= 3) {
			return {
				r: parseInt(matches[0], 10),
				g: parseInt(matches[1], 10),
				b: parseInt(matches[2], 10)
			};
		}
	}
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16)
		  }
		: { r: 100, g: 150, b: 255 };
}

/**
 * Calculate the relative luminance of a color according to WCAG
 */
export function getRelativeLuminance(r: number, g: number, b: number): number {
	const rsRGB = r / 255;
	const gsRGB = g / 255;
	const bsRGB = b / 255;

	const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
	const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
	const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

	return 0.2126 * rLinear + 0.7150 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculate the contrast ratio between two colors according to WCAG
 */
export function getContrastRatio(color1: string, color2: string): number {
	const rgb1 = hexToRgb(color1);
	const rgb2 = hexToRgb(color2);

	const L1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
	const L2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);

	const lighter = Math.max(L1, L2);
	const darker = Math.min(L1, L2);

	return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get the appropriate contrast color (text or background) for a given hex color
 */
export function getContrastColor(hexColor: string, bgColor: string = '#ffffff', textColor: string = '#000000'): string {
	let bgContrast = 1;
	let textContrast = 1;

	try {
		bgContrast = getContrastRatio(hexColor, bgColor);
	} catch (e) {
		console.error('Error calculating contrast with background:', e);
	}

	try {
		textContrast = getContrastRatio(hexColor, textColor);
	} catch (e) {
		console.error('Error calculating contrast with text:', e);
	}

	// Choose whichever has the highest contrast
	return textContrast > bgContrast ? textColor : bgColor;
}

/**
 * Calculate line height from font size
 */
export function calculateLineHeightFromFontSize(fontSize: number): number {
	return fontSize * 1.5;
}

/**
 * Calculate character width from font size
 */
export function calculateCharacterWidth(fontSize: number): number {
	return fontSize * 0.6;
}

/**
 * Calculate highlight distance based on flash size setting
 */
export function calculateHighlightDistance(flashSize: number, charWidth: number): number {
	return flashSize * charWidth;
}

/**
 * Calculate percentage of container width
 */
export function calculatePercentage(distance: number, containerWidth: number): number {
	return Math.min(100, (distance / containerWidth) * 100);
}

/**
 * Determine if a flash trigger should be allowed based on click fence and view triggers
 */
export function shouldAllowFlash(
	trigger: string,
	isFenceActive: boolean,
	isFlashActive: boolean,
	hasPendingFlash: boolean
): boolean {
	const isViewTrigger = trigger === 'view-change' || trigger === 'layout-change';
	
	// View/layout triggers bypass click fence
	if (!isViewTrigger && isFenceActive) {
		return false;
	}
	
	if (isFlashActive || hasPendingFlash) {
		return false;
	}
	
	return true;
}

/**
 * Determine debounce time based on scroll delta
 */
export function calculateScrollDebounceTime(scrollDelta: number): number {
	return scrollDelta < 5 ? 250 : 150;
}
