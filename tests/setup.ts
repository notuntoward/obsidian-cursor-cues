import { vi, beforeAll, afterEach, afterAll } from 'vitest';

// Mock Node.js globals used in the plugin
const originalSetTimeout = global.setTimeout;
const originalClearTimeout = global.clearTimeout;

(global as any).setTimeout = vi.fn((callback: Function, delay?: number) => {
	return originalSetTimeout(callback, delay ?? 0);
});

(global as any).clearTimeout = vi.fn((id: number) => {
	originalClearTimeout(id);
});

// Mock requestAnimationFrame
(global as any).requestAnimationFrame = vi.fn((callback: (time: number) => void) => {
	return originalSetTimeout(() => callback(performance.now()), 0);
});

// Mock getComputedStyle for DOM environment
const mockComputedStyle = vi.fn(() => ({
	getPropertyValue: vi.fn(() => '#6496ff'),
	fontSize: '16px'
}));

// Mock document and window globals
const mockDocument = {
	body: {
		classList: {
			contains: vi.fn(() => false),
			add: vi.fn(),
			remove: vi.fn()
		},
		appendChild: vi.fn(),
		removeChild: vi.fn()
	},
	head: {
		appendChild: vi.fn(),
		removeChild: vi.fn()
	},
	createElement: vi.fn((tag: string) => ({
		tagName: tag.toUpperCase(),
		textContent: '',
		style: {
			cssText: ''
		},
		setAttribute: vi.fn(),
		getAttribute: vi.fn(() => null),
		remove: vi.fn(),
		className: '',
		close: vi.fn(),
		open: vi.fn(),
		write: vi.fn(),
		appendChild: vi.fn(),
		removeChild: vi.fn()
	})),
	getElementById: vi.fn(() => null),
	getComputedStyle: mockComputedStyle
};

const mockWindow = {
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
	requestAnimationFrame: (global as any).requestAnimationFrame
};

// Assign mocks to global
Object.defineProperty(global, 'document', {
	value: mockDocument,
	writable: true
});

Object.defineProperty(global, 'window', {
	value: mockWindow,
	writable: true
});

// Mock performance.now()
if (!global.performance) {
	(global as any).performance = {
		now: vi.fn(() => Date.now())
	};
}

beforeAll(() => {
	// Reset mocks between test files
	vi.clearAllMocks();
});

afterEach(() => {
	vi.clearAllMocks();
});

afterAll(() => {
	vi.resetAllMocks();
});
