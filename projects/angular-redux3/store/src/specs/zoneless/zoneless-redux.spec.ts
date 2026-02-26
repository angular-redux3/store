/**
 * Tests for zone/zoneless compatibility.
 */

import { ZonelessNgRedux } from '../../zoneless/zoneless-redux';
import {
    NgRedux,
    isZoneless,
    ZoneChangeDetectionNotifier,
    ZonelessChangeDetectionNotifier,
    NoopChangeDetectionNotifier,
    ChangeDetectionNotifier,
    CHANGE_DETECTION_NOTIFIER,
} from '../../services/ng-redux.service';
import { ReducerService } from '../../services/reducer.service';
import { Reducer, AnyAction } from 'redux';
import { ApplicationRef, NgZone } from '@angular/core';

describe('isZoneless()', () => {
    test('should return true when ngZone is undefined', () => {
        expect(isZoneless(undefined)).toBe(true);
    });

    test('should return true when ngZone is null', () => {
        expect(isZoneless(null as any)).toBe(true);
    });

    test('should return true when ngZone is NoopNgZone', () => {
        // Simulate NoopNgZone
        class NoopNgZone {}
        const noop = new NoopNgZone() as any;
        expect(isZoneless(noop)).toBe(true);
    });

    test('should return false for a real NgZone-like object', () => {
        // Simulate a real NgZone (constructor name is "NgZone")
        class NgZone {}
        const zone = new NgZone() as any;
        expect(isZoneless(zone)).toBe(false);
    });
});

describe('ChangeDetectionNotifier implementations', () => {
    test('ZoneChangeDetectionNotifier.notify() should be callable', () => {
        const mockZone = {} as NgZone;
        const notifier = new ZoneChangeDetectionNotifier(mockZone);
        // Zone notifier's notify() is a no-op (zone.run wrapping happens at dispatch level)
        expect(() => notifier.notify()).not.toThrow();
    });

    test('ZonelessChangeDetectionNotifier.notify() should call appRef.tick()', () => {
        const mockAppRef = { tick: jest.fn() } as unknown as ApplicationRef;
        const notifier = new ZonelessChangeDetectionNotifier(mockAppRef);
        notifier.notify();
        expect(mockAppRef.tick).toHaveBeenCalledTimes(1);
    });

    test('NoopChangeDetectionNotifier.notify() should be a no-op', () => {
        const notifier = new NoopChangeDetectionNotifier();
        expect(() => notifier.notify()).not.toThrow();
    });
});

describe('NgRedux — zone/zoneless auto-detection', () => {
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

    beforeEach(() => {
        ReducerService.reset();
    });

    test('should be in zoneless mode when no NgZone is provided', () => {
        const store = new NgRedux<IAppState>(undefined, undefined, undefined);
        store.configureStore(rootReducer, defaultState);

        expect(store['_isZoneless']).toBe(true);
        expect(store['_cdNotifier']).toBeInstanceOf(NoopChangeDetectionNotifier);

        store.dispatch({ type: 'INCREMENT' });
        expect(store.getState().counter).toBe(1);
    });

    test('should be in zoneless mode when NoopNgZone is provided', () => {
        class NoopNgZone {}
        const noopZone = new NoopNgZone() as any as NgZone;
        const mockAppRef = { tick: jest.fn() } as unknown as ApplicationRef;

        ReducerService.reset();
        const store = new NgRedux<IAppState>(noopZone, mockAppRef, undefined);
        store.configureStore(rootReducer, defaultState);

        expect(store['_isZoneless']).toBe(true);
        expect(store['_cdNotifier']).toBeInstanceOf(ZonelessChangeDetectionNotifier);

        store.dispatch({ type: 'INCREMENT' });
        expect(store.getState().counter).toBe(1);
        expect(mockAppRef.tick).toHaveBeenCalled();
    });

    test('should use custom notifier when provided', () => {
        const customNotifier: ChangeDetectionNotifier = { notify: jest.fn() };

        ReducerService.reset();
        const store = new NgRedux<IAppState>(undefined, undefined, customNotifier);
        store.configureStore(rootReducer, defaultState);

        expect(store['_cdNotifier']).toBe(customNotifier);

        store.dispatch({ type: 'INCREMENT' });
        expect(store.getState().counter).toBe(1);
        expect(customNotifier.notify).toHaveBeenCalled();
    });

    test('setNotifier() should override the CD strategy at runtime', () => {
        ReducerService.reset();
        const store = new NgRedux<IAppState>(undefined, undefined, undefined);
        store.configureStore(rootReducer, defaultState);

        const custom: ChangeDetectionNotifier = { notify: jest.fn() };
        store.setNotifier(custom);

        store.dispatch({ type: 'INCREMENT' });
        expect(custom.notify).toHaveBeenCalledTimes(1);
    });

    test('should dispatch correctly without any CD notifier', () => {
        ReducerService.reset();
        const store = new NgRedux<IAppState>(undefined, undefined, undefined);
        store.configureStore(rootReducer, defaultState);

        store.dispatch({ type: 'INCREMENT' });
        store.dispatch({ type: 'INCREMENT' });
        expect(store.getState().counter).toBe(2);
    });
});

