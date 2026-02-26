/**
 * Tests for createSelector — memoized selector utility.
 */

import { createSelector } from '../../typed/create-selector';

interface AppState {
    todos: { id: number; text: string; completed: boolean }[];
    filter: string;
    counter: number;
}

describe('createSelector', () => {
    const defaultState: AppState = {
        todos: [
            { id: 1, text: 'Learn Redux', completed: true },
            { id: 2, text: 'Build App', completed: false },
        ],
        filter: 'all',
        counter: 42,
    };

    test('Should create a selector from one input selector.', () => {
        const selectTodos = (state: AppState) => state.todos;
        const selectCompletedTodos = createSelector(
            selectTodos,
            todos => todos.filter(t => t.completed),
        );

        const result = selectCompletedTodos(defaultState);

        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('Learn Redux');
    });

    test('Should create a selector from two input selectors.', () => {
        const selectTodos = (state: AppState) => state.todos;
        const selectFilter = (state: AppState) => state.filter;

        const selectFilteredTodos = createSelector(
            selectTodos,
            selectFilter,
            (todos, filter) => {
                if (filter === 'completed') return todos.filter(t => t.completed);
                if (filter === 'active') return todos.filter(t => !t.completed);
                return todos;
            },
        );

        const result = selectFilteredTodos(defaultState);

        expect(result).toHaveLength(2);
    });

    test('Should create a selector from three input selectors.', () => {
        const selectTodos = (state: AppState) => state.todos;
        const selectFilter = (state: AppState) => state.filter;
        const selectCounter = (state: AppState) => state.counter;

        const selectCombined = createSelector(
            selectTodos,
            selectFilter,
            selectCounter,
            (todos, filter, counter) => ({
                todoCount: todos.length,
                filter,
                counter,
            }),
        );

        const result = selectCombined(defaultState);

        expect(result).toEqual({
            todoCount: 2,
            filter: 'all',
            counter: 42,
        });
    });

    test('Should memoize and return the same reference for unchanged inputs.', () => {
        const selectTodos = (state: AppState) => state.todos;
        const selectCompletedTodos = createSelector(
            selectTodos,
            todos => todos.filter(t => t.completed),
        );

        const result1 = selectCompletedTodos(defaultState);
        const result2 = selectCompletedTodos(defaultState);

        expect(result1).toBe(result2); // Same reference — memoized
    });

    test('Should recompute when input changes.', () => {
        const selectTodos = (state: AppState) => state.todos;
        const resultFn = jest.fn((todos: AppState['todos']) =>
            todos.filter(t => t.completed)
        );
        const selectCompletedTodos = createSelector(selectTodos, resultFn);

        selectCompletedTodos(defaultState);

        const newState = {
            ...defaultState,
            todos: [
                ...defaultState.todos,
                { id: 3, text: 'New', completed: true },
            ],
        };

        selectCompletedTodos(newState);

        expect(resultFn).toHaveBeenCalledTimes(2);
    });

    test('Should NOT recompute when input is the same reference.', () => {
        const selectTodos = (state: AppState) => state.todos;
        const resultFn = jest.fn((todos: AppState['todos']) =>
            todos.filter(t => t.completed)
        );
        const selectCompletedTodos = createSelector(selectTodos, resultFn);

        selectCompletedTodos(defaultState);
        selectCompletedTodos(defaultState);
        selectCompletedTodos(defaultState);

        expect(resultFn).toHaveBeenCalledTimes(1);
    });

    test('Should support 4 input selectors.', () => {
        interface ExtState extends AppState { user: string; }
        const state: ExtState = { ...defaultState, user: 'Alice' };

        const sel = createSelector(
            (s: ExtState) => s.todos,
            (s: ExtState) => s.filter,
            (s: ExtState) => s.counter,
            (s: ExtState) => s.user,
            (todos, filter, counter, user) => `${user}: ${todos.length} todos, filter=${filter}, counter=${counter}`,
        );

        expect(sel(state)).toBe('Alice: 2 todos, filter=all, counter=42');
    });

    test('Should support 5 input selectors.', () => {
        interface ExtState extends AppState { user: string; theme: string; }
        const state: ExtState = { ...defaultState, user: 'Bob', theme: 'dark' };

        const sel = createSelector(
            (s: ExtState) => s.todos.length,
            (s: ExtState) => s.filter,
            (s: ExtState) => s.counter,
            (s: ExtState) => s.user,
            (s: ExtState) => s.theme,
            (len, filter, counter, user, theme) => ({ len, filter, counter, user, theme }),
        );

        expect(sel(state)).toEqual({ len: 2, filter: 'all', counter: 42, user: 'Bob', theme: 'dark' });
    });

    test('Should expose release() to clear memoization cache.', () => {
        const selectTodos = (s: AppState) => s.todos;
        const resultFn = jest.fn((todos: AppState['todos']) => todos.length);
        const sel = createSelector(selectTodos, resultFn);

        sel(defaultState);
        sel(defaultState);
        expect(resultFn).toHaveBeenCalledTimes(1);

        sel.release();

        sel(defaultState);
        expect(resultFn).toHaveBeenCalledTimes(2);
    });

    test('Should track recomputations count.', () => {
        const selectTodos = (s: AppState) => s.todos;
        const sel = createSelector(selectTodos, todos => todos.length);

        expect(sel.recomputations()).toBe(0);

        sel(defaultState);
        expect(sel.recomputations()).toBe(1);

        sel(defaultState);
        expect(sel.recomputations()).toBe(1); // Memoized, no recomputation

        const newState = { ...defaultState, todos: [...defaultState.todos] };
        sel(newState); // New reference → recompute
        expect(sel.recomputations()).toBe(2);
    });
});
