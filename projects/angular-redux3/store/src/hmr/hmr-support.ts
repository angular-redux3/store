/**
 * HMR (Hot Module Replacement) support for @angular-redux3/store.
 *
 * Preserves Redux state across hot module replacement cycles during development.
 */

import { NgRedux } from '../services/ng-redux.service';
import { Reducer } from 'redux';

/**
 * The global key used to store Redux state during HMR.
 */
const HMR_STATE_KEY = '__ANGULAR_REDUX_HMR_STATE__';

/**
 * Saves the current Redux state to a global variable for HMR persistence.
 *
 * @example
 * ```typescript
 * // In main.ts:
 * if ((module as any).hot) {
 *   (module as any).hot.dispose(() => {
 *     saveHmrState(ngRedux);
 *   });
 * }
 * ```
 *
 * @param store The NgRedux store instance.
 */
export function saveHmrState<RootState>(store: NgRedux<RootState>): void {
    try {
        const state = store.getState();
        (globalThis as any)[HMR_STATE_KEY] = JSON.parse(JSON.stringify(state));
    } catch {
        // Silently fail if state is not serializable
    }
}

/**
 * Restores Redux state from a previous HMR cycle.
 *
 * @example
 * ```typescript
 * // In main.ts or app constructor:
 * const savedState = restoreHmrState<IAppState>();
 * const initialState = savedState ?? DEFAULT_STATE;
 * ngRedux.configureStore(rootReducer, initialState);
 * ```
 *
 * @returns The saved state, or null if none exists.
 */
export function restoreHmrState<RootState>(): RootState | null {
    const state = (globalThis as any)[HMR_STATE_KEY] ?? null;

    if (state) {
        delete (globalThis as any)[HMR_STATE_KEY];
    }

    return state;
}

/**
 * Checks whether there is a saved HMR state available.
 */
export function hasHmrState(): boolean {
    return !!(globalThis as any)[HMR_STATE_KEY];
}

/**
 * Sets up automatic HMR state persistence.
 * Must be called in the application bootstrap context.
 *
 * @example
 * ```typescript
 * // main.ts
 * import { enableHmr } from '@angular-redux3/store';
 *
 * platformBrowserDynamic().bootstrapModule(AppModule).then(moduleRef => {
 *   enableHmr(moduleRef.injector.get(NgRedux));
 * });
 * ```
 *
 * @param store The NgRedux store instance.
 * @param hmrModule The hot module reference (typically `module`).
 */
export function enableHmr<RootState>(
    store: NgRedux<RootState>,
    hmrModule?: any
): void {
    const mod = hmrModule || (typeof (globalThis as any)['module'] !== 'undefined' ? (globalThis as any)['module'] : undefined);

    if (mod?.hot) {
        mod.hot.dispose(() => {
            saveHmrState(store);
        });
    }
}

/**
 * Configures a store with HMR awareness: restores previous state if available,
 * otherwise uses provided initial state.
 *
 * @example
 * ```typescript
 * configureStoreWithHmr(ngRedux, rootReducer, INITIAL_STATE);
 * ```
 *
 * @param store The NgRedux store instance.
 * @param reducer The root reducer.
 * @param initialState The default initial state.
 * @param middleware Optional middleware array.
 * @param enhancers Optional enhancers array.
 */
export function configureStoreWithHmr<RootState>(
    store: NgRedux<RootState>,
    reducer: Reducer<RootState>,
    initialState: RootState,
    middleware: any[] = [],
    enhancers: any[] = []
): void {
    const restoredState = restoreHmrState<RootState>();
    store.configureStore(
        reducer,
        restoredState ?? initialState,
        middleware,
        enhancers
    );
    enableHmr(store);
}
