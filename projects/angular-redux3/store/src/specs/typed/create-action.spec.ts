/**
 * Tests for createTypedAction — typed action creator utility.
 */

import { createTypedAction, TypedActionCreator } from '../../typed/create-action';

describe('createTypedAction', () => {
    test('Should create an action with type only (no payload).', () => {
        const reset = createTypedAction('counter/reset');
        const action = reset();

        expect(action.type).toBe('counter/reset');
        expect(action.payload).toBeUndefined();
    });

    test('Should create an action with a payload.', () => {
        const increment = createTypedAction<number>('counter/increment');
        const action = increment(5);

        expect(action.type).toBe('counter/increment');
        expect(action.payload).toBe(5);
    });

    test('Should create an action with an object payload.', () => {
        const setUser = createTypedAction<{ name: string; age: number }>('user/set');
        const action = setUser({ name: 'Alice', age: 30 });

        expect(action.type).toBe('user/set');
        expect(action.payload).toEqual({ name: 'Alice', age: 30 });
    });

    test('Should expose the type property on the creator.', () => {
        const myAction = createTypedAction('test/action');

        expect(myAction.type).toBe('test/action');
    });

    test('Should match its own actions.', () => {
        const increment = createTypedAction<number>('counter/increment');
        const action = increment(10);

        expect(increment.match(action)).toBe(true);
    });

    test('Should not match different action types.', () => {
        const increment = createTypedAction<number>('counter/increment');
        const decrement = createTypedAction<number>('counter/decrement');
        const action = decrement(1);

        expect(increment.match(action)).toBe(false);
    });

    test('Should convert to string as the type.', () => {
        const myAction = createTypedAction('some/type');

        expect(`${myAction}`).toBe('some/type');
    });
});
