/**
 * Entity Adapter for @angular-redux3/store.
 *
 * Provides utilities for managing normalized entity state (collections of items
 * indexed by ID), similar to @ngrx/entity but designed for Redux reducers.
 */

import { AnyAction, Reducer } from 'redux';

/**
 * The shape of a normalized entity state.
 *
 * @template T The entity type.
 */
export interface EntityState<T> {
    /** Array of all entity IDs in order. */
    ids: Array<string | number>;
    /** Dictionary mapping entity IDs to entity objects. */
    entities: { [id: string]: T; [id: number]: T };
}

/**
 * Configuration for creating an entity adapter.
 */
export interface EntityAdapterConfig<T> {
    /** Function to extract the unique ID from an entity. Default: `entity => entity.id` */
    selectId?: (entity: T) => string | number;
    /** Function to sort entities. If not provided, entities are stored in insertion order. */
    sortComparer?: (a: T, b: T) => number;
}

/**
 * An entity adapter provides a set of functions for performing CRUD operations
 * on a normalized entity state.
 *
 * @template T The entity type.
 */
export interface EntityAdapter<T> {
    /** Returns an initial empty entity state. */
    getInitialState(): EntityState<T>;
    /** Returns an initial entity state merged with additional properties. */
    getInitialState<S extends object>(additionalState: S): EntityState<T> & S;

    /** Adds one entity. Ignores if the entity already exists. */
    addOne(state: EntityState<T>, entity: T): EntityState<T>;
    /** Adds many entities. Ignores entities that already exist. */
    addMany(state: EntityState<T>, entities: T[]): EntityState<T>;
    /** Sets all entities, replacing the current collection. */
    setAll(state: EntityState<T>, entities: T[]): EntityState<T>;
    /** Sets one entity, replacing it if it exists. */
    setOne(state: EntityState<T>, entity: T): EntityState<T>;

    /** Removes one entity by ID. */
    removeOne(state: EntityState<T>, id: string | number): EntityState<T>;
    /** Removes many entities by IDs. */
    removeMany(state: EntityState<T>, ids: Array<string | number>): EntityState<T>;
    /** Removes all entities. */
    removeAll(state: EntityState<T>): EntityState<T>;

    /** Updates one entity (merges partial changes). */
    updateOne(state: EntityState<T>, update: { id: string | number; changes: Partial<T> }): EntityState<T>;
    /** Updates many entities. */
    updateMany(state: EntityState<T>, updates: Array<{ id: string | number; changes: Partial<T> }>): EntityState<T>;

    /** Inserts if not found, updates (replaces entirely) if found. */
    upsertOne(state: EntityState<T>, entity: T): EntityState<T>;
    /** Upserts many entities. */
    upsertMany(state: EntityState<T>, entities: T[]): EntityState<T>;

    /** Built-in selectors for this adapter. */
    getSelectors(): EntitySelectors<T>;
    /** Built-in selectors scoped to a feature selector. */
    getSelectors<S>(selectState: (rootState: S) => EntityState<T>): FeatureEntitySelectors<S, T>;
}

/**
 * Selectors for an entity state.
 */
export interface EntitySelectors<T> {
    selectIds: (state: EntityState<T>) => Array<string | number>;
    selectEntities: (state: EntityState<T>) => { [id: string]: T };
    selectAll: (state: EntityState<T>) => T[];
    selectTotal: (state: EntityState<T>) => number;
}

/**
 * Feature-scoped entity selectors.
 */
export interface FeatureEntitySelectors<S, T> {
    selectIds: (state: S) => Array<string | number>;
    selectEntities: (state: S) => { [id: string]: T };
    selectAll: (state: S) => T[];
    selectTotal: (state: S) => number;
}

/**
 * Creates an entity adapter for managing a collection of entities.
 *
 * @example
 * ```typescript
 * interface User {
 *   id: number;
 *   name: string;
 *   email: string;
 * }
 *
 * const userAdapter = createEntityAdapter<User>({
 *   selectId: user => user.id,
 *   sortComparer: (a, b) => a.name.localeCompare(b.name),
 * });
 *
 * const initialState = userAdapter.getInitialState({ loading: false });
 * // { ids: [], entities: {}, loading: false }
 *
 * // In a reducer:
 * function userReducer(state = initialState, action: AnyAction) {
 *   switch (action.type) {
 *     case 'ADD_USER':
 *       return userAdapter.addOne(state, action.payload);
 *     case 'SET_USERS':
 *       return userAdapter.setAll(state, action.payload);
 *     case 'UPDATE_USER':
 *       return userAdapter.updateOne(state, action.payload);
 *     case 'REMOVE_USER':
 *       return userAdapter.removeOne(state, action.payload);
 *     default:
 *       return state;
 *   }
 * }
 *
 * // Selectors:
 * const { selectAll, selectTotal, selectIds, selectEntities } = userAdapter.getSelectors();
 * ```
 *
 * @template T The entity type.
 * @param config Optional adapter configuration.
 * @returns An EntityAdapter instance.
 */
