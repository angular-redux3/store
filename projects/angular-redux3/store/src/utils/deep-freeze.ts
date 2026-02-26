/**
 * Deep freeze utility for development mode immutability enforcement.
 *
 * Recursively freezes a state object so that any accidental mutation
 * outside of reducers throws a runtime error, making bugs easier to catch.
 */

/**
 * Recursively freezes an object so that no properties can be added, removed, or modified.
 * In production this should be disabled for performance.
 *
 * @example
 * ```typescript
 * const state = deepFreeze({ count: 0, nested: { value: 1 } });
 * state.count = 5;        // throws TypeError in strict mode
 * state.nested.value = 2; // throws TypeError in strict mode
 * ```
 *
 * @template T The type of the object.
 * @param obj The object to freeze.
 * @returns The frozen object (same reference).
 */
export function deepFreeze<T>(obj: T): T {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
        return obj;
    }

    if (Object.isFrozen(obj)) {
        return obj;
    }

    // Don't freeze special objects
    if (
        obj instanceof Date ||
        obj instanceof RegExp ||
        obj instanceof ArrayBuffer ||
        ArrayBuffer.isView(obj)
    ) {
        return Object.freeze(obj) as T;
    }

    Object.freeze(obj);

    if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
            deepFreeze(obj[i]);
        }
    } else {
        const keys = Object.getOwnPropertyNames(obj);
        for (const key of keys) {
            const value = (obj as any)[key];
            if (typeof value === 'object' && value !== null) {
                deepFreeze(value);
            }
        }
    }

    return obj;
}

/**
 * Configuration for state freezing behavior.
 */
export interface FreezeConfig {
    /** Whether to enable deep freeze. Default: false */
    enabled: boolean;
    /** Whether to log warnings instead of throwing. Default: false */
    warnOnly?: boolean;
}

/** Global freeze configuration */
let _freezeConfig: FreezeConfig = { enabled: false, warnOnly: false };

/**
 * Enables or disables state freezing globally.
 *
 * @example
 * ```typescript
 * import { enableStateFreezing } from '@angular-redux3/store';
 *
 * // Enable in development
 * if (isDevMode()) {
 *   enableStateFreezing({ enabled: true });
 * }
 * ```
 *
 * @param config Freeze configuration.
 */
export function enableStateFreezing(config: FreezeConfig): void {
    _freezeConfig = { ...config };
}

/**
 * Returns the current freeze configuration.
 */
export function getFreezeConfig(): FreezeConfig {
    return _freezeConfig;
}

/**
 * Conditionally freezes state based on global configuration.
 * This is used internally by the store after each state update.
 *
 * @param state The state to conditionally freeze.
 * @returns The (possibly frozen) state.
 */
export function conditionalFreeze<T>(state: T): T {
    if (_freezeConfig.enabled) {
        return deepFreeze(state);
    }
    return state;
}
