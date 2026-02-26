/**
 * Typed action creator utilities for @angular-redux3/store.
 *
 * Provides type-safe action creation with full TypeScript inference,
 * inspired by Redux Toolkit's createAction but adapted for angular-redux3.
 */

import { AnyAction } from 'redux';
import { PayloadAction } from '../interfaces/store.interface';

/**
 * Represents a typed action creator function with a `type` property
 * that can be used for type narrowing in reducers.
 */
export interface TypedActionCreator<Payload = void> {
    /** The action type string. */
    readonly type: string;

    /** Creates an action with the given payload. */
    (payload: Payload): PayloadAction<Payload>;

    /** Type guard to check if an action matches this creator. */
    match(action: AnyAction): action is PayloadAction<Payload>;
}

/**
 * Represents a typed action creator with no payload.
 */
export interface TypedActionCreatorNoPayload {
    readonly type: string;
    (): PayloadAction<void>;
    match(action: AnyAction): action is PayloadAction<void>;
}

/**
 * Creates a type-safe action creator function.
 *
 * @example
 * ```typescript
 * const increment = createTypedAction<number>('counter/increment');
 * const reset = createTypedAction('counter/reset');
 *
 * // Dispatching:
 * store.dispatch(increment(5));  // { type: 'counter/increment', payload: 5 }
 * store.dispatch(reset());       // { type: 'counter/reset' }
 *
 * // Type guard in reducer:
 * if (increment.match(action)) {
 *     // action.payload is typed as number
 *     return state + action.payload;
 * }
 * ```
 *
 * @template Payload The payload type. Use `void` for no-payload actions.
 * @param type The action type string.
 * @returns A typed action creator function.
 */
export function createTypedAction<Payload = void>(type: string): Payload extends void
    ? TypedActionCreatorNoPayload
    : TypedActionCreator<Payload> {

    const creator = (payload?: any): PayloadAction<any> => {
        const action: PayloadAction<any> = { type };
        if (payload !== undefined) {
            action.payload = payload;
        }
        return action;
    };

    creator.type = type;
    creator.match = (action: AnyAction): boolean => action.type === type;
    creator.toString = () => type;

    return creator as any;
}

/**
 * Infers the state type from a root reducer function.
 *
 * @example
 * ```typescript
 * const rootReducer = combineReducers({ counter, todos });
 * type AppState = InferState<typeof rootReducer>;
 * // AppState = { counter: CounterState; todos: TodoState }
 * ```
 */
export type InferState<R> = R extends (...args: any[]) => infer S ? S : never;
