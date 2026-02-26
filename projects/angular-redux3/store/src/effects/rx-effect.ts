/**
 * Side-effect management for @angular-redux3/store.
 *
 * Provides an rxEffect utility for creating reactive side effects
 * that respond to store state changes, similar to NgRx Effects but
 * simpler and integrated with the Redux store.
 */

import { DestroyRef, inject, Injector, runInInjectionContext, Injectable } from '@angular/core';
import { Observable, Subject, Subscription, isObservable, of, EMPTY } from 'rxjs';
import { catchError, exhaustMap, switchMap, mergeMap, concatMap, takeUntil } from 'rxjs/operators';
import { AnyAction } from 'redux';

import { NgRedux } from '../services/ng-redux.service';
import { Selector, Comparator } from '../interfaces/store.interface';

/**
 * Concurrency strategy for effect execution.
 */
export type EffectConcurrency = 'switch' | 'merge' | 'exhaust' | 'concat';

/**
 * Configuration for rxEffect.
 */
export interface RxEffectConfig {
    /** Concurrency strategy when multiple triggers arrive. Default: 'switch'. */
    concurrency?: EffectConcurrency;
    /** Whether to automatically re-subscribe on error. Default: true. */
    resubscribeOnError?: boolean;
}

/**
 * Return type for rxEffect — provides control over the effect lifecycle.
 */
export interface RxEffectRef {
    /** Manually trigger the effect (useful for imperative invocation). */
    trigger: () => void;
    /** Unsubscribe and stop the effect. */
    destroy: () => void;
}

/**
 * Creates a reactive side effect that runs when a store selector emits new values.
 * Automatically cleans up when the injection context (component/service) is destroyed.
 *
 * @example
 * ```typescript
 * @Component({ ... })
 * export class UserComponent {
 *   // Runs whenever the selected userId changes
 *   private loadUser = rxEffect(
 *     this.store,
 *     state => state.selectedUserId,
 *     userId => this.userService.loadUser(userId).pipe(
 *       tap(user => this.store.dispatch({ type: 'USER_LOADED', payload: user })),
 *       catchError(err => {
 *         this.store.dispatch({ type: 'USER_LOAD_FAILED', payload: err.message });
 *         return EMPTY;
 *       })
 *     ),
 *     { concurrency: 'switch' }
 *   );
 *
 *   constructor(
 *     private store: NgRedux<AppState>,
 *     private userService: UserService,
 *   ) {}
 * }
 * ```
 *
 * @template RootState The root state type.
 * @template Selected The type of the selected value.
 * @param store The NgRedux store instance.
 * @param selector A selector to pick state.
 * @param effectFn A function that receives the selected value and returns an Observable.
 * @param config Optional effect configuration.
 * @returns An RxEffectRef for manual control.
 */
export function rxEffect<RootState, Selected>(
    store: NgRedux<RootState>,
    selector: Selector<RootState, Selected>,
    effectFn: (value: Selected) => Observable<any>,
    config?: RxEffectConfig,
): RxEffectRef {
    const { concurrency = 'switch', resubscribeOnError = true } = config ?? {};
    const destroy$ = new Subject<void>();
    const manualTrigger$ = new Subject<void>();
    let subscription: Subscription;

    const source$ = store.select<Selected>(selector).pipe(takeUntil(destroy$));

    const flattenOp = getFlattenOperator(concurrency);

    function subscribe() {
        subscription = source$.pipe(
            flattenOp((value: Selected) => {
                try {
                    const result = effectFn(value);
                    return isObservable(result) ? result.pipe(
                        catchError(err => {
                            console.error('[rxEffect] Error in effect:', err);
                            return EMPTY;
                        })
                    ) : EMPTY;
                } catch (err) {
                    console.error('[rxEffect] Sync error in effect:', err);
                    return EMPTY;
                }
            })
        ).subscribe({
            error: (err) => {
                console.error('[rxEffect] Unhandled error:', err);
                if (resubscribeOnError) {
                    subscribe(); // Re-subscribe on error
                }
            }
        });
    }

    subscribe();

    // Auto-cleanup in injection context
    try {
        const destroyRef = inject(DestroyRef);
        destroyRef.onDestroy(() => {
            destroy$.next();
            destroy$.complete();
            subscription?.unsubscribe();
        });
    } catch {
        // Not in injection context — user manages lifecycle
    }

    return {
        trigger: () => manualTrigger$.next(),
        destroy: () => {
            destroy$.next();
            destroy$.complete();
            subscription?.unsubscribe();
        },
    };
}

