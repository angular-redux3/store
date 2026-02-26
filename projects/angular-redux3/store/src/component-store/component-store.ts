/**
 * Component Store (lightweight per-component state slice).
 *
 * Provides a mechanism to create small, localized state slices tied
 * to a component's lifecycle, backed by the main Redux store.
 * Similar in concept to @ngrx/component-store but integrated with Redux.
 */

import { DestroyRef, inject, Injector, runInInjectionContext, signal, Signal, WritableSignal } from '@angular/core';
import { Reducer, AnyAction } from 'redux';
import { Observable, Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs';

import { NgRedux } from '../services/ng-redux.service';
import { SubStoreService } from '../services/sub-store.service';
import { ReducerService } from '../services/reducer.service';
import { PathSelector, Selector, Comparator } from '../interfaces/store.interface';

/**
 * Configuration for creating a component store slice.
 */
export interface ComponentSliceConfig<SliceState> {
    /** Unique key to register this slice under in the root state. */
    key: string;
    /** Reducer function for this slice. */
    reducer: Reducer<SliceState>;
    /** Initial state for this slice. */
    initialState: SliceState;
    /** Optional: additional path segments for nesting. */
    basePath?: PathSelector;
}

/**
 * A lightweight component-scoped store slice that registers a sub-reducer
 * on creation and unregisters on component destroy.
 *
 * @example
 * ```typescript
 * @Component({ ... })
 * export class TodoListComponent implements OnInit {
 *   private slice = createComponentSlice({
 *     key: 'todoList',
 *     reducer: todoReducer,
 *     initialState: { items: [], loading: false },
 *   });
 *
 *   items$ = this.slice.select('items');
 *   loading = this.slice.selectSignal(s => s.loading);
 *
 *   addTodo(text: string) {
 *     this.slice.dispatch({ type: 'ADD_TODO', payload: text });
 *   }
 * }
 * ```
 *
 * @template SliceState The type of this slice's state.
 */
export class ComponentStoreSlice<SliceState> {
    private subStore: SubStoreService<SliceState>;
    private subscriptions: Subscription[] = [];
    private readonly path: PathSelector;

    constructor(
        private config: ComponentSliceConfig<SliceState>,
        private rootStore: NgRedux<any>,
        private destroyRef?: DestroyRef,
    ) {
        this.path = config.basePath
            ? [...config.basePath, config.key]
            : [config.key];

        // Initialize slice state if not present
        const currentState = rootStore.getState();
        if (!this.getNestedValue(currentState, this.path)) {
            rootStore.dispatch({
                type: `@@COMPONENT_STORE/INIT/${config.key}`,
                payload: config.initialState,
            });
        }

        // Create a sub-store for this slice
        this.subStore = rootStore.configureSubStore<SliceState>(this.path, config.reducer);

        // Auto-cleanup on destroy
        if (this.destroyRef) {
            this.destroyRef.onDestroy(() => {
                this.destroy();
            });
        }
    }

    /**
     * Select an observable from the component slice.
     */
    select<T>(selector?: Selector<SliceState, T>, comparator?: Comparator): Observable<T> {
        return this.subStore.select(selector, comparator);
    }

    /**
     * Select a Signal from the component slice.
     */
    selectSignal<T>(selector?: Selector<SliceState, T>, comparator?: Comparator): Signal<T> {
        const sig: WritableSignal<T> = signal<T>(undefined as any);
        const sub = this.subStore.select(selector, comparator).subscribe(value => {
            sig.set(value);
        });
        this.subscriptions.push(sub);
        return sig.asReadonly();
    }

    /**
     * Get the current state of this slice.
     */
    getState(): SliceState {
        return this.subStore.getState();
    }

    /**
     * Dispatch an action scoped to this slice.
     */
    dispatch(action: AnyAction): AnyAction {
        return this.subStore.dispatch(action);
    }

    /**
     * Manually destroy and clean up this slice.
     */
    destroy(): void {
        this.subscriptions.forEach(s => s.unsubscribe());
        this.subscriptions = [];
    }

    private getNestedValue(obj: any, path: PathSelector): any {
        return path.reduce((current: any, key) => current?.[key], obj);
    }
}

/**
 * Factory function to create a component store slice.
 * Must be called within an Angular injection context (constructor, field initializer).
 *
 * @example
 * ```typescript
 * @Component({ ... })
 * export class MyComponent {
 *   slice = createComponentSlice({
 *     key: 'myComponent',
 *     reducer: myReducer,
 *     initialState: { value: 0 }
 *   });
 *
 *   value$ = this.slice.select('value');
 * }
 * ```
 *
 * @param config Configuration for the component slice.
 * @returns A ComponentStoreSlice instance.
 */
export function createComponentSlice<SliceState>(
    config: ComponentSliceConfig<SliceState>
): ComponentStoreSlice<SliceState> {
    const rootStore = NgRedux.store as NgRedux<any>;
    let destroyRef: DestroyRef | undefined;

    try {
        destroyRef = inject(DestroyRef);
    } catch {
        // No injection context — user manages lifecycle
    }

    return new ComponentStoreSlice(config, rootStore, destroyRef);
}
