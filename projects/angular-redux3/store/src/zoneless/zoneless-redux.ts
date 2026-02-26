/**
 * Zone-less support for @angular-redux3/store.
 *
 * Enables NgRedux to operate without Zone.js by using Angular's new
 * change detection scheduling APIs (ApplicationRef.tick, markForCheck,
 * ChangeDetectorRef).
 *
 * Note: Since NgRedux v21, the base NgRedux class auto-detects zoneless mode
 * and uses ApplicationRef.tick() automatically. This module provides explicit
 * opt-in for zoneless with additional configuration options and a dedicated
 * provider function.
 */

import {
    ApplicationRef,
    Injectable,
    NgZone,
    Optional,
    Inject,
    makeEnvironmentProviders,
    EnvironmentProviders,
    APP_INITIALIZER,
} from '@angular/core';
import { Reducer, StoreEnhancer } from 'redux';

import {
    NgRedux,
    ChangeDetectionNotifier,
    CHANGE_DETECTION_NOTIFIER,
    ZonelessChangeDetectionNotifier,
    NoopChangeDetectionNotifier,
} from '../services/ng-redux.service';
import { DevToolsExtension } from '../services/dev-tool.service';
import { Middleware } from '../interfaces/reducer.interface';

/**
 * Configuration for zone-less NgRedux.
 */
export interface ZonelessNgReduxConfig<RootState> {
    /** The root reducer function. */
    reducer: Reducer<RootState>;
    /** The initial state of the store. */
    initialState: RootState;
    /** Optional middleware functions. */
    middleware?: Middleware[];
    /** Optional store enhancers. */
    enhancers?: Array<StoreEnhancer<RootState>>;
    /** Whether to enable Redux DevTools extension integration. Default: true in dev mode. */
    devTools?: boolean;
    /**
     * Change detection strategy to use in zone-less mode.
     * - 'tick': calls ApplicationRef.tick() after each dispatch (simple, global).
     * - 'noop': does not trigger change detection (user handles it manually).
     * Default: 'tick'
     */
    changeDetection?: 'tick' | 'noop';
}

/**
 * A zone-less variant of NgRedux that always operates in zoneless mode
 * regardless of whether Zone.js is loaded. This is useful for applications
 * that explicitly opt out of Zone.js-based change detection.
 *
 * Since NgRedux v21, the base NgRedux class auto-detects zoneless mode.
 * Use ZonelessNgRedux only when you need to force zoneless behavior or
 * need the `configureZoneless()` API for explicit CD strategy control.
 *
 * @example
 * ```typescript
 * // app.config.ts
 * import { provideNgReduxZoneless } from '@angular-redux3/store';
 *
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideNgReduxZoneless({
 *       reducer: rootReducer,
 *       initialState: INITIAL_STATE,
 *       changeDetection: 'tick',
 *     }),
 *   ]
 * };
 * ```
 */
@Injectable({
    providedIn: 'root',
})
export class ZonelessNgRedux<RootState = any> extends NgRedux<RootState> {
    constructor(
        @Optional() ngZone?: NgZone,
        @Optional() appRef?: ApplicationRef,
        @Optional() @Inject(CHANGE_DETECTION_NOTIFIER) customNotifier?: ChangeDetectionNotifier,
    ) {
        super(ngZone, appRef, customNotifier);
        // Force zoneless mode regardless of the NgZone type
        this._isZoneless = true;
        // Re-configure notifier with forced zoneless
        if (customNotifier) {
            this._cdNotifier = customNotifier;
        } else if (appRef) {
            this._cdNotifier = new ZonelessChangeDetectionNotifier(appRef);
        } else {
            this._cdNotifier = new NoopChangeDetectionNotifier();
        }
    }

    /**
     * Configure the change detection strategy and optionally provide an ApplicationRef.
     * This is kept for backward compatibility. In most cases, the auto-detection
     * in the constructor is sufficient.
     */
    configureZoneless(appRef: ApplicationRef, strategy: 'tick' | 'noop' = 'tick'): void {
        if (strategy === 'noop') {
            this._cdNotifier = new NoopChangeDetectionNotifier();
        } else {
            this._cdNotifier = new ZonelessChangeDetectionNotifier(appRef);
        }
    }
}

/**
 * Provides a zone-less NgRedux store for applications that do not use Zone.js.
 *
 * Note: Since NgRedux v21, the base NgRedux class auto-detects zoneless mode.
 * Using `provideNgRedux()` is sufficient for most zoneless applications.
 * Use `provideNgReduxZoneless()` when you want explicit control over the
 * CD strategy or want to force zoneless mode even when Zone.js is loaded.
 *
 * @example
 * ```typescript
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideNgReduxZoneless({
 *       reducer: rootReducer,
 *       initialState: INITIAL_STATE,
 *       changeDetection: 'tick',
 *     }),
 *   ]
 * };
 * ```
 *
 * @param config Configuration for the zone-less NgRedux store.
 * @returns EnvironmentProviders
 */
export function provideNgReduxZoneless<RootState>(config: ZonelessNgReduxConfig<RootState>): EnvironmentProviders {
    return makeEnvironmentProviders([
        {
            provide: NgRedux,
            useClass: ZonelessNgRedux,
        },
        DevToolsExtension,
        {
            provide: APP_INITIALIZER,
            multi: true,
            useFactory: (ngRedux: NgRedux<RootState>, appRef: ApplicationRef) => {
                return () => {
                    if (ngRedux instanceof ZonelessNgRedux) {
                        ngRedux.configureZoneless(appRef, config.changeDetection ?? 'tick');
                    }
                    ngRedux.configureStore(
                        config.reducer,
                        config.initialState,
                        config.middleware ?? [],
                        config.enhancers ?? []
                    );
                };
            },
            deps: [NgRedux, ApplicationRef],
        },
    ]);
}
