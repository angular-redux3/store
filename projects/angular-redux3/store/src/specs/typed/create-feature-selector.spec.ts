import { createFeatureSelector, createFeaturePropertySelector } from '../../typed/create-feature-selector';

interface AuthState {
    isLoggedIn: boolean;
    token: string | null;
    user: { name: string } | null;
}

interface TodoState {
    items: string[];
    loading: boolean;
}

interface AppState {
    auth: AuthState;
    todos: TodoState;
}

describe('createFeatureSelector', () => {
    const appState: AppState = {
        auth: { isLoggedIn: true, token: 'abc', user: { name: 'Alice' } },
        todos: { items: ['item1', 'item2'], loading: false },
    };

    it('should select a top-level feature', () => {
        const selectAuth = createFeatureSelector<AppState, 'auth'>('auth');
        const result = selectAuth(appState);

        expect(result).toEqual(appState.auth);
        expect(result.isLoggedIn).toBe(true);
    });

    it('should select a different feature', () => {
        const selectTodos = createFeatureSelector<AppState, 'todos'>('todos');
        const result = selectTodos(appState);

        expect(result).toEqual(appState.todos);
        expect(result.items.length).toBe(2);
    });

    it('should handle null state gracefully', () => {
        const selectAuth = createFeatureSelector<AppState, 'auth'>('auth');
        const result = selectAuth(null as any);

        expect(result).toBeUndefined();
    });

    it('should handle undefined state gracefully', () => {
        const selectAuth = createFeatureSelector<AppState, 'auth'>('auth');
        const result = selectAuth(undefined as any);

        expect(result).toBeUndefined();
    });

    it('should attach metadata to the selector', () => {
        const selectAuth = createFeatureSelector<AppState, 'auth'>('auth');
        expect((selectAuth as any).__featureKey).toBe('auth');
    });
});

describe('createFeaturePropertySelector', () => {
    const appState: AppState = {
        auth: { isLoggedIn: true, token: 'abc', user: { name: 'Alice' } },
        todos: { items: ['item1'], loading: false },
    };

    it('should select a nested property', () => {
        const selectAuth = createFeatureSelector<AppState, 'auth'>('auth');
        const selectToken = createFeaturePropertySelector(selectAuth, 'token');

        expect(selectToken(appState)).toBe('abc');
    });

    it('should select boolean properties', () => {
        const selectAuth = createFeatureSelector<AppState, 'auth'>('auth');
        const selectIsLoggedIn = createFeaturePropertySelector(selectAuth, 'isLoggedIn');

        expect(selectIsLoggedIn(appState)).toBe(true);
    });

    it('should handle null feature gracefully', () => {
        const selectAuth = createFeatureSelector<AppState, 'auth'>('auth');
        const selectToken = createFeaturePropertySelector(selectAuth, 'token');

        const emptyState = { auth: null as any, todos: null as any };
        expect(selectToken(emptyState)).toBeUndefined();
    });

    it('should work with nested object properties', () => {
        const selectAuth = createFeatureSelector<AppState, 'auth'>('auth');
        const selectUser = createFeaturePropertySelector(selectAuth, 'user');

        expect(selectUser(appState)).toEqual({ name: 'Alice' });
    });
});
