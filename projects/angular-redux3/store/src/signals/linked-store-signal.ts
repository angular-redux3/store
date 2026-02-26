/**
 * Angular 21 linkedSignal integration for @angular-redux3/store.
 *
 * Provides a two-way signal that reads from the store but can also be
 * written to locally (optimistic updates), and resets when the store
 * value changes. This bridges Angular's `linkedSignal` concept with Redux.
 */

import {
    Signal,
    WritableSignal,
    signal,
    computed,
    effect,
    DestroyRef,
    inject,
    Injector,
    runInInjectionContext,
} from '@angular/core';
import { Subscription } from 'rxjs';

import { AbstractStore } from '../abstract/store.abstract';
import { NgRedux } from '../services/ng-redux.service';
import { Selector, Comparator } from '../interfaces/store.interface';

/**
 * Options for linkedStoreSignal.
 */
export interface LinkedStoreSignalOptions<T> {
    /** Optional comparator for custom equality checks. */
    comparator?: Comparator;
    /** Optional transform applied after reading from store. */
    transform?: (storeValue: T) => T;
    /** Optional injector for manual injection context. */
    injector?: Injector;
}

/**
 * A writable signal that is linked to a store selector.
 * - Reads from the store and updates reactively.
 * - Can be written to locally (e.g., for optimistic UI updates).
 * - Resets to the store value whenever the store emits a new value.
 *
 * This is conceptually similar to Angular's `linkedSignal()` but
 * connected to the Redux store.
 *
 * @example
 * ```typescript
 * @Component({ ... })
 * export class TodoItemComponent {
 *   // Two-way binding to store: reads from store, can write locally
 *   title = linkedStoreSignal<AppState, string>(
 *     this.store,
 *     state => state.todo.title
 *   );
 *
 *   // Local edit (optimistic update)
 *   onEdit(newTitle: string) {
 *     this.title.set(newTitle);
 *   }
 *
 *   // When the store dispatches and the state changes,
 *   // title will automatically reset to the store value
 *   onSave() {
 *     this.store.dispatch({ type: 'UPDATE_TITLE', payload: this.title() });
 *   }
 * }
 * ```
 *
 * @template RootState The root state type.
 * @template T The type of the selected value.
 * @param store The store instance.
 * @param selector A selector to pick state.
 * @param options Optional configuration.
 * @returns A WritableSignal<T> linked to the store.
 */
export function linkedStoreSignal<RootState, T>(
    store: AbstractStore<RootState>,
    selector: Selector<RootState, T>,
    options?: LinkedStoreSignalOptions<T>
): WritableSignal<T> {
    const { comparator, transform, injector } = options ?? {};
    const currentInjector = injector ?? inject(Injector);
    const sig = signal<T>(undefined as any);
    let subscription: Subscription;

    runInInjectionContext(currentInjector, () => {
        subscription = store.select<T>(selector, comparator).subscribe(value => {
            const finalValue = transform ? transform(value) : value;
            sig.set(finalValue);
        });

        const destroyRef = inject(DestroyRef);
        destroyRef.onDestroy(() => {
            subscription?.unsubscribe();
        });
    });

    return sig;
}

/**
 * Creates a computed signal that derives from the store but allows
 * an override value to be set temporarily. When the store value changes,
 * the override is cleared.
 *
 * @example
 * ```typescript
 * const count = overridableStoreSignal(store, 'count');
 * // count() reads from store
 *
 * count.override(42);
 * // count() now returns 42
 *
 * // When store emits a new 'count' value, override is cleared
 * ```
 *
 * @template RootState The root state type.
 * @template T The type of the selected value.
 * @param store The store instance.
 * @param selector A selector to pick state.
 * @param options Optional configuration.
 * @returns An object with a readonly signal and override/clear methods.
 */
export function overridableStoreSignal<RootState, T>(
    store: AbstractStore<RootState>,
    selector: Selector<RootState, T>,
    options?: LinkedStoreSignalOptions<T>
): {
    readonly value: Signal<T>;
    override: (value: T) => void;
    clearOverride: () => void;
    isOverridden: Signal<boolean>;
} {
    const { comparator, transform, injector } = options ?? {};
    const currentInjector = injector ?? inject(Injector);

    const storeValue = signal<T>(undefined as any);
    const overrideValue = signal<T | undefined>(undefined);
    const hasOverride = signal(false);

    let subscription: Subscription;

    runInInjectionContext(currentInjector, () => {
        subscription = store.select<T>(selector, comparator).subscribe(value => {
            const finalValue = transform ? transform(value) : value;
            storeValue.set(finalValue);
            // Clear override when store value changes
            overrideValue.set(undefined);
            hasOverride.set(false);
        });

        const destroyRef = inject(DestroyRef);
        destroyRef.onDestroy(() => {
            subscription?.unsubscribe();
        });
    });

    const value = computed(() => {
        if (hasOverride()) {
            return overrideValue() as T;
        }
        return storeValue();
    });

    return {
        value,
        override: (val: T) => {
            overrideValue.set(val);
            hasOverride.set(true);
        },
        clearOverride: () => {
            overrideValue.set(undefined);
            hasOverride.set(false);
        },
        isOverridden: hasOverride.asReadonly(),
    };
}
