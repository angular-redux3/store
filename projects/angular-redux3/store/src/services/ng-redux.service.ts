/**
 * Import third-party libraries
 */

import { compose, createStore } from 'redux';
import { Injectable, NgZone, ApplicationRef, InjectionToken, Optional, Inject } from '@angular/core';

/**
 * Import third-party types
 */

import { AnyAction, Reducer, Store, StoreEnhancer, Unsubscribe } from 'redux';

/**
 * angular-redux3
 */

import { ReducerService } from './reducer.service';
import { SubStoreService } from './sub-store.service';
import { AbstractStore } from '../abstract/store.abstract';

/**
 * angular-redux3 types
 */

import { Middleware } from '../interfaces/reducer.interface';
import { PathSelector } from '../interfaces/store.interface';
import {ReplaySubject} from "rxjs";

/**
 * Determines whether the current Angular application is running in zone-less mode.
 * Returns true if NgZone is absent, is NoopNgZone, or Zone.js is not loaded globally.
 */
export function isZoneless(ngZone?: NgZone | null): boolean {
    if (!ngZone) return true;
    // Angular provides NoopNgZone when zone-less. The class name check is the
    // most reliable heuristic because NoopNgZone is not publicly exported.
    if (ngZone.constructor?.name === 'NoopNgZone') return true;
    // Fallback: check if Zone.js global is present
    if (typeof Zone === 'undefined') return true;
    return false;
}

/**
 * Strategy interface for notifying Angular's change detection after store changes.
 * The library ships two built-in strategies (zone / zoneless) but consumers may
 * provide their own via the CHANGE_DETECTION_NOTIFIER token.
 */
export interface ChangeDetectionNotifier {
    /** Called after every dispatch to ensure Angular picks up the state change. */
    notify(): void;
}

/**
 * DI token that allows overriding the change-detection notification strategy.
 * When not provided, NgRedux auto-detects zone vs zoneless and picks the right one.
 */
export const CHANGE_DETECTION_NOTIFIER = new InjectionToken<ChangeDetectionNotifier>(
    'ChangeDetectionNotifier'
);

/**
 * Zone-based notifier: ensures dispatch runs inside NgZone so Zone.js patches
 * trigger change detection automatically.
 */
export class ZoneChangeDetectionNotifier implements ChangeDetectionNotifier {
    constructor(private ngZone: NgZone) {}
    notify(): void {
        // In zone mode, change detection is driven by Zone.js.
        // We only need to enter the zone if we're outside it.
        // The actual zone.run() wrapping is done at dispatch time.
    }
}

/**
 * Zoneless notifier: calls ApplicationRef.tick() to trigger change detection
 * without relying on Zone.js.
 */
export class ZonelessChangeDetectionNotifier implements ChangeDetectionNotifier {
    constructor(private appRef: ApplicationRef) {}
    notify(): void {
        this.appRef.tick();
    }
}

/**
 * Noop notifier: does not trigger any change detection. Useful when the consumer
 * handles change detection entirely on their own (e.g. using OnPush + Signals only).
 */
export class NoopChangeDetectionNotifier implements ChangeDetectionNotifier {
    notify(): void {}
}

/**
 * The NgRedux class is a Redux store implementation that can be used in Angular applications.
 * It extends the AbstractStore class from Redux.
 *
 * @template RootState The root state of the store.
 */

@Injectable({
    providedIn: 'root',
})
export class NgRedux<RootState = any> extends AbstractStore<any> {
    /**
     * The single instance of the `NgRedux` class.
     * @hidden
     */

    protected static instance: NgRedux<any>;

    protected _unsubscribe: Unsubscribe;
    /**
     * Private property that holds the application's store object.
     * The Store is an object that holds the application's state tree.
     * There should only be a single store in a Redux app, as the composition
     * happens on the reducer level.
     *
     * @template RootState The root state of the application's store
     * @template action - the type of actions which may be dispatched by this store
     */

    private _store: Store<RootState, any>;

    /**
     * The change detection notifier used to notify Angular about state changes.
     * Auto-configured based on zone/zoneless detection, but can be overridden.
     * @protected
     */
    protected _cdNotifier: ChangeDetectionNotifier | null = null;

    /**
     * Whether the application is running in zoneless mode.
     * @protected
     */
    protected _isZoneless: boolean = false;

    /**
     * Constructor
     *
     * Accepts optional NgZone and ApplicationRef. Automatically detects zone vs
     * zoneless mode and sets up the appropriate change detection notification strategy.
     *
     * @param ngZone - Angular NgZone (injected automatically, may be NoopNgZone in zoneless apps)
     * @param appRef - Angular ApplicationRef (used for zoneless change detection)
     * @param customNotifier - Optional custom ChangeDetectionNotifier override
     */

    constructor(
        @Optional() private ngZone?: NgZone,
        @Optional() private appRef?: ApplicationRef,
        @Optional() @Inject(CHANGE_DETECTION_NOTIFIER) customNotifier?: ChangeDetectionNotifier,
    ) {
        super();
        NgRedux.instance = this;
        this._isZoneless = isZoneless(ngZone);
        this._configureCdNotifier(customNotifier);
    }