export function createEntityAdapter<T>(config?: EntityAdapterConfig<T>): EntityAdapter<T> {
    const selectId = config?.selectId ?? ((entity: any) => entity.id);
    const sortComparer = config?.sortComparer;

    function sortEntities(state: EntityState<T>): EntityState<T> {
        if (!sortComparer) return state;

        const sortedEntities = state.ids
            .map(id => state.entities[id])
            .filter(Boolean)
            .sort(sortComparer);

        return {
            ...state,
            ids: sortedEntities.map(e => selectId(e)),
        };
    }

    function getInitialState(additionalState?: any): any {
        const base: EntityState<T> = { ids: [], entities: {} };
        return additionalState ? { ...base, ...additionalState } : base;
    }

    function addOne(state: EntityState<T>, entity: T): EntityState<T> {
        const id = selectId(entity);
        if (state.entities[id] !== undefined) {
            return state; // Already exists
        }

        const newState: EntityState<T> = {
            ids: [...state.ids, id],
            entities: { ...state.entities, [id]: entity },
        };
        return sortEntities(newState);
    }

    function addMany(state: EntityState<T>, entities: T[]): EntityState<T> {
        let result = state;
        for (const entity of entities) {
            result = addOne(result, entity);
        }
        return result;
    }

    function setAll(state: EntityState<T>, entities: T[]): EntityState<T> {
        const newEntities: { [id: string]: T } = {};
        const ids: Array<string | number> = [];

        for (const entity of entities) {
            const id = selectId(entity);
            newEntities[id] = entity;
            ids.push(id);
        }

        const newState: EntityState<T> = { ids, entities: newEntities };
        return sortEntities(newState);
    }

    function setOne(state: EntityState<T>, entity: T): EntityState<T> {
        const id = selectId(entity);
        const exists = state.entities[id] !== undefined;

        const newState: EntityState<T> = {
            ids: exists ? [...state.ids] : [...state.ids, id],
            entities: { ...state.entities, [id]: entity },
        };
        return sortEntities(newState);
    }

    function removeOne(state: EntityState<T>, id: string | number): EntityState<T> {
        if (state.entities[id] === undefined) {
            return state;
        }

        const newEntities = { ...state.entities };
        delete newEntities[id];

        return {
            ids: state.ids.filter(existingId => existingId !== id),
            entities: newEntities,
        };
    }

    function removeMany(state: EntityState<T>, ids: Array<string | number>): EntityState<T> {
        let result = state;
        for (const id of ids) {
            result = removeOne(result, id);
        }
        return result;
    }

    function removeAll(_state: EntityState<T>): EntityState<T> {
        return { ids: [], entities: {} };
    }

    function updateOne(state: EntityState<T>, update: { id: string | number; changes: Partial<T> }): EntityState<T> {
        const existing = state.entities[update.id];
        if (!existing) {
            return state;
        }

        const updated = { ...existing, ...update.changes };
        const newState: EntityState<T> = {
            ids: [...state.ids],
            entities: { ...state.entities, [update.id]: updated },
        };
        return sortEntities(newState);
    }

    function updateMany(state: EntityState<T>, updates: Array<{ id: string | number; changes: Partial<T> }>): EntityState<T> {
        let result = state;
        for (const update of updates) {
            result = updateOne(result, update);
        }
        return result;
    }

    function upsertOne(state: EntityState<T>, entity: T): EntityState<T> {
        const id = selectId(entity);
        if (state.entities[id] !== undefined) {
            return setOne(state, entity);
        }
        return addOne(state, entity);
    }

    function upsertMany(state: EntityState<T>, entities: T[]): EntityState<T> {
        let result = state;
        for (const entity of entities) {
            result = upsertOne(result, entity);
        }
        return result;
    }

    function getSelectors(selectState?: (rootState: any) => EntityState<T>): any {
        const selectIds = (state: EntityState<T>) => state.ids;
        const selectEntities = (state: EntityState<T>) => state.entities;
        const selectAll = (state: EntityState<T>) => state.ids.map(id => state.entities[id]).filter(Boolean);
        const selectTotal = (state: EntityState<T>) => state.ids.length;

        if (selectState) {
            return {
                selectIds: (rootState: any) => selectIds(selectState(rootState)),
                selectEntities: (rootState: any) => selectEntities(selectState(rootState)),
                selectAll: (rootState: any) => selectAll(selectState(rootState)),
                selectTotal: (rootState: any) => selectTotal(selectState(rootState)),
            };
        }

        return { selectIds, selectEntities, selectAll, selectTotal };
    }

    return {
        getInitialState,
        addOne,
        addMany,
        setAll,
        setOne,
        removeOne,
        removeMany,
        removeAll,
        updateOne,
        updateMany,
        upsertOne,
        upsertMany,
        getSelectors,
    };
}
