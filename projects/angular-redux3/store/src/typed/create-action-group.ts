/**
 * Action Group utility for @angular-redux3/store.
 *
 * Provides a type-safe way to create a group of related actions,
 * inspired by NgRx's createActionGroup pattern.
 */

import { PayloadAction } from '../interfaces/store.interface';

/**
 * Extracts the payload type from an event entry.
 * - `void` means no payload
 * - any other type is the payload type
 */
type ActionGroupEvent<Payload> = Payload extends void
    ? () => PayloadAction<void>
    : (payload: Payload) => PayloadAction<Payload>;

/**
 * Maps an events record to action creators.
 */
type ActionGroupResult<Source extends string, Events extends Record<string, any>> = {
    [K in keyof Events & string]: ActionGroupEvent<Events[K]> & { type: string };
};

/**
 * Configuration for createActionGroup.
 */
export interface ActionGroupConfig<Source extends string, Events extends Record<string, any>> {
    /** The source/feature name for the action group. */
    source: Source;
    /** A record of event names to their payload types. Use `void` for no payload. */
    events: Events;
}

/**
 * Creates a group of related action creators with a common source prefix.
 *
 * @example
 * ```typescript
 * const TodoActions = createActionGroup({
 *   source: 'Todos',
 *   events: {
 *     'Load Todos': void 0 as void,
 *     'Add Todo': '' as string,
 *     'Remove Todo': 0 as number,
 *     'Toggle Todo': 0 as number,
 *   }
 * });
 *
 * // Usage:
 * store.dispatch(TodoActions['Load Todos']());
 * // { type: '[Todos] Load Todos' }
 *
 * store.dispatch(TodoActions['Add Todo']('Buy milk'));
 * // { type: '[Todos] Add Todo', payload: 'Buy milk' }
 *
 * // Type checking:
 * TodoActions['Remove Todo'](42);    // ✓ number
 * TodoActions['Remove Todo']('abc'); // ✗ compile error
 * ```
 *
 * @template Source The source name type.
 * @template Events The events record type mapping event names to payload types.
 * @param config The action group configuration.
 * @returns An object of action creators keyed by event name.
 */
export function createActionGroup<
    Source extends string,
    Events extends Record<string, any>
>(config: ActionGroupConfig<Source, Events>): ActionGroupResult<Source, Events> {
    const { source, events } = config;
    const result: any = {};

    for (const eventName of Object.keys(events)) {
        const type = `[${source}] ${eventName}`;

        const creator = (payload?: any): PayloadAction<any> => {
            const action: PayloadAction<any> = { type };
            if (payload !== undefined) {
                action.payload = payload;
            }
            return action;
        };

        creator.type = type;
        creator.toString = () => type;

        result[eventName] = creator;
    }

    return result;
}