    /**
     * Configure the change detection notifier based on the environment.
     */
    private _configureCdNotifier(customNotifier?: ChangeDetectionNotifier | null): void {
        if (customNotifier) {
            this._cdNotifier = customNotifier;
        } else if (this._isZoneless && this.appRef) {
            this._cdNotifier = new ZonelessChangeDetectionNotifier(this.appRef);
        } else if (!this._isZoneless && this.ngZone) {
            this._cdNotifier = new ZoneChangeDetectionNotifier(this.ngZone);
        } else {
            this._cdNotifier = new NoopChangeDetectionNotifier();
        }
    }

    /**
     * Allows overriding the change detection notification strategy at runtime.
     * Useful for transitioning between zone and zoneless, or for testing.
     *
     * @param notifier The new change detection notifier to use.
     */
    setNotifier(notifier: ChangeDetectionNotifier): void {
        this._cdNotifier = notifier;
    }

    /**
     * A static method that returns the current instance of the NgRedux store.
     * If the instance is not initialized, it throws an error.
     *
     * @static
     * @returns {NgRedux<any>} The current instance of the NgRedux store
     * @throws {Error} If the instance is not initialized
     */

    static get store(): NgRedux<any> {
        if (!this.instance) {
            throw new Error('NgRedux failed: instance not initialize.');
        }

        return this.instance;
    }

    /**
     * Configures the store with the provided reducer, initial state, middleware, and enhancers.
     * `This should only be called once for the lifetime of your app, for
     *  example, in the constructor of your root component.`
     *
     * @example
     * ```typescript
     * export class AppModule {
     *   constructor(ngRedux: NgRedux<IAppState>) {
     *     // Tell @angular-redux3/store about our rootReducer and our initial state.
     *     // It will use this to create a redux store for us and wire up all events.
     *     ngRedux.configureStore(rootReducer, INITIAL_STATE);
     *   }
     * }
     * ```
     *
     * @param {Reducer<RootState>} reducer - The root reducer function of the store.
     * @param {RootState} initState - The initial state of the store.
     * @param {Middleware[]} [middleware=[]] - The middleware functions to be applied to the store.
     * @param {Array<StoreEnhancer<RootState>>} [enhancers=[]] - The store enhancers to be applied to the store.
     * @returns {void}
     * @throws {Error} Throws an error if the store has already been initialized.
     */

    configureStore(
        reducer: Reducer<RootState>,
        initState: RootState,
        middleware: Middleware[] = [],
        enhancers: Array<StoreEnhancer<RootState>> = []
    ): void {
        if (this._store) {
            throw new Error('Store already initialize!');
        }

        const rootReducer = ReducerService.getInstance().composeReducers(reducer, middleware);
        const composeResult: any = compose.apply(null, [ ...enhancers ]);
        const store = composeResult(
            createStore
        )(rootReducer, initState);

        this.setStore(store);
    }

    /**
     * Configures a sub-store with a specified base path and local reducer.
     * Carves off a 'subStore' or 'fractal' store from this one.
     *
     * The returned object is itself an observable store, however, any
     * selections, dispatches, or invocations of localReducer will be
     * specific to that sub-store and will not know about the parent
     * ObservableStore from which it was created.
     *
     * This is handy for encapsulating component or module state while
     * still benefiting from time-travel, etc.
     *
     * @example
     * ```typescript
     *   onInit() {
     *     // The reducer passed here will affect state under `users.${userID}`
     *     // in the top-level store.
     *     this.subStore = this.ngRedux.configureSubStore(
     *       ['users', userId],
     *       userComponentReducer,
     *     );
     *
     *     // Substore selections are scoped to the base path used to configure
     *     // the substore.
     *     this.name$ = this.subStore.select('name');
     *     this.occupation$ = this.subStore.select('occupation');
     *     this.loc$ = this.subStore.select(s => s.loc || 0);
     *   }
     * ```
     *
     * @template SubState The type of the sub-store state.
     * @param {PathSelector} basePath The base path of the sub-store.
     * @param {Reducer<SubState>} localReducer The local reducer of the sub-store.
     * @returns {SubStoreService<SubState>} The sub-store service instance.
     */

    configureSubStore<SubState>(basePath: PathSelector, localReducer: Reducer<SubState>): SubStoreService<SubState> {
        return new SubStoreService<SubState>(this, basePath, localReducer);
    }

    /**
     * Accepts a Redux store, then sets it in NgRedux and allows NgRedux to observe and dispatch to it.
     * This should only be called once for the lifetime of your app, for example, in the constructor of your root component.
     * If configureStore has been used, this cannot be used.
     *
     * @example
     * ```typescript
     * class AppModule {
     *   constructor(ngRedux: NgRedux<IAppState>) {
     *     ngRedux.provideStore(store, rootReducer);
     *   }
     * }
     * ```
     *
     * @param reducer - The new root reducer function to use.
     * @param store - The Redux store instance to be initialized.
     * @returns void
     * @throws Error if the store has already been initialized.
     */

