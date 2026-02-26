import { rxEffect, rxActionEffect } from '../../effects/rx-effect';
import { NgRedux } from '../../services/ng-redux.service';
import { ReducerService } from '../../services/reducer.service';
import { of, delay, Subject, Observable, EMPTY } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AnyAction } from 'redux';

describe('rxEffect', () => {
    let store: NgRedux<any>;

    beforeEach(() => {
        ReducerService.reset();
        store = new NgRedux<any>(undefined);
        const reducer = (state: any = { value: 0 }, action: AnyAction) => {
            if (action.type === 'SET_VALUE') return { ...state, value: action.payload };
            return state;
        };
        store.configureStore(reducer, { value: 0 });
    });

    it('should create an effect with a destroy function', () => {
        const effectRef = rxEffect(
            store,
            (s: any) => s.value,
            (value: number) => of(value),
        );

        expect(effectRef).toBeDefined();
        expect(typeof effectRef.destroy).toBe('function');
        expect(typeof effectRef.trigger).toBe('function');

        effectRef.destroy();
    });

    it('should invoke effectFn when selected state changes', (done) => {
        const values: number[] = [];

        const effectRef = rxEffect(
            store,
            (s: any) => s.value,
            (value: number) => {
                values.push(value);
                if (values.length === 2) {
                    expect(values).toEqual([0, 42]);
                    effectRef.destroy();
                    done();
                }
                return EMPTY;
            },
        );

        store.dispatch({ type: 'SET_VALUE', payload: 42 });
    });

    it('should handle errors in effectFn gracefully', (done) => {
        let callCount = 0;

        const effectRef = rxEffect(
            store,
            (s: any) => s.value,
            (_value: number) => {
                callCount++;
                if (callCount === 1) {
                    // Initial value triggers - throw error
                    throw new Error('test error');
                }
                return EMPTY;
            },
            { resubscribeOnError: false }
        );

        // Should not crash
        setTimeout(() => {
            effectRef.destroy();
            done();
        }, 50);
    });

    it('should clean up when destroyed', () => {
        const effectRef = rxEffect(
            store,
            (s: any) => s.value,
            () => EMPTY,
        );

        // Should not throw
        effectRef.destroy();
        effectRef.destroy(); // Double destroy should be safe
    });
});

describe('rxActionEffect', () => {
    let store: NgRedux<any>;

    beforeEach(() => {
        ReducerService.reset();
        store = new NgRedux<any>(undefined);
        const reducer = (state: any = { value: 0 }, action: AnyAction) => {
            if (action.type === 'SET_VALUE') return { ...state, value: action.payload };
            if (action.type === 'VALUE_SET') return { ...state, confirmed: true };
            return state;
        };
        store.configureStore(reducer, { value: 0 });
    });

    it('should create an action effect with destroy function', () => {
        const effectRef = rxActionEffect(
            store,
            ['SET_VALUE'],
            (action) => EMPTY,
        );

        expect(effectRef).toBeDefined();
        expect(typeof effectRef.destroy).toBe('function');

        effectRef.destroy();
    });

    it('should trigger effectFn when matching action is dispatched', (done) => {
        const effectRef = rxActionEffect(
            store,
            ['SET_VALUE'],
            (action) => {
                expect(action.type).toBe('SET_VALUE');
                expect(action.payload).toBe(99);
                effectRef.destroy();
                done();
                return EMPTY;
            },
        );

        store.dispatch({ type: 'SET_VALUE', payload: 99 });
    });

    it('should not trigger for non-matching actions', (done) => {
        const spy = jest.fn();

        const effectRef = rxActionEffect(
            store,
            ['SPECIFIC_ACTION'],
            (action) => {
                spy();
                return EMPTY;
            },
        );

        store.dispatch({ type: 'UNRELATED_ACTION' });

        setTimeout(() => {
            expect(spy).not.toHaveBeenCalled();
            effectRef.destroy();
            done();
        }, 50);
    });

    it('should clean up and restore original dispatch on destroy', () => {
        const effectRef = rxActionEffect(
            store,
            ['TEST'],
            () => EMPTY,
        );

        // dispatch is wrapped
        effectRef.destroy();

        // After destroy, dispatch should still work normally
        expect(() => store.dispatch({ type: 'SET_VALUE', payload: 5 })).not.toThrow();
        expect(store.getState().value).toBe(5);
    });

    it('should allow multiple rxActionEffect instances without breaking dispatch chain', (done) => {
        const actionsA: string[] = [];
        const actionsB: string[] = [];

        const effectA = rxActionEffect(
            store,
            ['ACTION_A'],
            (action) => {
                actionsA.push(action.type);
                return EMPTY;
            },
        );

        const effectB = rxActionEffect(
            store,
            ['ACTION_B'],
            (action) => {
                actionsB.push(action.type);
                return EMPTY;
            },
        );

        store.dispatch({ type: 'ACTION_A' });
        store.dispatch({ type: 'ACTION_B' });

        setTimeout(() => {
            expect(actionsA).toEqual(['ACTION_A']);
            expect(actionsB).toEqual(['ACTION_B']);

            // Destroy first one — second should still work
            effectA.destroy();
            store.dispatch({ type: 'ACTION_B' });

            setTimeout(() => {
                expect(actionsB).toEqual(['ACTION_B', 'ACTION_B']);
                effectB.destroy();

                // Store dispatch should still work after all cleanups
                expect(() => store.dispatch({ type: 'SET_VALUE', payload: 10 })).not.toThrow();
                expect(store.getState().value).toBe(10);
                done();
            }, 20);
        }, 20);
    });
});
