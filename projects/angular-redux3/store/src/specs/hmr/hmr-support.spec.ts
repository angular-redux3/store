/**
 * Tests for HMR (Hot Module Replacement) support.
 */

import { saveHmrState, restoreHmrState, hasHmrState, configureStoreWithHmr } from '../../hmr/hmr-support';
import { NgRedux } from '../../services/ng-redux.service';
import { Reducer, AnyAction } from 'redux';
import { NgZone } from '@angular/core';

class MockNgZone extends NgZone {
    override run<T>(fn: (...args: any[]) => T): T {
        return fn() as T;
    }
}

describe('HMR Support', () => {
    interface IAppState {
        counter: number;
        name: string;
    }

    const defaultState: IAppState = { counter: 0, name: 'test' };

    const rootReducer: Reducer<IAppState, AnyAction> = (
        state = defaultState,
        action
    ) => {
        switch (action.type) {
            case 'INCREMENT':
                return { ...state, counter: state.counter + 1 };
            default:
                return state;
        }
    };

    const mockNgZone = new MockNgZone({ enableLongStackTrace: false }) as NgZone;

    beforeEach(() => {
        // Clean up HMR state between tests
        delete (globalThis as any)['__ANGULAR_REDUX_HMR_STATE__'];
    });

    test('Should save store state to globalThis.', () => {
        const ngRedux = new NgRedux<IAppState>(mockNgZone);
        ngRedux.configureStore(rootReducer, defaultState);
        ngRedux.dispatch({ type: 'INCREMENT' });

        saveHmrState(ngRedux);

        expect((globalThis as any)['__ANGULAR_REDUX_HMR_STATE__']).toEqual({
            counter: 1,
            name: 'test',
        });
    });

    test('Should restore saved HMR state.', () => {
        (globalThis as any)['__ANGULAR_REDUX_HMR_STATE__'] = {
            counter: 42,
            name: 'restored',
        };

        const restored = restoreHmrState<IAppState>();

        expect(restored).toEqual({ counter: 42, name: 'restored' });
    });

    test('Should remove HMR state after restoring.', () => {
        (globalThis as any)['__ANGULAR_REDUX_HMR_STATE__'] = {
            counter: 1,
            name: 'x',
        };

        restoreHmrState<IAppState>();

        expect(hasHmrState()).toBe(false);
    });

    test('Should return null when no HMR state exists.', () => {
        const restored = restoreHmrState<IAppState>();

        expect(restored).toBeNull();
    });

    test('hasHmrState should return true when state is saved.', () => {
        (globalThis as any)['__ANGULAR_REDUX_HMR_STATE__'] = { counter: 1, name: 'x' };

        expect(hasHmrState()).toBe(true);
    });

    test('hasHmrState should return false when no state is saved.', () => {
        expect(hasHmrState()).toBe(false);
    });

    test('configureStoreWithHmr should use restored state if available.', () => {
        (globalThis as any)['__ANGULAR_REDUX_HMR_STATE__'] = {
            counter: 99,
            name: 'hmr',
        };

        const ngRedux = new NgRedux<IAppState>(mockNgZone);
        configureStoreWithHmr(ngRedux, rootReducer, defaultState);

        expect(ngRedux.getState()).toEqual({
            counter: 99,
            name: 'hmr',
        });
    });

    test('configureStoreWithHmr should use initial state if no HMR state.', () => {
        const ngRedux = new NgRedux<IAppState>(mockNgZone);
        configureStoreWithHmr(ngRedux, rootReducer, defaultState);

        expect(ngRedux.getState()).toEqual(defaultState);
    });
});
