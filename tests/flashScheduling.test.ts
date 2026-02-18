import { describe, it, expect, beforeEach, vi } from 'vitest';
import { shouldAllowFlash, calculateScrollDebounceTime } from '../src/utils';

/**
 * Test suite for flash scheduling and throttling logic
 * These tests validate the debouncing and gating mechanisms
 */
describe('Flash Scheduling Logic', () => {
	describe('shouldAllowFlash - Trigger Types', () => {
		it('should distinguish view change triggers', () => {
			const isViewChange = shouldAllowFlash('view-change', false, false, false);
			const isLayoutChange = shouldAllowFlash('layout-change', false, false, false);
			const isScroll = shouldAllowFlash('scroll', false, false, false);

			expect(isViewChange).toBe(true);
			expect(isLayoutChange).toBe(true);
			expect(isScroll).toBe(true);
		});

		it('should bypass click fence for view-change triggers', () => {
			const viewChangeWithFence = shouldAllowFlash('view-change', true, false, false);
			const scrollWithFence = shouldAllowFlash('scroll', true, false, false);

			// View changes bypass fence (for switching notes)
			expect(viewChangeWithFence).toBe(true);
			// Scroll respects fence (user is interacting with content)
			expect(scrollWithFence).toBe(false);
		});

		it('should bypass click fence for layout-change triggers', () => {
			const layoutChangeWithFence = shouldAllowFlash('layout-change', true, false, false);
			expect(layoutChangeWithFence).toBe(true);
		});
	});

	describe('shouldAllowFlash - State Gates', () => {
		it('should prevent flash cascade when already flashing', () => {
			// While flash is active, prevent new flashes
			expect(shouldAllowFlash('scroll', false, true, false)).toBe(false);
			expect(shouldAllowFlash('scroll', false, true, true)).toBe(false);
		});

		it('should prevent flash cascade with pending triggers', () => {
			// While waiting for flash to start, prevent new triggers
			expect(shouldAllowFlash('scroll', false, false, true)).toBe(false);
			expect(shouldAllowFlash('view-change', false, false, true)).toBe(false);
		});

		it('should check state gates only', () => {
			// State gates (flash active, pending) block all triggers
			expect(shouldAllowFlash('any-trigger', false, true, false)).toBe(false);
			expect(shouldAllowFlash('any-trigger', false, false, true)).toBe(false);
		});
	});

	describe('shouldAllowFlash - Combined Conditions', () => {
		it('should allow flash in clean state', () => {
			// No active flash, no pending, no fence, non-scroll trigger
			expect(shouldAllowFlash('view-change', false, false, false)).toBe(true);
		});

		it('should allow multiple view changes when not throttled', () => {
			// View changes should be allowed even with fence
			const checks = [
				shouldAllowFlash('view-change', true, false, false),
				shouldAllowFlash('layout-change', true, false, false),
				shouldAllowFlash('view-change', false, false, false)
			];

			expect(checks).toEqual([true, true, true]);
		});

		it('should handle transition from fence to scroll', () => {
			// Scroll blocked by fence
			expect(shouldAllowFlash('scroll', true, false, false)).toBe(false);
			// But view change passes through
			expect(shouldAllowFlash('view-change', true, false, false)).toBe(true);
			// After view change triggers flash, new scrolls blocked
			expect(shouldAllowFlash('scroll', false, true, false)).toBe(false);
		});

		it('should prioritize state gates over trigger type', () => {
			// Even view-change triggers are blocked by state gates
			const blocked1 = shouldAllowFlash('view-change', false, true, false);
			const blocked2 = shouldAllowFlash('view-change', false, false, true);

			expect(blocked1).toBe(false);
			expect(blocked2).toBe(false);
		});
	});

	describe('shouldAllowFlash - User Interaction Patterns', () => {
		it('should allow initial scroll', () => {
			// User scrolls in a note
			expect(shouldAllowFlash('scroll', false, false, false)).toBe(true);
		});

		it('should allow view change after scroll flash ends', () => {
			// Simulate: user scrolling triggers flash, then when it's done
			// User switches notes - new view change can trigger
			expect(shouldAllowFlash('view-change', true, false, false)).toBe(true);
		});

		it('should suppress momentum scroll', () => {
			// Simulate: initial scroll triggers flash (flashActive=true)
			// Then momentum scroll comes in while flash is active
			// Should be suppressed to prevent double flash
			expect(shouldAllowFlash('scroll', false, true, false)).toBe(false);
		});

		it('should handle rapid clicking', () => {
			// Rapid clicks set fence, then subsequent scrolls are blocked
			const duringClickFence = shouldAllowFlash('scroll', true, false, false);
			expect(duringClickFence).toBe(false);

			// View change still works (inherent to note switch)
			const viewChangeAllowed = shouldAllowFlash('view-change', true, false, false);
			expect(viewChangeAllowed).toBe(true);
		});
	});

	describe('Scroll Debounce Time Calculation', () => {
		it('should return longer debounce for small movements', () => {
			// User scrolling carefully (small pixel movements)
			const smallMovement = calculateScrollDebounceTime(2);
			expect(smallMovement).toBe(250);
		});

		it('should return shorter debounce for large movements', () => {
			// User scrolling rapidly (large pixel movements)
			const largeMovement = calculateScrollDebounceTime(100);
			expect(largeMovement).toBe(150);
		});

		it('should have clear threshold at 5 pixels', () => {
			expect(calculateScrollDebounceTime(4)).toBe(250);
			expect(calculateScrollDebounceTime(5)).toBe(150);
		});

		it('should provide different debounce times for interaction categories', () => {
			// Fine scrolling (selection adjustment)
			const fine = calculateScrollDebounceTime(1);
			// Momentum scrolling
			const momentum = calculateScrollDebounceTime(50);
			// Page scrolling
			const page = calculateScrollDebounceTime(500);

			// More delayed response for fine movements
			expect(fine).toBeGreaterThan(momentum);
			// All use same debounce since they're >5
			expect(momentum).toBe(page);
		});
	});

	describe('Debounce Time Properties', () => {
		it('should always return valid debounce times', () => {
			const times = [0, 1, 5, 10, 100, 1000].map(calculateScrollDebounceTime);
			times.forEach(time => {
				expect(time).toBeGreaterThan(0);
				expect([150, 250]).toContain(time);
			});
		});

		it('should be deterministic', () => {
			expect(calculateScrollDebounceTime(10)).toBe(calculateScrollDebounceTime(10));
			expect(calculateScrollDebounceTime(3)).toBe(calculateScrollDebounceTime(3));
		});

		it('should handle edge values', () => {
			// Exactly at threshold
			expect(calculateScrollDebounceTime(5)).toBe(150);
			// Just below
			expect(calculateScrollDebounceTime(4.99)).toBe(250);
			// Just above
			expect(calculateScrollDebounceTime(5.01)).toBe(150);
		});
	});

	describe('Real-world Scenarios', () => {
		it('should handle user switching between notes', () => {
			// User in note A, switches to note B
			const steps = [
				shouldAllowFlash('view-change', false, false, false), // Initial switch
				shouldAllowFlash('scroll', false, true, false),        // Pending with active flash
				shouldAllowFlash('scroll', false, false, false),       // After flash ends
			];

			expect(steps[0]).toBe(true); // Allow view change
			expect(steps[1]).toBe(false); // Block scroll while flashing
			expect(steps[2]).toBe(true); // Allow scroll after flash
		});

		it('should handle quick flick scrolling', () => {
			// Simulate flick scroll: initial + momentum
			const initial = shouldAllowFlash('scroll', false, false, false);
			const momentum = shouldAllowFlash('scroll', false, true, false);

			expect(initial).toBe(true);
			expect(momentum).toBe(false); // Suppress momentum
		});

		it('should debounce slow careful scrolling', () => {
			// Small pixel movements → longer debounce
			const debounce1 = calculateScrollDebounceTime(2);
			expect(debounce1).toBe(250);

			// Wait time gives debounce window
			// In real code: setTimeout(() => triggerFlash(), 250)
		});

		it('should handle click drag interaction', () => {
			// User clicks (fence activated) then drags
			const duringDrag = shouldAllowFlash('scroll', true, false, false);
			// Scroll blocked by click fence
			expect(duringDrag).toBe(false);
		});
	});

	describe('Flash State Machine', () => {
		it('should model correct state transitions for scroll trigger', () => {
			// Using 'scroll' trigger which respects all conditions
			
			// Idle state - all clear
			expect(shouldAllowFlash('scroll', false, false, false)).toBe(true);
			
			// Click fence blocks scroll
			expect(shouldAllowFlash('scroll', true, false, false)).toBe(false);
			
			// Active flash blocks interrupt
			expect(shouldAllowFlash('scroll', false, true, false)).toBe(false);
			
			// Pending flash blocks new trigger
			expect(shouldAllowFlash('scroll', false, false, true)).toBe(false);
			
			// Combined states also block
			expect(shouldAllowFlash('scroll', true, true, false)).toBe(false);
			expect(shouldAllowFlash('scroll', true, false, true)).toBe(false);
			expect(shouldAllowFlash('scroll', false, true, true)).toBe(false);
		});

		it('should bypass fence for view-change trigger', () => {
			// View-change triggers bypass fence
			expect(shouldAllowFlash('view-change', true, false, false)).toBe(true);
			
			// But still respect active flash
			expect(shouldAllowFlash('view-change', true, true, false)).toBe(false);
			
			// And pending flash
			expect(shouldAllowFlash('view-change', true, false, true)).toBe(false);
		});
	});
});
