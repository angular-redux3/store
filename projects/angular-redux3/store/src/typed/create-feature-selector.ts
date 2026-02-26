/**
 * Feature Selector utility for @angular-redux3/store.
 *
 * Provides type-safe feature selectors for accessing top-level state slices,
 * and a createFeatureSelector pattern familiar to NgRx users.
 */

/**
 * Creates a type-safe selector for a top-level feature key in the state.
 *
 * @example
 * ```typescript
 * interface AppState {
 *   auth: AuthState;
 *   todos: TodoState;
 *   ui: UIState;
 * }
 *
 * const selectAuth = createFeatureSelector<AppState, 'auth'>('auth');
 * const selectTodos = createFeatureSelector<AppState, 'todos'>('todos');
 *
 * // Compose with createSelector:
 * const selectIsLoggedIn = createSelector(
 *   selectAuth,
 *   auth => auth.isLoggedIn
 * );
 *
 * // Usage with store.select():
 * const auth$ = store.select(selectAuth);
 * const isLoggedIn$ = store.select(selectIsLoggedIn);
 * ```
 *
 * @template State The root state type.
 * @template Key The feature key (must be a key of State).
 * @param featureKey The name of the feature in the root state.
 * @returns A selector function that extracts the feature slice.
 */
export function createFeatureSelector<State, Key extends keyof State & string>(
    featureKey: Key
): (state: State) => State[Key] {
    const selector = (state: State): State[Key] => {
        if (state === null || state === undefined) {
            return undefined as any;
        }
        return state[featureKey];
    };

    // Attach metadata for debugging
    Object.defineProperty(selector, 'name', { value: `selectFeature(${featureKey})` });
    (selector as any).__featureKey = featureKey;

    return selector;
}

/**
 * Creates a type-safe selector for a nested property within a feature slice.
 *
 * @example
 * ```typescript
 * const selectAuth = createFeatureSelector<AppState, 'auth'>('auth');
 * const selectToken = createFeaturePropertySelector(selectAuth, 'token');
 *
 * // selectToken(state) => state.auth.token
 * ```
 *
 * @template State The root state type.
 * @template FeatureState The feature state type.
 * @template Key The property key within the feature state.
 * @param featureSelector The parent feature selector.
 * @param property The property name within the feature state.
 * @returns A selector function that extracts the property from the feature slice.
 */
export function createFeaturePropertySelector<FeatureState, Key extends keyof FeatureState & string>(
    featureSelector: (state: any) => FeatureState,
    property: Key
): (state: any) => FeatureState[Key] {
    return (state: any): FeatureState[Key] => {
        const feature = featureSelector(state);
        if (feature === null || feature === undefined) {
            return undefined as any;
        }
        return feature[property];
    };
}
