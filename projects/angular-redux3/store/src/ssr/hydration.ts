/**
 * SSR / Hydration support for @angular-redux3/store.
 *
 * Provides utilities for serializing Redux state on the server and
 * rehydrating it on the client, enabling seamless server-side rendering
 * with Angular Universal / Angular SSR.
 */

import {
    InjectionToken,
    makeEnvironmentProviders,
    EnvironmentProviders,
    APP_INITIALIZER,
    PLATFORM_ID,
    TransferState,
    StateKey,
    makeStateKey,
} from '@angular/core';
import { isPlatformServer, isPlatformBrowser } from '@angular/common';
import { Reducer, StoreEnhancer } from 'redux';

import { NgRedux } from '../services/ng-redux.service';
import { DevToolsExtension } from '../services/dev-tool.service';
import { Middleware } from '../interfaces/reducer.interface';

/**
 * The state key used to transfer Redux state between server and client.
 */
const REDUX_STATE_KEY: StateKey<string> = makeStateKey<string>('__REDUX_STATE__');

/**
 * Configuration for SSR/Hydration-enabled NgRedux.
 */
export interface HydrationConfig<RootState> {
    /** The root reducer function. */
    reducer: Reducer<RootState>;
    /** The initial state (used as fallback if no hydrated state is available). */
    initialState: RootState;
    /** Optional middleware. */
    middleware?: Middleware[];
    /** Optional store enhancers. */
    enhancers?: Array<StoreEnhancer<RootState>>;
    /** Optional custom serializer. Default: JSON.stringify */
    serializer?: (state: RootState) => string;
    /** Optional custom deserializer. Default: JSON.parse */
    deserializer?: (raw: string) => RootState;
}

/**
 * Serializes the current Redux store state for transfer to the client.
 * Call this on the server side after rendering.
 *
 * @example
 * ```typescript
 * // In a server-side service or resolver:
 * const serialized = serializeStore(ngRedux);
 * transferState.set(REDUX_STATE_KEY, serialized);
 * ```
 *
 * @param store The NgRedux store instance.
 * @param serializer Optional custom serializer function.
 * @returns Serialized state string.
 */
export function serializeStore<RootState>(
    store: NgRedux<RootState>,
    serializer?: (state: RootState) => string
): string {
    const state = store.getState();
    return serializer ? serializer(state) : JSON.stringify(state);
}

/**
 * Rehydrates a store from a serialized state string.
 *
 * @param serialized The serialized state string.
 * @param fallback Fallback initial state if deserialization fails.
 * @param deserializer Optional custom deserializer function.
 * @returns The rehydrated state.
 */
export function rehydrateState<RootState>(
    serialized: string | null | undefined,
    fallback: RootState,
    deserializer?: (raw: string) => RootState
): RootState {
    if (!serialized) {
        return fallback;
    }

    try {
        return deserializer ? deserializer(serialized) : JSON.parse(serialized);
    } catch {
        return fallback;
    }
}

/**
 * Provides NgRedux with automatic SSR state transfer.
 * On the server, state is serialized into TransferState after store init.
 * On the client, state is rehydrated from TransferState before store init.
 *
 * @example
 * ```typescript
 * // app.config.ts (works for both server & client)
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideNgReduxHydration({
 *       reducer: rootReducer,
 *       initialState: INITIAL_STATE,
 *     }),
 *   ]
 * };
 * ```
 *
 * @param config Hydration configuration.
 * @returns EnvironmentProviders.
 */
export function provideNgReduxHydration<RootState>(
    config: HydrationConfig<RootState>
): EnvironmentProviders {
    return makeEnvironmentProviders([
        NgRedux,
        DevToolsExtension,
        {
            provide: APP_INITIALIZER,
            multi: true,
            useFactory: (
                ngRedux: NgRedux<RootState>,
                platformId: object,
                transferState: TransferState,
            ) => {
                return () => {
                    let initialState = config.initialState;

                    // On the browser, try to rehydrate from TransferState
                    if (isPlatformBrowser(platformId)) {
                        const serialized = transferState.get(REDUX_STATE_KEY, null as any);
                        if (serialized) {
                            initialState = rehydrateState(serialized, config.initialState, config.deserializer);
                            transferState.remove(REDUX_STATE_KEY);
                        }
                    }

                    ngRedux.configureStore(
                        config.reducer,
                        initialState,
                        config.middleware ?? [],
                        config.enhancers ?? []
                    );

                    // On the server, serialize state into TransferState after init
                    if (isPlatformServer(platformId)) {
                        const serialized = serializeStore(ngRedux, config.serializer);
                        transferState.set(REDUX_STATE_KEY, serialized);
                    }
                };
            },
            deps: [NgRedux, PLATFORM_ID, TransferState],
        },
    ]);
}
