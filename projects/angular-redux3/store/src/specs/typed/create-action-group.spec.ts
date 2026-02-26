import { createActionGroup } from '../../typed/create-action-group';

describe('createActionGroup', () => {
    it('should create action creators with source prefix', () => {
        const Actions = createActionGroup({
            source: 'Counter',
            events: {
                'Increment': void 0 as void,
                'Decrement': void 0 as void,
                'Set Value': 0 as number,
            }
        });

        const incrementAction = Actions['Increment']();
        expect(incrementAction.type).toBe('[Counter] Increment');
        expect(incrementAction.payload).toBeUndefined();
    });

    it('should pass payloads correctly', () => {
        const Actions = createActionGroup({
            source: 'Todos',
            events: {
                'Add Todo': '' as string,
                'Remove Todo': 0 as number,
            }
        });

        const addAction = Actions['Add Todo']('Buy milk');
        expect(addAction.type).toBe('[Todos] Add Todo');
        expect(addAction.payload).toBe('Buy milk');

        const removeAction = Actions['Remove Todo'](42);
        expect(removeAction.type).toBe('[Todos] Remove Todo');
        expect(removeAction.payload).toBe(42);
    });

    it('should expose type property on action creators', () => {
        const Actions = createActionGroup({
            source: 'Auth',
            events: {
                'Login': void 0 as void,
                'Logout': void 0 as void,
            }
        });

        expect(Actions['Login'].type).toBe('[Auth] Login');
        expect(Actions['Logout'].type).toBe('[Auth] Logout');
    });

    it('should convert action creator to string as its type', () => {
        const Actions = createActionGroup({
            source: 'UI',
            events: {
                'Toggle Sidebar': void 0 as void,
            }
        });

        expect(`${Actions['Toggle Sidebar']}`).toBe('[UI] Toggle Sidebar');
    });

    it('should handle complex payload types', () => {
        interface User { id: number; name: string; }

        const Actions = createActionGroup({
            source: 'Users',
            events: {
                'Add User': { id: 0, name: '' } as User,
                'Remove User': 0 as number,
            }
        });

        const action = Actions['Add User']({ id: 1, name: 'Alice' });
        expect(action.type).toBe('[Users] Add User');
        expect(action.payload).toEqual({ id: 1, name: 'Alice' });
    });

    it('should create multiple independent action groups', () => {
        const AuthActions = createActionGroup({
            source: 'Auth',
            events: { 'Login': void 0 as void }
        });

        const UIActions = createActionGroup({
            source: 'UI',
            events: { 'Login': void 0 as void }
        });

        expect(AuthActions['Login'].type).toBe('[Auth] Login');
        expect(UIActions['Login'].type).toBe('[UI] Login');
    });
});
