import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		globals: true,
		pool: 'vmThreads', // Updated for Vitest 4.0+ compatibility
		setupFiles: ['./tests/setup.ts'],
		include: ['tests/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			include: ['src/**/*.ts', '*.ts'],
			exclude: ['main.ts', 'tests/**']
		}
	}
});
