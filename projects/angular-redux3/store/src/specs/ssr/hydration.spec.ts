/**
 * Tests for SSR / Hydration utilities.
 */

import { serializeStore, rehydrateState } from '../../ssr/hydration';
import { NgRedux } from '../../services/ng-redux.service';
import { Reducer, AnyAction } from 'redux';
import { NgZone } from '@angular/core';

class MockNgZone extends NgZone {
    override run<T>(fn: (...args: any[]) => T): T {
        return fn() as T;
    }
}

describe('SSR / Hydration', () => {
    interface IAppState {
        counter: number;
        items: string[];
    }

    const defaultState: IAppState = { counter: 0, items: ['a', 'b'] };

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

    const mockNgZone = new MockNgZone({ enableLongStackTrace: false }) as NgZone;

    describe('serializeStore', () => {
        test('Should serialize the store state to JSON.', () => {
            const ngRedux = new NgRedux<IAppState>(mockNgZone);
            ngRedux.configureStore(rootReducer, defaultState);

            const serialized = serializeStore(ngRedux);

            expect(JSON.parse(serialized)).toEqual(defaultState);
        });

        test('Should use a custom serializer.', () => {
            const ngRedux = new NgRedux<IAppState>(mockNgZone);
            ngRedux.configureStore(rootReducer, defaultState);

            const customSerializer = (state: IAppState) =>
                `CUSTOM:${state.counter}`;

            const serialized = serializeStore(ngRedux, customSerializer);

            expect(serialized).toBe('CUSTOM:0');
        });

        test('Should serialize updated state.', () => {
            const ngRedux = new NgRedux<IAppState>(mockNgZone);
            ngRedux.configureStore(rootReducer, defaultState);
            ngRedux.dispatch({ type: 'INCREMENT' });

            const serialized = serializeStore(ngRedux);

            expect(JSON.parse(serialized).counter).toBe(1);
        });
    });

    describe('rehydrateState', () => {
        test('Should deserialize a JSON string to state.', () => {
            const serialized = JSON.stringify({ counter: 5, items: ['x'] });

            const state = rehydrateState<IAppState>(serialized, defaultState);

            expect(state).toEqual({ counter: 5, items: ['x'] });
        });

        test('Should return fallback on null input.', () => {
            const state = rehydrateState<IAppState>(null, defaultState);

            expect(state).toEqual(defaultState);
        });

        test('Should return fallback on undefined input.', () => {
            const state = rehydrateState<IAppState>(undefined, defaultState);

            expect(state).toEqual(defaultState);
        });

        test('Should return fallback on invalid JSON.', () => {
            const state = rehydrateState<IAppState>('{{invalid', defaultState);

            expect(state).toEqual(defaultState);
        });

        test('Should use a custom deserializer.', () => {
            const customDeserializer = (raw: string): IAppState => ({
                counter: parseInt(raw.split(':')[1], 10),
                items: [],
            });

            const state = rehydrateState<IAppState>('CUSTOM:42', defaultState, customDeserializer);

            expect(state).toEqual({ counter: 42, items: [] });
        });
    });
});
