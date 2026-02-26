import { createEntityAdapter, EntityState } from '../../entity/entity-adapter';

interface User {
    id: number;
    name: string;
    email: string;
}

describe('EntityAdapter', () => {
    let adapter: ReturnType<typeof createEntityAdapter<User>>;

    beforeEach(() => {
        adapter = createEntityAdapter<User>({
            selectId: user => user.id,
        });
    });

    describe('getInitialState', () => {
        it('should return empty entity state', () => {
            const state = adapter.getInitialState();
            expect(state).toEqual({ ids: [], entities: {} });
        });

        it('should merge additional state properties', () => {
            const state = adapter.getInitialState({ loading: false, error: null });
            expect(state).toEqual({ ids: [], entities: {}, loading: false, error: null });
        });
    });

    describe('addOne', () => {
        it('should add a single entity', () => {
            const state = adapter.getInitialState();
            const user: User = { id: 1, name: 'Alice', email: 'alice@test.com' };
            const result = adapter.addOne(state, user);

            expect(result.ids).toEqual([1]);
            expect(result.entities[1]).toEqual(user);
        });

        it('should not add duplicate entities', () => {
            const user: User = { id: 1, name: 'Alice', email: 'alice@test.com' };
            let state = adapter.addOne(adapter.getInitialState(), user);
            const original = state;
            state = adapter.addOne(state, { ...user, name: 'Alice Updated' });

            expect(state).toBe(original); // Same reference — no change
            expect(state.ids.length).toBe(1);
        });
    });

    describe('addMany', () => {
        it('should add multiple entities', () => {
            const state = adapter.getInitialState();
            const users: User[] = [
                { id: 1, name: 'Alice', email: 'alice@test.com' },
                { id: 2, name: 'Bob', email: 'bob@test.com' },
            ];
            const result = adapter.addMany(state, users);

            expect(result.ids).toEqual([1, 2]);
            expect(Object.keys(result.entities).length).toBe(2);
        });
    });

    describe('setAll', () => {
        it('should replace all entities', () => {
            const initial = adapter.addOne(adapter.getInitialState(), { id: 1, name: 'Old', email: 'old@test.com' });
            const newUsers: User[] = [
                { id: 10, name: 'New1', email: 'new1@test.com' },
                { id: 20, name: 'New2', email: 'new2@test.com' },
            ];
            const result = adapter.setAll(initial, newUsers);

            expect(result.ids).toEqual([10, 20]);
            expect(result.entities[1]).toBeUndefined();
            expect(result.entities[10]).toBeDefined();
        });
    });

    describe('setOne', () => {
        it('should replace an existing entity', () => {
            const state = adapter.addOne(adapter.getInitialState(), { id: 1, name: 'Alice', email: 'a@test.com' });
            const result = adapter.setOne(state, { id: 1, name: 'Alice Updated', email: 'a@test.com' });

            expect(result.entities[1].name).toBe('Alice Updated');
            expect(result.ids.length).toBe(1);
        });

        it('should add a new entity if not existing', () => {
            const state = adapter.getInitialState();
            const result = adapter.setOne(state, { id: 5, name: 'Charlie', email: 'c@test.com' });

            expect(result.ids).toEqual([5]);
            expect(result.entities[5].name).toBe('Charlie');
        });
    });

    describe('removeOne', () => {
        it('should remove an entity by id', () => {
            let state = adapter.addMany(adapter.getInitialState(), [
                { id: 1, name: 'A', email: 'a@test.com' },
                { id: 2, name: 'B', email: 'b@test.com' },
            ]);
            const result = adapter.removeOne(state, 1);

            expect(result.ids).toEqual([2]);
            expect(result.entities[1]).toBeUndefined();
        });

        it('should return same state if id does not exist', () => {
            const state = adapter.getInitialState();
            const result = adapter.removeOne(state, 999);

            expect(result).toBe(state);
        });
    });

    describe('removeMany', () => {
        it('should remove multiple entities', () => {
            let state = adapter.addMany(adapter.getInitialState(), [
                { id: 1, name: 'A', email: 'a@test.com' },
                { id: 2, name: 'B', email: 'b@test.com' },
                { id: 3, name: 'C', email: 'c@test.com' },
            ]);
            const result = adapter.removeMany(state, [1, 3]);

            expect(result.ids).toEqual([2]);
        });
    });

    describe('removeAll', () => {
        it('should clear all entities', () => {
            let state = adapter.addMany(adapter.getInitialState(), [
                { id: 1, name: 'A', email: 'a@test.com' },
                { id: 2, name: 'B', email: 'b@test.com' },
            ]);
            const result = adapter.removeAll(state);

            expect(result.ids).toEqual([]);
            expect(result.entities).toEqual({});
        });
    });

    describe('updateOne', () => {
        it('should update an existing entity with partial changes', () => {
            let state = adapter.addOne(adapter.getInitialState(), { id: 1, name: 'Alice', email: 'a@test.com' });
            const result = adapter.updateOne(state, { id: 1, changes: { name: 'Alice Updated' } });

            expect(result.entities[1].name).toBe('Alice Updated');
            expect(result.entities[1].email).toBe('a@test.com');
        });

        it('should return same state if entity does not exist', () => {
            const state = adapter.getInitialState();
            const result = adapter.updateOne(state, { id: 999, changes: { name: 'Nobody' } });

            expect(result).toBe(state);
        });
    });

    describe('updateMany', () => {
        it('should update multiple entities', () => {
            let state = adapter.addMany(adapter.getInitialState(), [
                { id: 1, name: 'A', email: 'a@test.com' },
                { id: 2, name: 'B', email: 'b@test.com' },
            ]);
            const result = adapter.updateMany(state, [
                { id: 1, changes: { name: 'A Updated' } },
                { id: 2, changes: { name: 'B Updated' } },
            ]);

            expect(result.entities[1].name).toBe('A Updated');
            expect(result.entities[2].name).toBe('B Updated');
        });
    });

    describe('upsertOne', () => {
        it('should insert new entity', () => {
            const state = adapter.getInitialState();
            const result = adapter.upsertOne(state, { id: 1, name: 'Alice', email: 'a@test.com' });

            expect(result.ids).toEqual([1]);
        });

        it('should replace existing entity', () => {
            let state = adapter.addOne(adapter.getInitialState(), { id: 1, name: 'Alice', email: 'a@test.com' });
            const result = adapter.upsertOne(state, { id: 1, name: 'Alice New', email: 'new@test.com' });

            expect(result.entities[1].name).toBe('Alice New');
            expect(result.entities[1].email).toBe('new@test.com');
        });
    });

    describe('upsertMany', () => {
        it('should insert and update entities', () => {
            let state = adapter.addOne(adapter.getInitialState(), { id: 1, name: 'Alice', email: 'a@test.com' });
            const result = adapter.upsertMany(state, [
                { id: 1, name: 'Alice Updated', email: 'a@test.com' },
                { id: 2, name: 'Bob', email: 'b@test.com' },
            ]);

            expect(result.ids.length).toBe(2);
            expect(result.entities[1].name).toBe('Alice Updated');
            expect(result.entities[2].name).toBe('Bob');
        });
    });

    describe('getSelectors', () => {
        it('should provide entity selectors', () => {
            const { selectIds, selectEntities, selectAll, selectTotal } = adapter.getSelectors();

            let state = adapter.addMany(adapter.getInitialState(), [
                { id: 1, name: 'Alice', email: 'a@test.com' },
                { id: 2, name: 'Bob', email: 'b@test.com' },
            ]);

            expect(selectIds(state)).toEqual([1, 2]);
            expect(Object.keys(selectEntities(state)).length).toBe(2);
            expect(selectAll(state).length).toBe(2);
            expect(selectTotal(state)).toBe(2);
        });

        it('should provide feature-scoped selectors', () => {
            interface AppState {
                users: EntityState<User>;
            }

            const { selectAll, selectTotal } = adapter.getSelectors(
                (state: AppState) => state.users
            );

            const users = adapter.addMany(adapter.getInitialState(), [
                { id: 1, name: 'Alice', email: 'a@test.com' },
            ]);

            const appState: AppState = { users };

            expect(selectAll(appState)).toEqual([{ id: 1, name: 'Alice', email: 'a@test.com' }]);
            expect(selectTotal(appState)).toBe(1);
        });
    });

    describe('sortComparer', () => {
        it('should sort entities by comparer', () => {
            const sortedAdapter = createEntityAdapter<User>({
                selectId: u => u.id,
                sortComparer: (a, b) => a.name.localeCompare(b.name),
            });

            const state = sortedAdapter.addMany(sortedAdapter.getInitialState(), [
                { id: 3, name: 'Charlie', email: 'c@test.com' },
                { id: 1, name: 'Alice', email: 'a@test.com' },
                { id: 2, name: 'Bob', email: 'b@test.com' },
            ]);

            expect(state.ids).toEqual([1, 2, 3]);
        });

        it('should sort entities after setOne when sortComparer is provided', () => {
            const sortedAdapter = createEntityAdapter<User>({
                selectId: u => u.id,
                sortComparer: (a, b) => a.name.localeCompare(b.name),
            });

            let state = sortedAdapter.addMany(sortedAdapter.getInitialState(), [
                { id: 1, name: 'Alice', email: 'a@test.com' },
                { id: 2, name: 'Charlie', email: 'c@test.com' },
            ]);

            // Insert Bob, should be sorted between Alice and Charlie
            state = sortedAdapter.setOne(state, { id: 3, name: 'Bob', email: 'b@test.com' });

            expect(state.ids).toEqual([1, 3, 2]); // Alice=1, Bob=3, Charlie=2
        });

        it('should re-sort after setOne replaces an entity with a new sort key', () => {
            const sortedAdapter = createEntityAdapter<User>({
                selectId: u => u.id,
                sortComparer: (a, b) => a.name.localeCompare(b.name),
            });

            let state = sortedAdapter.addMany(sortedAdapter.getInitialState(), [
                { id: 1, name: 'Alice', email: 'a@test.com' },
                { id: 2, name: 'Bob', email: 'b@test.com' },
                { id: 3, name: 'Charlie', email: 'c@test.com' },
            ]);

            // Replace Alice with Zara — should move to end
            state = sortedAdapter.setOne(state, { id: 1, name: 'Zara', email: 'z@test.com' });

            expect(state.ids).toEqual([2, 3, 1]); // Bob=2, Charlie=3, Zara=1
        });
    });

    describe('default selectId', () => {
        it('should use entity.id by default', () => {
            const defaultAdapter = createEntityAdapter<User>();
            const state = defaultAdapter.addOne(defaultAdapter.getInitialState(), { id: 42, name: 'Test', email: 't@t.com' });

            expect(state.ids).toEqual([42]);
            expect(state.entities[42].name).toBe('Test');
        });
    });
});