    provideStore(reducer: Reducer<RootState>, store: Store<RootState>): void {
        if (this._store) {
            throw new Error('Store already initialize!');
        }

        const rootReducer = ReducerService.getInstance().composeReducers(reducer);
        store.replaceReducer(rootReducer);
        this.setStore(store);
    }

    /**
     * Get the current state from the store.
     *
     * @example
     * ```typescript
     *   incrementIfOdd(): void {
     *     const { counter } = this.ngRedux.getState();
     *     if (counter % 2 !== 0) {
     *       this.increment();
     *     }
     *   }
     * ```
     *
     * @returns {RootState} The current state of the store.
     */

    getState(): RootState {
        return this._store.getState();
    }

    /**
     * Dispatches an action to the store instance.
     * A `dispatching function` (or simply *dispatch function*) is a function that
     * accepts an actions or an async actions; it then may or may not dispatch one
     * or more actions to the store.
     *
     * We must distinguish between dispatching functions in general and the base
     * `dispatch` function provided by the store instance without any middleware.
     *
     * The base dispatch function *always* synchronously sends an actions to the
     * store's reducer, along with the previous state returned by the store, to
     * calculate a new state. It expects actions to be plain objects ready to be
     * consumed by the reducer.
     *
     * @example
     * ```typescript
     *  class App {
     *    @Select() count$: Observable<number>;
     *
     *    constructor(private ngRedux: NgRedux<IAppState>) {}
     *
     *    onClick() {
     *      this.ngRedux.dispatch({ type: INCREMENT });
     *    }
     *  }
     * ```
     *
     * @template Action - the action object type.
     * @param {Action} action - the action object to be dispatched to the store.
     * @returns {Action} - the dispatched action object.
     * @throws {Error} - if the store instance is not initialized.
     * @description This method dispatches an action object to the store instance. If the store instance is not initialized,
     * it will throw an error. The dispatch method runs in the Angular zone by default to prevent unexpected behavior when
     * dispatching from callbacks to 3rd-party.
     */

    dispatch<Action extends AnyAction>(action: Action): Action {
        if (!this._store) {
            throw new Error('Dispatch failed: store instance not initialize.');
        }

        /**
         * Zone mode: ensures dispatch runs inside Angular zone so that Zone.js
         * patches trigger change detection automatically.
         * Zoneless mode: dispatches directly, then notifies Angular's change
         * detection via ApplicationRef.tick() or custom notifier.
         */
        if (!this._isZoneless && this.ngZone && !NgZone.isInAngularZone()) {
            return this.ngZone.run(() => {
                const result = this._store!.dispatch(action);
                return result;
            });
        }

        const result = this._store.dispatch(action);

        // In zoneless mode, explicitly notify change detection after dispatch
        if (this._isZoneless && this._cdNotifier) {
            this._cdNotifier.notify();
        }

        return result;
    }

    /**
     * Adds a change listener to the store, which will be invoked any time an action is dispatched, and some part of the state tree may potentially have changed.
     *
     * @example
     * ```typescript
     *   constructor(
     *     private ngRedux: NgRedux<IAppState>,
     *     private actions: CounterActions,
     *   ) {
     *     this.subscription = ngRedux
     *       .select<number>('count')
     *       .subscribe(newCount => (this.count = newCount));
     *   }
     *
     *   ngOnDestroy() {
     *     this.subscription.unsubscribe();
     *   }
     * ```
     *
     * @param listener A callback function that will be invoked whenever the state in the store has changed.
     * @returns A function to remove this change listener.
     */

    subscribe(listener: () => void): Unsubscribe {
        return this._store.subscribe(listener);
    }

    /**
     * Replaces the current root reducer function with a new one.
     *
     * @example
     * ```typescript
     * const newRootReducer = combineReducers({
     *   existingSlice: existingSliceReducer,
     *   newSlice: newSliceReducer
     * })
     *
     * ngRedux.replaceReducer(newRootReducer)
     * ```
     *
     * @param {Reducer<RootState>} nextReducer - The new root reducer function to be used.
     * @returns {void}
     */

    replaceReducer(nextReducer: Reducer<RootState>): void {
        ReducerService.getInstance().replaceReducer(nextReducer);
    }

    /**
     * Replace the store instance for this service.
     *
     * @param {Store<RootState>} store - The Redux store instance.
     * @returns {void}
     */

    replaceStore(store: Store<RootState>): void {
        if (this._unsubscribe) {
            this._unsubscribe();
        }
        this.setStore(store);
    }


    /**
     * Sets the store instance for this service.
     *
     * @param {Store<RootState>} store - The Redux store instance.
     * @returns {void}
     */

    protected setStore(store: Store<RootState>): void {
        this._store = store;
        this._store$.next(store.getState());

        this._unsubscribe = store.subscribe(() => {
            this._store$.next(store.getState());
        });
    }
}
