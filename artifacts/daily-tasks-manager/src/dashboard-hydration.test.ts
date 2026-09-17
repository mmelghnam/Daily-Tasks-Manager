import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { shouldHoldDashboardHydration } from './dashboard-hydration.ts';

describe('hard-refresh dashboard hydration', () => {
  it('holds the dashboard while any first-load query is still loading', () => {
    assert.equal(
      shouldHoldDashboardHydration([
        { isLoading: false },
        { isLoading: true },
        { isLoading: false },
      ]),
      true,
    );
  });

  it('releases the dashboard only after every first-load query settles', () => {
    assert.equal(
      shouldHoldDashboardHydration([
        { isLoading: false },
        { isLoading: false },
        { isLoading: false },
      ]),
      false,
    );
  });

  it('treats an empty query set as already hydrated', () => {
    assert.equal(shouldHoldDashboardHydration([]), false);
  });
});
