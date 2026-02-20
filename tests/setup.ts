// Mock document globals for tests
if (typeof global !== 'undefined' && !global.document) {
	(global as any).document = {
		body: {
			classList: {
				contains: () => false,
				add: () => {},
				remove: () => {}
			},
			appendChild: () => {},
			removeChild: () => {}
		},
		head: {
			appendChild: () => {},
			removeChild: () => {}
		},
		createElement: (tag: string) => ({
			tagName: tag.toUpperCase(),
			textContent: '',
			style: {
				cssText: ''
			},
			setAttribute: () => {},
			getAttribute: () => null,
			remove: () => {},
			className: '',
			close: () => {},
			open: () => {},
			write: () => {},
			appendChild: () => {},
			removeChild: () => {}
		}),
		getElementById: () => null,
		getComputedStyle: () => ({
			getPropertyValue: () => '#6496ff',
			fontSize: '16px'
		})
	};
}

// Mock window global
if (typeof global !== 'undefined' && !global.window) {
	(global as any).window = {
		addEventListener: () => {},
		removeEventListener: () => {},
		requestAnimationFrame: (callback: (time: number) => void) => {
			setTimeout(() => callback(performance.now()), 0);
		}
	};
}

// Ensure performance object exists
if (typeof global !== 'undefined' && !global.performance) {
	(global as any).performance = {
		now: () => Date.now()
	};
}

export {};
