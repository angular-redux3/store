/**
 * Angular 21 Signal-based @SelectSignal decorator.
 *
 * Works like @Select but returns a Signal<T> instead of Observable<T>.
 */

import { Signal, WritableSignal, signal, DestroyRef, inject, Injector, runInInjectionContext } from '@angular/core';
import { Subscription } from 'rxjs';

import { DecoratorFlagComponent } from '../components/decorator-flag.component';
import { Comparator, Selector } from '../interfaces/store.interface';

/**
 * Property decorator that binds a store selection to an Angular Signal.
 *
 * @example
 * ```typescript
 * import { SelectSignal } from '@angular-redux3/store';
 *
 * @Component({ ... })
 * class MyComponent {
 *     @SelectSignal(['user', 'name']) userName!: Signal<string>;
 *     @SelectSignal(s => s.count) count!: Signal<number>;
 *     @SelectSignal() foo!: Signal<string>; // selects 'foo' from store
 * }
 * ```
 *
 * @param selector A selector function, property name string, or property name path.
 * @param comparator Optional function to determine equality.
 */
export function SelectSignal<T>(
    selector?: Selector<any, T>,
    comparator?: Comparator
): PropertyDecorator {
    return (target: any, name: string | symbol): void => {
        if (!selector) {
            selector = String(name).replace(/Signal\s*$/, '').replace(/\$\s*$/, '');
        }

        const selectorToUse = selector;

        Object.defineProperty(target, name, {
            get(this: any) {
                const cacheKey = `&_SIGNAL_${String(name)}`;

                if (this[cacheKey]) {
                    return this[cacheKey];
                }

                const flagComponent = new DecoratorFlagComponent(this);
                const store = flagComponent.store;

                if (!store) {
                    return undefined;
                }

                const sig: WritableSignal<T> = signal<T>(undefined as any);
                const subscription: Subscription = store.select(selectorToUse, comparator).subscribe(value => {
                    sig.set(value as T);
                });

                this[cacheKey] = sig.asReadonly();

                // Attempt automatic cleanup via DestroyRef if available
                try {
                    const injector = (this as any).__injector ?? inject(Injector);
                    runInInjectionContext(injector, () => {
                        const destroyRef = inject(DestroyRef);
                        destroyRef.onDestroy(() => {
                            subscription.unsubscribe();
                        });
                    });
                } catch {
                    // Fallback: if no injection context, user must manage lifecycle
                }

                return this[cacheKey];
            },
            enumerable: true,
            configurable: true,
        });
    };
}
