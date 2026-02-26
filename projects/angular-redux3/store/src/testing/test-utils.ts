/**
 * Test utilities for @angular-redux3/store.
 *
 * Provides TestBed-free helpers for testing components and services
 * that depend on NgRedux, aligned with Angular 21's testing recommendations.
 */

import { Reducer, AnyAction, Store, createStore } from 'redux';
import { NgRedux } from '../services/ng-redux.service';
import { Observable, Subject, ReplaySubject } from 'rxjs';
import { Selector, Comparator } from '../interfaces/store.interface';

/**
 * Configuration for creating a test store.
 */
export interface TestStoreConfig<RootState> {
    /** The root reducer. */
    reducer: Reducer<RootState>;
    /** The initial state. */
    initialState: RootState;
}

/**
 * A lightweight test store that does not require TestBed or NgModule.
 *
 * @example
 * ```typescript
 * describe('MyComponent', () => {
 *   let testStore: TestNgRedux<IAppState>;
 *
 *   beforeEach(() => {
 *     testStore = createTestStore({
 *       reducer: rootReducer,
 *       initialState: { count: 0 },
 *     });
 *   });
 *
 *   it('should react to state changes', () => {
 *     const spy = jest.fn();
 *     testStore.select('count').subscribe(spy);
 *
 *     testStore.dispatch({ type: 'INCREMENT' });
 *
 *     expect(spy).toHaveBeenCalledWith(1);
 *   });
 * });
 * ```
 */
export class TestNgRedux<RootState> extends NgRedux<RootState> {
    private _internalStore: Store<RootState>;

    constructor(reducer: Reducer<RootState>, initialState: RootState) {
        super(undefined, undefined, undefined); // No NgZone/ApplicationRef needed for tests
        this._internalStore = createStore(reducer, initialState as any);
        this.configureStore(reducer, initialState);
    }

    /**
     * Dispatch an action and return the new state for convenience.
     */
    dispatchAndGetState(action: AnyAction): RootState {
        this.dispatch(action);
        return this.getState();
    }

    /**
     * Set the entire state directly (useful for test setup).
     */
    setState(newState: RootState): void {
        this.dispatch({ type: '@@TEST/SET_STATE', payload: newState } as AnyAction);
    }

    /**
     * Get a snapshot of a selected value (synchronous).
     */
    selectSnapshot<T>(selector: Selector<RootState, T>): T {
        let result: T | undefined;
        this.select(selector).subscribe(v => { result = v; }).unsubscribe();
        return result!;
    }
}

/**
 * Creates a TestNgRedux store for use in unit tests without TestBed.
 *
 * @example
 * ```typescript
 * const store = createTestStore({
 *   reducer: counterReducer,
 *   initialState: { count: 0 }
 * });
 *
 * store.dispatch({ type: 'INCREMENT' });
 * expect(store.getState().count).toBe(1);
 * ```
 */
export function createTestStore<RootState>(config: TestStoreConfig<RootState>): TestNgRedux<RootState> {
    return new TestNgRedux(config.reducer, config.initialState);
}

/**
 * Creates a mock selector stub for testing components that use @Select.
 * Returns a Subject that you can push values into.
 *
 * @example
 * ```typescript
 * const stub = createSelectorStub<string>();
 * // In your component, @Select('name') name$: Observable<string>
 * // Replace the selection:
 * stub.next('Test Name');
 * ```
 */
export function createSelectorStub<T>(): Subject<T> {
    return new ReplaySubject<T>(1);
}

/**
 * Wraps an NgRedux store with spy/tracking capabilities for test assertions.
 *
 * @example
 * ```typescript
 * const { store, dispatched } = createSpyStore({
 *   reducer: rootReducer,
 *   initialState: DEFAULT_STATE,
 * });
 *
 * myService.doSomething();
 *
 * expect(dispatched()).toContainEqual({ type: 'EXPECTED_ACTION' });
 * ```
 */
export function createSpyStore<RootState>(config: TestStoreConfig<RootState>): {
    store: TestNgRedux<RootState>;
    dispatched: () => AnyAction[];
    lastAction: () => AnyAction | undefined;
    reset: () => void;
} {
    const store = createTestStore(config);
    const actions: AnyAction[] = [];
    const originalDispatch = store.dispatch.bind(store);

    store.dispatch = ((action: AnyAction) => {
        actions.push(action);
        return originalDispatch(action);
    }) as any;

    return {
        store,
        dispatched: () => [...actions],
        lastAction: () => actions[actions.length - 1],
        reset: () => { actions.length = 0; },
    };
}
