/**
 * Typed memoized selector utilities for @angular-redux3/store.
 *
 * Provides a `createSelector` function with built-in memoization and
 * full TypeScript type inference for composing selectors (up to 8 inputs).
 */

/**
 * Creates a memoized selector from one input selector and a result function.
 *
 * @example
 * ```typescript
 * const selectTodos = (state: AppState) => state.todos;
 * const selectCompletedTodos = createSelector(
 *   selectTodos,
 *   todos => todos.filter(t => t.completed)
 * );
 *
 * // Usage:
 * const completed = selectCompletedTodos(store.getState());
 * // Or with store.select:
 * const completed$ = store.select(selectCompletedTodos);
 * ```
 */
export type MemoizedSelector<S, Result> = ((state: S) => Result) & {
    release: () => void;
    recomputations: () => number;
};

export function createSelector<S, R1, Result>(
    s1: (state: S) => R1,
    resultFn: (r1: R1) => Result,
): MemoizedSelector<S, Result>;

/** Creates a memoized selector from 2 input selectors. */
export function createSelector<S, R1, R2, Result>(
    s1: (state: S) => R1,
    s2: (state: S) => R2,
    resultFn: (r1: R1, r2: R2) => Result,
): MemoizedSelector<S, Result>;

/** Creates a memoized selector from 3 input selectors. */
export function createSelector<S, R1, R2, R3, Result>(
    s1: (state: S) => R1,
    s2: (state: S) => R2,
    s3: (state: S) => R3,
    resultFn: (r1: R1, r2: R2, r3: R3) => Result,
): MemoizedSelector<S, Result>;

/** Creates a memoized selector from 4 input selectors. */
export function createSelector<S, R1, R2, R3, R4, Result>(
    s1: (state: S) => R1,
    s2: (state: S) => R2,
    s3: (state: S) => R3,
    s4: (state: S) => R4,
    resultFn: (r1: R1, r2: R2, r3: R3, r4: R4) => Result,
): MemoizedSelector<S, Result>;

/** Creates a memoized selector from 5 input selectors. */
export function createSelector<S, R1, R2, R3, R4, R5, Result>(
    s1: (state: S) => R1,
    s2: (state: S) => R2,
    s3: (state: S) => R3,
    s4: (state: S) => R4,
    s5: (state: S) => R5,
    resultFn: (r1: R1, r2: R2, r3: R3, r4: R4, r5: R5) => Result,
): MemoizedSelector<S, Result>;

/** Creates a memoized selector from 6 input selectors. */
export function createSelector<S, R1, R2, R3, R4, R5, R6, Result>(
    s1: (state: S) => R1,
    s2: (state: S) => R2,
    s3: (state: S) => R3,
    s4: (state: S) => R4,
    s5: (state: S) => R5,
    s6: (state: S) => R6,
    resultFn: (r1: R1, r2: R2, r3: R3, r4: R4, r5: R5, r6: R6) => Result,
): MemoizedSelector<S, Result>;

/** Creates a memoized selector from 7 input selectors. */
export function createSelector<S, R1, R2, R3, R4, R5, R6, R7, Result>(
    s1: (state: S) => R1,
    s2: (state: S) => R2,
    s3: (state: S) => R3,
    s4: (state: S) => R4,
    s5: (state: S) => R5,
    s6: (state: S) => R6,
    s7: (state: S) => R7,
    resultFn: (r1: R1, r2: R2, r3: R3, r4: R4, r5: R5, r6: R6, r7: R7) => Result,
): MemoizedSelector<S, Result>;

/** Creates a memoized selector from 8 input selectors. */
export function createSelector<S, R1, R2, R3, R4, R5, R6, R7, R8, Result>(
    s1: (state: S) => R1,
    s2: (state: S) => R2,
    s3: (state: S) => R3,
    s4: (state: S) => R4,
    s5: (state: S) => R5,
    s6: (state: S) => R6,
    s7: (state: S) => R7,
    s8: (state: S) => R8,
    resultFn: (r1: R1, r2: R2, r3: R3, r4: R4, r5: R5, r6: R6, r7: R7, r8: R8) => Result,
): MemoizedSelector<S, Result>;

/**
 * Implementation of createSelector with memoization.
 * Supports 1-8 input selectors. The last argument is always the result function.
 */
export function createSelector(...args: any[]): any {
    const resultFn = args.pop();
    const selectors = args as Array<(state: any) => any>;

    let lastInputs: any[] | undefined;
    let lastResult: any;
    let recomputations = 0;

    const memoizedSelector = (state: any): any => {
        const currentInputs = selectors.map(sel => sel(state));

        // Check if inputs changed (referential equality)
        if (lastInputs && currentInputs.length === lastInputs.length) {
            let allEqual = true;
            for (let i = 0; i < currentInputs.length; i++) {
                if (currentInputs[i] !== lastInputs[i]) {
                    allEqual = false;
                    break;
                }
            }

            if (allEqual) {
                return lastResult;
            }
        }

        lastInputs = currentInputs;
        recomputations++;
        lastResult = resultFn(...currentInputs);
        return lastResult;
    };

    /**
     * Resets the memoization cache. Useful in tests or when you need
     * to force recomputation.
     */
    memoizedSelector.release = () => {
        lastInputs = undefined;
        lastResult = undefined;
        recomputations = 0;
    };

    /**
     * Returns the number of times the result function has been recomputed.
     */
    memoizedSelector.recomputations = () => recomputations;

    return memoizedSelector;
}