describe('ZonelessNgRedux', () => {
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

    let ngRedux: ZonelessNgRedux<IAppState>;

    beforeEach(() => {
        ReducerService.reset();
        ngRedux = new ZonelessNgRedux<IAppState>();
        ngRedux.configureStore(rootReducer, defaultState);
    });

    test('should be in zoneless mode', () => {
        expect(ngRedux['_isZoneless']).toBe(true);
    });

    test('Should dispatch without NgZone.', () => {
        ngRedux.dispatch({ type: 'INCREMENT' });

        expect(ngRedux.getState().counter).toBe(1);
    });

    test('Should call ApplicationRef.tick when strategy is tick.', () => {
        const mockAppRef = { tick: jest.fn() } as unknown as ApplicationRef;
        ngRedux.configureZoneless(mockAppRef, 'tick');

        ngRedux.dispatch({ type: 'INCREMENT' });

        expect(mockAppRef.tick).toHaveBeenCalledTimes(1);
    });

    test('Should NOT call ApplicationRef.tick when strategy is noop.', () => {
        const mockAppRef = { tick: jest.fn() } as unknown as ApplicationRef;
        ngRedux.configureZoneless(mockAppRef, 'noop');

        ngRedux.dispatch({ type: 'INCREMENT' });

        expect(mockAppRef.tick).not.toHaveBeenCalled();
    });

    test('Should work correctly without configureZoneless (no appRef).', () => {
        // No configureZoneless called — should not crash
        ngRedux.dispatch({ type: 'INCREMENT' });

        expect(ngRedux.getState().counter).toBe(1);
    });

    test('Should support select observable.', (done) => {
        ngRedux.select<number>('counter' as any).subscribe(count => {
            expect(count).toBe(0);
            done();
        });
    });

    test('Should emit state changes through select.', () => {
        const values: number[] = [];

        ngRedux.select<number>('counter' as any).subscribe(count => {
            values.push(count);
        });

        ngRedux.dispatch({ type: 'INCREMENT' });
        ngRedux.dispatch({ type: 'INCREMENT' });

        expect(values).toEqual([0, 1, 2]);
    });

    test('should force zoneless even when a real NgZone is provided', () => {
        class RealNgZone { run(fn: () => any) { return fn(); } }
        const zone = new RealNgZone() as any as NgZone;
        const mockAppRef = { tick: jest.fn() } as unknown as ApplicationRef;

        ReducerService.reset();
        const store = new ZonelessNgRedux<IAppState>(zone, mockAppRef);
        store.configureStore(rootReducer, defaultState);

        expect(store['_isZoneless']).toBe(true);
        store.dispatch({ type: 'INCREMENT' });
        expect(mockAppRef.tick).toHaveBeenCalled();
    });
});
