export type HydrationQueryState = {
  isLoading: boolean;
};

/**
 * A hard refresh starts with an empty React Query cache. Rendering the whole
 * dashboard while first-load queries are still resolving can expose partial
 * data shapes to components that normally mount with warm cache data after
 * client-side navigation.
 *
 * Keep the dashboard shell on a loading screen until every first-load query
 * has either produced data or settled into an error state. Individual
 * sections can then render their normal empty/error UI without crashing the
 * entire route.
 */
export function shouldHoldDashboardHydration(
  states: readonly HydrationQueryState[],
): boolean {
  return states.some((state) => state.isLoading);
}
