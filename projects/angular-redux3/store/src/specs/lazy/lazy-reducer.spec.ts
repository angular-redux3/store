import { ReducerRegistry, loadReducer, configureStoreWithLazyReducers } from '../../lazy/lazy-reducer';
import { ReducerService } from '../../services/reducer.service';
import { NgRedux } from '../../services/ng-redux.service';
import { AnyAction } from 'redux';

describe('Lazy Reducer Loading', () => {
    let store: NgRedux<any>;

    beforeEach(() => {
        ReducerService.reset();
        ReducerRegistry.reset();
        store = new NgRedux<any>(undefined);
    });

    describe('ReducerRegistry', () => {
        it('should be a singleton', () => {
            const a = ReducerRegistry.getInstance();
            const b = ReducerRegistry.getInstance();
            expect(a).toBe(b);
        });

        it('should reset the singleton', () => {
            const a = ReducerRegistry.getInstance();
            ReducerRegistry.reset();
            const b = ReducerRegistry.getInstance();
            expect(a).not.toBe(b);
        });

        it('should register and track reducer keys', () => {
            const registry = ReducerRegistry.getInstance();
            const reducer = (state: any = {}) => state;

            registry.register('feature1', reducer);
            registry.register('feature2', reducer);

            expect(registry.getRegisteredKeys()).toEqual(['feature1', 'feature2']);
        });

        it('should unregister reducers', () => {
            const registry = ReducerRegistry.getInstance();
            const reducer = (state: any = {}) => state;

            registry.register('feature1', reducer);
            registry.unregister('feature1');

            expect(registry.getRegisteredKeys()).toEqual([]);
        });

        it('should notify listeners on registration', () => {
            const registry = ReducerRegistry.getInstance();
            const listener = jest.fn();
            registry.onChange(listener);

            registry.register('feature', (state: any = {}) => state);

            expect(listener).toHaveBeenCalledTimes(1);
        });

        it('should allow removing listener', () => {
            const registry = ReducerRegistry.getInstance();
            const listener = jest.fn();
            const unsubscribe = registry.onChange(listener);

            unsubscribe();
            registry.register('feature', (state: any = {}) => state);

            expect(listener).not.toHaveBeenCalled();
        });

        it('should return a combined reducer', () => {
            const registry = ReducerRegistry.getInstance();
            registry.register('counter', (state: number = 0, action: AnyAction) => {
                if (action.type === 'INCREMENT') return state + 1;
                return state;
            });

            const combined = registry.getCombinedReducer();
            const state = combined(undefined, { type: 'INCREMENT' });

            expect(state.counter).toBe(1);
        });

        it('should return identity reducer when no reducers registered', () => {
            const registry = ReducerRegistry.getInstance();
            const combined = registry.getCombinedReducer();
            const state = combined({ existing: true }, { type: 'TEST' });

            expect(state).toEqual({ existing: true });
        });
    });

    describe('loadReducer', () => {
        it('should register a reducer and return an unload function', () => {
            const baseReducer = (state: any = { base: true }, action: AnyAction) => state;
            store.configureStore(baseReducer, { base: true });

            const unload = loadReducer('dynamic', (state: any = { loaded: true }) => state, store);

            expect(typeof unload).toBe('function');

            // Should be able to unload without throwing
            unload();
        });
    });
});
