/**
 * Tests for test utilities — createTestStore, createSpyStore, createSelectorStub.
 */

import { createTestStore, createSpyStore, createSelectorStub, TestNgRedux } from '../../testing/test-utils';
import { Reducer, AnyAction } from 'redux';

describe('Test Utilities', () => {
    interface IAppState {
        count: number;
        name: string;
    }

    const defaultState: IAppState = { count: 0, name: 'default' };

    const rootReducer: Reducer<IAppState, AnyAction> = (
        state = defaultState,
        action,
    ) => {
        switch (action.type) {
            case 'INCREMENT':
                return { ...state, count: state.count + 1 };
            case 'SET_NAME':
                return { ...state, name: action['payload'] };
            case '@@TEST/SET_STATE':
                return action['payload'];
            default:
                return state;
        }
    };

    describe('createTestStore', () => {
        test('Should create a test store with initial state.', () => {
            const store = createTestStore({
                reducer: rootReducer,
                initialState: defaultState,
            });

            expect(store.getState()).toEqual(defaultState);
        });

        test('Should dispatch actions and update state.', () => {
            const store = createTestStore({
                reducer: rootReducer,
                initialState: defaultState,
            });

            store.dispatch({ type: 'INCREMENT' });

            expect(store.getState().count).toBe(1);
        });

        test('Should support dispatchAndGetState.', () => {
            const store = createTestStore({
                reducer: rootReducer,
                initialState: defaultState,
            });

            const newState = store.dispatchAndGetState({ type: 'INCREMENT' });

            expect(newState.count).toBe(1);
        });

        test('Should support setState.', () => {
            const store = createTestStore({
                reducer: rootReducer,
                initialState: defaultState,
            });

            store.setState({ count: 99, name: 'overridden' });

            expect(store.getState()).toEqual({
                count: 99,
                name: 'overridden',
            });
        });

        test('Should support selectSnapshot.', () => {
            const store = createTestStore({
                reducer: rootReducer,
                initialState: defaultState,
            });

            store.dispatch({ type: 'SET_NAME', payload: 'Alice' });

            const name = store.selectSnapshot<string>('name' as any);

            expect(name).toBe('Alice');
        });

        test('Should support select as observable.', (done) => {
            const store = createTestStore({
                reducer: rootReducer,
                initialState: defaultState,
            });

            store.select<number>('count' as any).subscribe(count => {
                expect(count).toBe(0);
                done();
            });
        });
    });

    describe('createSpyStore', () => {
        test('Should track dispatched actions.', () => {
            const { store, dispatched } = createSpyStore({
                reducer: rootReducer,
                initialState: defaultState,
            });

            store.dispatch({ type: 'INCREMENT' });
            store.dispatch({ type: 'SET_NAME', payload: 'Bob' });

            const actions = dispatched();

            expect(actions).toHaveLength(2);
            expect(actions[0].type).toBe('INCREMENT');
            expect(actions[1].type).toBe('SET_NAME');
        });

        test('Should provide lastAction.', () => {
            const { store, lastAction } = createSpyStore({
                reducer: rootReducer,
                initialState: defaultState,
            });

            store.dispatch({ type: 'INCREMENT' });
            store.dispatch({ type: 'SET_NAME', payload: 'X' });

            expect(lastAction()?.type).toBe('SET_NAME');
        });

        test('Should support reset.', () => {
            const { store, dispatched, reset } = createSpyStore({
                reducer: rootReducer,
                initialState: defaultState,
            });

            store.dispatch({ type: 'INCREMENT' });
            reset();

            expect(dispatched()).toHaveLength(0);
        });
    });

    describe('createSelectorStub', () => {
        test('Should create a subject that emits pushed values.', (done) => {
            const stub = createSelectorStub<string>();

            stub.subscribe(value => {
                expect(value).toBe('Test Value');
                done();
            });

            stub.next('Test Value');
        });

        test('Should replay the last value to new subscribers.', (done) => {
            const stub = createSelectorStub<number>();
            stub.next(42);

            stub.subscribe(value => {
                expect(value).toBe(42);
                done();
            });
        });
    });
});
