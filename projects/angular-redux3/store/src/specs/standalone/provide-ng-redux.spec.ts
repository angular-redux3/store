/**
 * Integration tests for the standalone provider API.
 */

import { provideNgRedux, provideNgReduxServices, NgReduxConfig } from '../../standalone/provide-ng-redux';
import { Reducer, AnyAction } from 'redux';

describe('Standalone API (provideNgRedux)', () => {
    interface IAppState {
        counter: number;
    }

    const defaultState: IAppState = { counter: 0 };

    const rootReducer: Reducer<IAppState, AnyAction> = (
        state = defaultState,
        action,
    ) => {
        switch (action.type) {
            case 'INCREMENT':
                return { ...state, counter: state.counter + 1 };
            default:
                return state;
        }
    };

    test('provideNgRedux should return EnvironmentProviders.', () => {
        const providers = provideNgRedux({
            reducer: rootReducer,
            initialState: defaultState,
        });

        expect(providers).toBeDefined();
        // EnvironmentProviders is an opaque type — we verify it doesn't throw
        expect(typeof providers).toBe('object');
    });

    test('provideNgRedux should accept all options.', () => {
        const providers = provideNgRedux({
            reducer: rootReducer,
            initialState: defaultState,
            middleware: [],
            enhancers: [],
            devTools: true,
        });

        expect(providers).toBeDefined();
    });

    test('provideNgReduxServices should return EnvironmentProviders.', () => {
        const providers = provideNgReduxServices();

        expect(providers).toBeDefined();
        expect(typeof providers).toBe('object');
    });
});