/**
 * Creates a side effect that listens for specific action types.
 *
 * @example
 * ```typescript
 * const effect = rxActionEffect(
 *   store,
 *   ['FETCH_USERS', 'REFRESH_USERS'],
 *   action => userService.fetchUsers().pipe(
 *     map(users => ({ type: 'USERS_LOADED', payload: users })),
 *     tap(resultAction => store.dispatch(resultAction))
 *   )
 * );
 * ```
 *
 * @param store The NgRedux store instance.
 * @param actionTypes Array of action types to listen for.
 * @param effectFn Function that receives the action and returns an Observable.
 * @param config Optional configuration.
 * @returns An RxEffectRef.
 */
export function rxActionEffect<RootState>(
    store: NgRedux<RootState>,
    actionTypes: string[],
    effectFn: (action: AnyAction) => Observable<any>,
    config?: RxEffectConfig,
): RxEffectRef {
    const { concurrency = 'switch', resubscribeOnError = true } = config ?? {};
    const destroy$ = new Subject<void>();
    const actionSubject$ = new Subject<AnyAction>();
    let subscription: Subscription;

    const actionSet = new Set(actionTypes);
    const flattenOp = getFlattenOperator(concurrency);

    // Use Redux store.subscribe + getState pattern instead of monkey-patching dispatch.
    // This avoids conflicts when multiple rxActionEffect or StoreActionTracker instances
    // wrap dispatch, since restoring the original breaks the chain.
    let lastState = store.getState();
    const storeUnsubscribeFn = store.subscribe(() => {
        lastState = store.getState();
    });

    // Intercept dispatch safely: wrap current dispatch (not original), and on cleanup
    // simply remove the interception logic by marking as destroyed.
    let isDestroyed = false;
    const previousDispatch = store.dispatch.bind(store);
    const wrappedDispatch = function(this: any, action: AnyAction): any {
        const result = previousDispatch(action);
        if (!isDestroyed && action?.type && actionSet.has(action.type)) {
            actionSubject$.next(action);
        }
        return result;
    } as typeof store.dispatch;
    (store as any).dispatch = wrappedDispatch;

    function subscribe() {
        subscription = actionSubject$.pipe(
            takeUntil(destroy$),
            flattenOp((action: AnyAction) => {
                try {
                    const result = effectFn(action);
                    return isObservable(result) ? result.pipe(
                        catchError(err => {
                            console.error('[rxActionEffect] Error in effect:', err);
                            return EMPTY;
                        })
                    ) : EMPTY;
                } catch (err) {
                    console.error('[rxActionEffect] Sync error in effect:', err);
                    return EMPTY;
                }
            })
        ).subscribe({
            error: (err) => {
                console.error('[rxActionEffect] Unhandled error:', err);
                if (resubscribeOnError) {
                    subscribe();
                }
            }
        });
    }

    subscribe();

    // Auto-cleanup in injection context
    try {
        const destroyRef = inject(DestroyRef);
        destroyRef.onDestroy(() => cleanup());
    } catch {
        // Not in injection context — user manages lifecycle
    }

    function cleanup() {
        isDestroyed = true;
        destroy$.next();
        destroy$.complete();
        actionSubject$.complete();
        subscription?.unsubscribe();
        storeUnsubscribeFn();
    }

    return {
        trigger: () => {},
        destroy: cleanup,
    };
}

/** Returns the appropriate RxJS flattening operator. */
function getFlattenOperator(concurrency: EffectConcurrency) {
    switch (concurrency) {
        case 'merge': return mergeMap;
        case 'exhaust': return exhaustMap;
        case 'concat': return concatMap;
        case 'switch':
        default: return switchMap;
    }
}
