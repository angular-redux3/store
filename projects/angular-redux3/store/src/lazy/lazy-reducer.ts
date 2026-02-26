/**
 * Lazy Reducer Loading for @angular-redux3/store.
 *
 * Provides utilities for dynamically loading and registering reducers
 * at runtime, enabling code splitting for large applications.
 */

import { Reducer, AnyAction, combineReducers } from 'redux';
import { NgRedux } from '../services/ng-redux.service';
import { ReducerService } from '../services/reducer.service';

/**
 * Registry that tracks dynamically loaded reducer slices.
 */
export class ReducerRegistry {
    private static _instance: ReducerRegistry;
    private reducerMap: { [key: string]: Reducer } = {};
    private baseReducer: Reducer | null = null;
    private listeners: Array<() => void> = [];

    static getInstance(): ReducerRegistry {
        if (!ReducerRegistry._instance) {
            ReducerRegistry._instance = new ReducerRegistry();
        }
        return ReducerRegistry._instance;
    }

    /**
     * Resets the singleton instance. Useful for testing.
     */
    static reset(): void {
        ReducerRegistry._instance = undefined as any;
    }

    /**
     * Sets the base/initial reducer that always applies.
     */
    setBaseReducer(reducer: Reducer): void {
        this.baseReducer = reducer;
    }

    /**
     * Registers a new reducer under a given key.
     * If a reducer for this key already exists, it is replaced.
     *
     * @param key The state key for this reducer slice.
     * @param reducer The reducer function.
     */
    register(key: string, reducer: Reducer): void {
        this.reducerMap[key] = reducer;
        this.notifyListeners();
    }

    /**
     * Unregisters a reducer by key.
     *
     * @param key The state key to remove.
     */
    unregister(key: string): void {
        if (this.reducerMap[key]) {
            delete this.reducerMap[key];
            this.notifyListeners();
        }
    }

    /**
     * Returns the combined reducer including all registered slices.
     */
    getCombinedReducer(): Reducer {
        const reducers = { ...this.reducerMap };

        if (Object.keys(reducers).length === 0 && this.baseReducer) {
            return this.baseReducer;
        }

        if (this.baseReducer) {
            // Wrap base reducer to merge with dynamic slices
            const base = this.baseReducer;
            const dynamicReducer = Object.keys(reducers).length > 0
                ? combineReducers(reducers)
                : null;

            return (state: any, action: AnyAction) => {
                const baseState = base(state, action);
                if (!dynamicReducer) return baseState;

                const dynamicState = dynamicReducer(
                    Object.keys(reducers).reduce((acc: any, key) => {
                        acc[key] = baseState?.[key];
                        return acc;
                    }, {}),
                    action
                );

                return { ...baseState, ...dynamicState };
            };
        }

        if (Object.keys(reducers).length > 0) {
            return combineReducers(reducers);
        }

        return (state: any = {}) => state;
    }

    /**
     * Returns all registered reducer keys.
     */
    getRegisteredKeys(): string[] {
        return Object.keys(this.reducerMap);
    }

    /**
     * Adds a listener that fires when reducers change.
     */
    onChange(listener: () => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners(): void {
        for (const listener of this.listeners) {
            listener();
        }
    }
}

/**
 * Loads a reducer dynamically and integrates it into the running store.
 * Great for lazy-loaded Angular routes that need their own state slices.
 *
 * @example
 * ```typescript
 * // In a lazy-loaded module/route:
 * @Component({ ... })
 * export class AdminComponent implements OnInit, OnDestroy {
 *   private unloadReducer?: () => void;
 *
 *   constructor(private store: NgRedux<AppState>) {}
 *
 *   ngOnInit() {
 *     this.unloadReducer = loadReducer('admin', adminReducer, this.store);
 *   }
 *
 *   ngOnDestroy() {
 *     this.unloadReducer?.();
 *   }
 * }
 * ```
 *
 * @param key The state key for this reducer slice.
 * @param reducer The reducer function.
 * @param store The NgRedux store instance.
 * @returns A function to unload the reducer.
 */
export function loadReducer<RootState>(
    key: string,
    reducer: Reducer,
    store: NgRedux<RootState>
): () => void {
    const registry = ReducerRegistry.getInstance();
    registry.register(key, reducer);

    // Replace the root reducer with the new combined reducer
    const reducerService = ReducerService.getInstance();
    const combinedReducer = registry.getCombinedReducer();
    reducerService.replaceReducer(combinedReducer);

    // Initialize the new slice state
    store.dispatch({ type: `@@LAZY_REDUCER/INIT/${key}` } as any);

    return () => {
        registry.unregister(key);
        const updatedReducer = registry.getCombinedReducer();
        reducerService.replaceReducer(updatedReducer);
    };
}

/**
 * Configures the store with lazy reducer support.
 * Sets the base reducer and enables dynamic slice registration.
 *
 * @example
 * ```typescript
 * import { configureStoreWithLazyReducers } from '@angular-redux3/store';
 *
 * // In app initialization:
 * configureStoreWithLazyReducers(
 *   ngRedux,
 *   baseRootReducer,
 *   INITIAL_STATE
 * );
 *
 * // Later, in a lazy-loaded module:
 * loadReducer('feature', featureReducer, ngRedux);
 * ```
 *
 * @param store The NgRedux store instance.
 * @param baseReducer The initial root reducer.
 * @param initialState The initial state.
 * @param middleware Optional middleware.
 * @param enhancers Optional enhancers.
 */
export function configureStoreWithLazyReducers<RootState>(
    store: NgRedux<RootState>,
    baseReducer: Reducer<RootState>,
    initialState: RootState,
    middleware: any[] = [],
    enhancers: any[] = []
): void {
    const registry = ReducerRegistry.getInstance();
    registry.setBaseReducer(baseReducer);

    store.configureStore(baseReducer, initialState, middleware, enhancers);

    // Auto-replace reducer when new slices are registered
    registry.onChange(() => {
        const combinedReducer = registry.getCombinedReducer();
        store.replaceReducer(combinedReducer as Reducer<RootState>);
    });
}
