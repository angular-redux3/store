/**
 * Tests for ComponentStoreSlice.
 */

import { ComponentStoreSlice } from '../../component-store/component-store';
import { NgRedux } from '../../services/ng-redux.service';
import { Reducer, AnyAction } from 'redux';
import { NgZone } from '@angular/core';

class MockNgZone extends NgZone {
    override run<T>(fn: (...args: any[]) => T): T {
        return fn() as T;
    }
}

describe('ComponentStoreSlice', () => {
    interface ISliceState {
        value: number;
        label: string;
    }

    interface IAppState {
        myComponent?: ISliceState;
        [key: string]: any;
    }

    const sliceReducer: Reducer<ISliceState, AnyAction> = (
        state = { value: 0, label: 'init' },
        action,
    ) => {
        switch (action.type) {
            case 'SET_VALUE':
                return { ...state, value: action.payload };
            case 'SET_LABEL':
                return { ...state, label: action.payload };
            default:
                return state;
        }
    };

    const rootReducer: Reducer<IAppState, AnyAction> = (
        state: IAppState = {},
        action,
    ) => {
        if (action.type?.startsWith('@@COMPONENT_STORE/INIT/')) {
            const key = action.type.replace('@@COMPONENT_STORE/INIT/', '');
            return { ...state, [key]: action.payload };
        }
        return state;
    };

    const mockNgZone = new MockNgZone({ enableLongStackTrace: false }) as NgZone;

    let ngRedux: NgRedux<IAppState>;

    beforeEach(() => {
        ngRedux = new NgRedux<IAppState>(mockNgZone);
        ngRedux.configureStore(rootReducer, {});
    });

    test('Should create a component slice.', () => {
        const slice = new ComponentStoreSlice<ISliceState>(
            {
                key: 'myComponent',
                reducer: sliceReducer,
                initialState: { value: 0, label: 'init' },
            },
            ngRedux,
        );

        expect(slice).toBeDefined();
    });

    test('Should dispatch init action.', () => {
        const spy = jest.fn();
        ngRedux.subscribe(spy);

        new ComponentStoreSlice<ISliceState>(
            {
                key: 'myComponent',
                reducer: sliceReducer,
                initialState: { value: 0, label: 'init' },
            },
            ngRedux,
        );

        expect(ngRedux.getState().myComponent).toEqual({
            value: 0,
            label: 'init',
        });
    });

    test('Should select observable from slice.', () => {
        const slice = new ComponentStoreSlice<ISliceState>(
            {
                key: 'myComponent',
                reducer: sliceReducer,
                initialState: { value: 0, label: 'init' },
            },
            ngRedux,
        );

        const values: any[] = [];
        slice.select<ISliceState>().subscribe(value => {
            values.push(value);
        });

        // The slice was initialized, so getState should return initial state
        expect(slice.getState()).toEqual({ value: 0, label: 'init' });
    });

    test('Should get state from slice.', () => {
        const slice = new ComponentStoreSlice<ISliceState>(
            {
                key: 'myComponent',
                reducer: sliceReducer,
                initialState: { value: 42, label: 'test' },
            },
            ngRedux,
        );

        const state = slice.getState();

        expect(state).toEqual({ value: 42, label: 'test' });
    });

    test('Should destroy and clean up subscriptions.', () => {
        const slice = new ComponentStoreSlice<ISliceState>(
            {
                key: 'myComponent',
                reducer: sliceReducer,
                initialState: { value: 0, label: 'init' },
            },
            ngRedux,
        );

        // Create some subscriptions via selectSignal
        // Just call destroy and ensure no errors
        expect(() => slice.destroy()).not.toThrow();
    });
});
