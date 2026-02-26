/**
 * Angular 21 Signals integration for @angular-redux3/store.
 *
 * Provides reactive state selection using Angular Signals instead of RxJS Observables.
 * This enables zone-less change detection and better integration with Angular's
 * new reactivity model.
 */

import { Signal, WritableSignal, signal, computed, DestroyRef, inject, Injector, runInInjectionContext } from '@angular/core';
import { Selector, Comparator } from '../interfaces/store.interface';
import { AbstractStore } from '../abstract/store.abstract';
import { NgRedux } from '../services/ng-redux.service';
import { Subscription } from 'rxjs';

/**
 * Creates a Signal from a store selector. The signal will automatically
 * update when the selected slice of state changes. Automatically cleans up
 * when the injection context (component/service) is destroyed.
 *
 * @example
 * ```typescript
 * @Component({ ... })
 * export class CounterComponent {
 *   private store = inject(NgRedux<IAppState>);
 *   count = selectSignal<IAppState, number>(this.store, 'count');
 *
 *   // Or with a function selector:
 *   doubleCount = selectSignal(this.store, state => state.count * 2);
 * }
 * ```
 *
 * @template RootState The root state type of the store.
 * @template T The type of the selected value.
 * @param store The NgRedux store or SubStore instance.
 * @param selector A selector (property, path, or function) to pick state.
 * @param comparator Optional comparator for custom equality checks.
 * @param injector Optional injector for manual injection context.
 * @returns A readonly Signal<T> that reflects the selected state.
 */
export function selectSignal<RootState, T>(
    store: AbstractStore<RootState>,
    selector?: Selector<RootState, T>,
    comparator?: Comparator,
    injector?: Injector
): Signal<T> {
    const currentInjector = injector ?? inject(Injector);
    const sig: WritableSignal<T> = signal<T>(undefined as any);
    let subscription: Subscription;

    runInInjectionContext(currentInjector, () => {
        subscription = store.select<T>(selector, comparator).subscribe(value => {
            sig.set(value);
        });

        const destroyRef = inject(DestroyRef);
        destroyRef.onDestroy(() => {
            subscription?.unsubscribe();
        });
    });

    return sig.asReadonly();
}

/**
 * Creates a computed Signal derived from a store selector and a transform function.
 *
 * @example
 * ```typescript
 * const items = selectSignal(store, 'items');
 * const itemCount = computedFromStore(store, 'items', items => items.length);
 * ```
 *
 * @template RootState The root state type.
 * @template Selected The selected state type.
 * @template Result The computed result type.
 * @param store The store instance.
 * @param selector The selector to pick state.
 * @param transform A pure function to transform the selected value.
 * @param comparator Optional comparator for equality checks.
 * @param injector Optional injector for manual injection context.
 * @returns A readonly Signal<Result>.
 */
export function computedFromStore<RootState, Selected, Result>(
    store: AbstractStore<RootState>,
    selector: Selector<RootState, Selected>,
    transform: (value: Selected) => Result,
    comparator?: Comparator,
    injector?: Injector
): Signal<Result> {
    const base = selectSignal<RootState, Selected>(store, selector, comparator, injector);
    return computed(() => transform(base()));
}

/**
 * Convenience method added to NgRedux for selecting state as a Signal.
 * This is a standalone function that can also be imported directly.
 *
 * @example
 * ```typescript
 * // Inside an injection context (component constructor, field initializer, etc.)
 * const count = storeSignal<number>('count');
 * ```
 *
 * @template T The selected value type.
 * @param selector A selector to pick state from the root store.
 * @param comparator Optional comparator for equality checks.
 * @returns A readonly Signal<T>.
 */
export function storeSignal<T>(
    selector?: Selector<any, T>,
    comparator?: Comparator
): Signal<T> {
    const store = NgRedux.store;
    return selectSignal<any, T>(store, selector, comparator);
}
