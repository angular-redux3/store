/**
 * Tests for StoreActionTracker (DevTools metadata).
 */

import { StoreActionTracker } from '../../devtools/devtools-metadata';
import { NgRedux } from '../../services/ng-redux.service';
import { Reducer, AnyAction } from 'redux';
import { NgZone } from '@angular/core';

class MockNgZone extends NgZone {
    override run<T>(fn: (...args: any[]) => T): T {
        return fn() as T;
    }
}

describe('StoreActionTracker', () => {
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
            case 'DECREMENT':
                return { ...state, counter: state.counter - 1 };
            default:
                return state;
        }
    };

    const mockNgZone = new MockNgZone({ enableLongStackTrace: false }) as NgZone;

    let ngRedux: NgRedux<IAppState>;
    let tracker: StoreActionTracker<IAppState>;

    beforeEach(() => {
        ngRedux = new NgRedux<IAppState>(mockNgZone);
        ngRedux.configureStore(rootReducer, defaultState);
        tracker = new StoreActionTracker(ngRedux);
    });

    test('Should start with zero action count.', () => {
        const info = tracker.getInfo();

        expect(info.actionCount).toBe(0);
        expect(info.lastActionType).toBeNull();
    });

    test('Should track dispatched actions after enable.', () => {
        tracker.enable();

        ngRedux.dispatch({ type: 'INCREMENT' });

        const info = tracker.getInfo();

        expect(info.actionCount).toBe(1);
        expect(info.lastActionType).toBe('INCREMENT');
    });

    test('Should track multiple actions.', () => {
        tracker.enable();

        ngRedux.dispatch({ type: 'INCREMENT' });
        ngRedux.dispatch({ type: 'DECREMENT' });
        ngRedux.dispatch({ type: 'INCREMENT' });

        const info = tracker.getInfo();

        expect(info.actionCount).toBe(3);
        expect(info.lastActionType).toBe('INCREMENT');
    });

    test('Should maintain action history.', () => {
        tracker.enable();

        ngRedux.dispatch({ type: 'INCREMENT' });
        ngRedux.dispatch({ type: 'DECREMENT' });

        const info = tracker.getInfo();

        expect(info.actionHistory).toEqual(['INCREMENT', 'DECREMENT']);
    });

    test('Should track state size.', () => {
        tracker.enable();

        ngRedux.dispatch({ type: 'INCREMENT' });

        const info = tracker.getInfo();

        expect(info.stateSize).toBeGreaterThan(0);
    });

    test('Should track dispatch time.', () => {
        tracker.enable();

        const before = Date.now();
        ngRedux.dispatch({ type: 'INCREMENT' });

        const info = tracker.getInfo();

        expect(info.lastDispatchTime).toBeGreaterThanOrEqual(before);
    });

    test('Should reset all tracking info.', () => {
        tracker.enable();

        ngRedux.dispatch({ type: 'INCREMENT' });
        tracker.reset();

        const info = tracker.getInfo();

        expect(info.actionCount).toBe(0);
        expect(info.lastActionType).toBeNull();
        expect(info.actionHistory).toEqual([]);
    });

    test('Should still dispatch correctly when tracking is enabled.', () => {
        tracker.enable();

        ngRedux.dispatch({ type: 'INCREMENT' });
        ngRedux.dispatch({ type: 'INCREMENT' });

        expect(ngRedux.getState().counter).toBe(2);
    });

    test('Should stop tracking after disable.', () => {
        tracker.enable();

        ngRedux.dispatch({ type: 'INCREMENT' });
        tracker.disable();
        ngRedux.dispatch({ type: 'INCREMENT' });

        const info = tracker.getInfo();

        expect(info.actionCount).toBe(1);
    });

    test('Should not double-enable.', () => {
        tracker.enable();
        tracker.enable(); // Should not override

        ngRedux.dispatch({ type: 'INCREMENT' });

        const info = tracker.getInfo();

        expect(info.actionCount).toBe(1);
    });

    test('Should allow dispatch to continue working after disable.', () => {
        tracker.enable();

        ngRedux.dispatch({ type: 'INCREMENT' });
        tracker.disable();

        // Dispatch should still work and modify state correctly
        ngRedux.dispatch({ type: 'INCREMENT' });
        ngRedux.dispatch({ type: 'INCREMENT' });

        expect(ngRedux.getState().counter).toBe(3);

        // Only the first action should have been tracked
        const info = tracker.getInfo();
        expect(info.actionCount).toBe(1);
    });

    test('Should coexist with other dispatch wrappers.', () => {
        // Simulate another wrapper around dispatch
        const originalDispatch = ngRedux.dispatch.bind(ngRedux);
        const otherWrapperActions: string[] = [];
        (ngRedux as any).dispatch = (action: any) => {
            otherWrapperActions.push(action.type);
            return originalDispatch(action);
        };

        tracker.enable();

        ngRedux.dispatch({ type: 'INCREMENT' });

        // Both wrappers should see the action
        expect(otherWrapperActions).toContain('INCREMENT');
        expect(tracker.getInfo().actionCount).toBe(1);

        tracker.disable();

        // Other wrapper should still work
        ngRedux.dispatch({ type: 'DECREMENT' });
        expect(otherWrapperActions).toEqual(['INCREMENT', 'DECREMENT']);
    });
});
