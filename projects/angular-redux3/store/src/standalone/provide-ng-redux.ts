/**
 * Standalone API for @angular-redux3/store.
 *
 * Provides Angular 21 standalone component support with `provideNgRedux()`
 * and `provideNgReduxStore()` functions, eliminating the need for NgReduxModule.
 *
 * Works in both zone and zoneless Angular applications. NgRedux auto-detects
 * the zone mode and configures the appropriate change detection strategy.
 */

import { Provider, makeEnvironmentProviders, EnvironmentProviders, NgZone, ApplicationRef, inject, provideAppInitializer } from '@angular/core';
import { Reducer, StoreEnhancer } from 'redux';

import { NgRedux, CHANGE_DETECTION_NOTIFIER, ChangeDetectionNotifier, NoopChangeDetectionNotifier } from '../services/ng-redux.service';
import { DevToolsExtension } from '../services/dev-tool.service';
import { Middleware } from '../interfaces/reducer.interface';

/**
 * Configuration options for provideNgRedux.
 */
export interface NgReduxConfig<RootState> {
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
     * Optional change detection strategy override.
     * - 'auto': Auto-detect zone vs zoneless (default).
     * - 'noop': Never trigger CD from dispatch (user handles it).
     * - ChangeDetectionNotifier: Custom implementation.
     */
    changeDetection?: 'auto' | 'noop' | ChangeDetectionNotifier;
}

/**
 * Provides NgRedux store for standalone Angular applications.
 * Use this in your application config instead of importing NgReduxModule.
 *
 * @example
 * ```typescript
 * // app.config.ts
 * import { ApplicationConfig } from '@angular/core';
 * import { provideNgRedux } from '@angular-redux3/store';
 *
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideNgRedux({
 *       reducer: rootReducer,
 *       initialState: INITIAL_STATE,
 *       middleware: [loggingMiddleware],
 *       devTools: true,
 *     })
 *   ]
 * };
 * ```
 *
 * @template RootState The root state type.
 * @param config The NgRedux configuration object.
 * @returns EnvironmentProviders for Angular's dependency injection.
 */
export function provideNgRedux<RootState>(config: NgReduxConfig<RootState>): EnvironmentProviders {
    const providers: any[] = [
        NgRedux,
        DevToolsExtension,
        provideAppInitializer(() => {
            const ngRedux = inject(NgRedux) as NgRedux<RootState>;

            // Apply custom CD notifier if provided
            if (config.changeDetection === 'noop') {
                ngRedux.setNotifier(new NoopChangeDetectionNotifier());
            } else if (config.changeDetection && config.changeDetection !== 'auto') {
                ngRedux.setNotifier(config.changeDetection as ChangeDetectionNotifier);
            }

            ngRedux.configureStore(
                config.reducer,
                config.initialState,
                config.middleware ?? [],
                config.enhancers ?? []
            );
        }),
    ];

    return makeEnvironmentProviders(providers);
}

/**
 * Provides only the NgRedux service and DevToolsExtension as providers,
 * without initializing the store. Useful when you want to configure the
 * store manually in a component or service.
 *
 * @example
 * ```typescript
 * // app.config.ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideNgReduxServices(),
 *   ]
 * };
 *
 * // app.component.ts
 * export class AppComponent {
 *   constructor(ngRedux: NgRedux<IAppState>) {
 *     ngRedux.configureStore(rootReducer, INITIAL_STATE);
 *   }
 * }
 * ```
 *
 * @returns EnvironmentProviders
 */
export function provideNgReduxServices(): EnvironmentProviders {
    return makeEnvironmentProviders([
        NgRedux,
        DevToolsExtension,
    ]);
}
