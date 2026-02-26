# Angular 21 Features for @angular-redux3/store

This document describes all new features added to `@angular-redux3/store` to take advantage of Angular 21 capabilities.

---

## Table of Contents

1. [Signals Integration](#1-signals-integration)
2. [Standalone API (`provideNgRedux`)](#2-standalone-api)
3. [Zone-less Support](#3-zone-less-support)
4. [Component Store (Per-Component State Slice)](#4-component-store)
5. [SSR / Hydration](#5-ssr--hydration)
6. [Typed Action Creators](#6-typed-action-creators)
7. [Memoized Selectors (`createSelector`)](#7-memoized-selectors)
8. [HMR (Hot Module Replacement) Support](#8-hmr-support)
9. [Test Utilities (TestBed-free)](#9-test-utilities)
10. [DevTools Metadata Tracker](#10-devtools-metadata-tracker)
11. [Action Groups (`createActionGroup`)](#11-action-groups)
12. [Feature Selectors (`createFeatureSelector`)](#12-feature-selectors)
13. [Entity Adapter](#13-entity-adapter)
14. [Deep Freeze (Dev Mode Immutability)](#14-deep-freeze)
15. [Reactive Effects (`rxEffect`)](#15-reactive-effects)
16. [Lazy Reducer Loading](#16-lazy-reducer-loading)
17. [Linked Store Signal](#17-linked-store-signal)
18. [ReducerService Improvements](#18-reducerservice-improvements)

---

## 1. Signals Integration

**File:** `src/signals/select-signal.ts`, `src/signals/select-signal.decorator.ts`

Angular 21 Signals provide a synchronous, zone-less reactive primitive. These utilities bridge Redux state into Angular Signals.

### `selectSignal()`

Creates a readonly `Signal<T>` from a store selector. Auto-cleans up via `DestroyRef`.

```typescript
import { Component, inject, Signal } from '@angular/core';
import { NgRedux, selectSignal } from '@angular-redux3/store';

@Component({
  selector: 'app-counter',
  template: `<p>Count: {{ count() }}</p>`,
  standalone: true,
})
export class CounterComponent {
  private store = inject(NgRedux<IAppState>);
  
  // Function selector
  count: Signal<number> = selectSignal(this.store, state => state.count);
  
  // Property selector
  name: Signal<string> = selectSignal(this.store, 'name');
}
```

### `computedFromStore()`

Creates a derived computed Signal from a store selection + transform function.

```typescript
const items = selectSignal(store, 'items');
const itemCount = computedFromStore(store, 'items', items => items.length);
```

### `storeSignal()`

Convenience function that uses the global store instance (no need to inject the store).

```typescript
const count = storeSignal<number>('count');
```

### `@SelectSignal` Decorator

Property decorator version — works like `@Select` but produces a `Signal<T>`.

```typescript
import { SelectSignal } from '@angular-redux3/store';

@Component({ ... })
class MyComponent {
  @SelectSignal(['user', 'name']) userName!: Signal<string>;
  @SelectSignal(s => s.count) count!: Signal<number>;
  @SelectSignal() foo!: Signal<string>; // selects 'foo' from store
}
```

---

## 2. Standalone API

**File:** `src/standalone/provide-ng-redux.ts`

Eliminates the need for `NgReduxModule` in standalone Angular 21 applications.

### `provideNgRedux()`

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideNgRedux } from '@angular-redux3/store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideNgRedux({
      reducer: rootReducer,
      initialState: INITIAL_STATE,
      middleware: [loggingMiddleware],
      enhancers: [],
      devTools: true,
    })
  ]
};
```

### `provideNgReduxServices()`

Provides only the services without auto-configuring the store (for manual configuration).

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideNgReduxServices(),
  ]
};

// Then in a component:
@Component({ ... })
export class AppComponent {
  constructor(ngRedux: NgRedux<IAppState>) {
    ngRedux.configureStore(rootReducer, INITIAL_STATE);
  }
}
```

---

## 3. Zone-less Support

**File:** `src/zoneless/zoneless-redux.ts`

Enables NgRedux without Zone.js dependency, using `ApplicationRef.tick()` for change detection.

### `provideNgReduxZoneless()`

```typescript
// app.config.ts
import { provideNgReduxZoneless } from '@angular-redux3/store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideNgReduxZoneless({
      reducer: rootReducer,
      initialState: INITIAL_STATE,
      changeDetection: 'tick', // 'tick' | 'noop'
    }),
  ]
};
```

### `ZonelessNgRedux`

A subclass of `NgRedux` that triggers change detection manually after each dispatch.

| Strategy | Behavior |
|----------|----------|
| `'tick'` | Calls `ApplicationRef.tick()` after dispatch |
| `'noop'` | Does nothing — user handles CD manually |

---

## 4. Component Store

**File:** `src/component-store/component-store.ts`

Lightweight per-component state slice backed by the main Redux store.

### `createComponentSlice()`

```typescript
import { Component } from '@angular/core';
import { createComponentSlice } from '@angular-redux3/store';

@Component({ ... })
export class TodoListComponent {
  slice = createComponentSlice({
    key: 'todoList',
    reducer: todoReducer,
    initialState: { items: [], loading: false },
  });

  // Observable API
  items$ = this.slice.select('items');
  
  // Signal API
  loading = this.slice.selectSignal(s => s.loading);

  addTodo(text: string) {
    this.slice.dispatch({ type: 'ADD_TODO', payload: text });
  }
}
```

**Features:**
- Auto-registers a sub-reducer under the given key
- Supports both Observable (`select()`) and Signal (`selectSignal()`) APIs
- Auto-destroys when the component is destroyed (via `DestroyRef`)
- Scoped dispatches — actions are targeted to this slice only

---

## 5. SSR / Hydration

**File:** `src/ssr/hydration.ts`

Seamless server-side rendering with automatic state transfer.

### `provideNgReduxHydration()`

Works for both server and client automatically via Angular's `TransferState`.

```typescript
// app.config.ts (shared between server and client)
import { provideNgReduxHydration } from '@angular-redux3/store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideNgReduxHydration({
      reducer: rootReducer,
      initialState: INITIAL_STATE,
      // Optional custom serialization:
      serializer: state => JSON.stringify(state),
      deserializer: raw => JSON.parse(raw),
    }),
  ]
};
```

### Manual API

```typescript
import { serializeStore, rehydrateState } from '@angular-redux3/store';

// Server side:
const serialized = serializeStore(ngRedux);

// Client side:
const state = rehydrateState(serialized, fallbackState);
```

---

## 6. Typed Action Creators

**File:** `src/typed/create-action.ts`

Type-safe action creation with `match()` type guard.

### `createTypedAction()`

```typescript
import { createTypedAction } from '@angular-redux3/store';

// No-payload action:
const reset = createTypedAction('counter/reset');

// Typed payload action:
const increment = createTypedAction<number>('counter/increment');
const setUser = createTypedAction<{ name: string }>('user/set');

// Dispatching:
store.dispatch(increment(5));  // { type: 'counter/increment', payload: 5 }
store.dispatch(reset());       // { type: 'counter/reset' }

// Type guard in reducer:
function counterReducer(state = 0, action: AnyAction) {
  if (increment.match(action)) {
    return state + action.payload; // payload is typed as number
  }
  if (reset.match(action)) {
    return 0;
  }
  return state;
}
```

### `InferState<R>`

Utility type to infer the state type from a root reducer.

```typescript
const rootReducer = combineReducers({ counter, todos });
type AppState = InferState<typeof rootReducer>;
```

---

## 7. Memoized Selectors

**File:** `src/typed/create-selector.ts`

Composable, memoized selectors with full type inference.

### `createSelector()`

```typescript
import { createSelector } from '@angular-redux3/store';

const selectTodos = (state: AppState) => state.todos;
const selectFilter = (state: AppState) => state.filter;

// 1 input selector:
const selectTodoCount = createSelector(
  selectTodos,
  todos => todos.length,
);

// 2 input selectors:
const selectFilteredTodos = createSelector(
  selectTodos,
  selectFilter,
  (todos, filter) => {
    if (filter === 'completed') return todos.filter(t => t.completed);
    return todos;
  },
);

// Usage with store.select:
const filteredTodos$ = store.select(selectFilteredTodos);

// Or with Signals:
const count = selectSignal(store, selectTodoCount);
```

**Memoization:** The result function is only called when one of the input selectors returns a different reference. This prevents unnecessary recalculations.

---

## 8. HMR Support

**File:** `src/hmr/hmr-support.ts`

Preserves Redux state across hot module replacement cycles.

### Quick Setup

```typescript
import { configureStoreWithHmr } from '@angular-redux3/store';

// Instead of ngRedux.configureStore(...):
configureStoreWithHmr(ngRedux, rootReducer, INITIAL_STATE);
// Automatically saves state before HMR dispose and restores on reload.
```

### Manual API

```typescript
import { saveHmrState, restoreHmrState, hasHmrState, enableHmr } from '@angular-redux3/store';

// Save state before HMR dispose:
saveHmrState(ngRedux);

// Check/restore on module load:
if (hasHmrState()) {
  const saved = restoreHmrState<IAppState>();
  ngRedux.configureStore(rootReducer, saved!);
} else {
  ngRedux.configureStore(rootReducer, INITIAL_STATE);
}

// Auto-setup:
enableHmr(ngRedux);
```

---

## 9. Test Utilities

**File:** `src/testing/test-utils.ts`

TestBed-free testing helpers for fast, lightweight unit tests.

### `createTestStore()`

```typescript
import { createTestStore } from '@angular-redux3/store';

describe('MyComponent', () => {
  let store: TestNgRedux<IAppState>;

  beforeEach(() => {
    store = createTestStore({
      reducer: rootReducer,
      initialState: { count: 0 },
    });
  });

  it('should increment', () => {
    store.dispatch({ type: 'INCREMENT' });
    expect(store.getState().count).toBe(1);
  });

  it('should support dispatchAndGetState', () => {
    const state = store.dispatchAndGetState({ type: 'INCREMENT' });
    expect(state.count).toBe(1);
  });

  it('should support selectSnapshot', () => {
    store.dispatch({ type: 'SET_NAME', payload: 'Alice' });
    expect(store.selectSnapshot(s => s.name)).toBe('Alice');
  });

  it('should support setState for test setup', () => {
    store.setState({ count: 99, name: 'override' });
    expect(store.getState().count).toBe(99);
  });
});
```

### `createSpyStore()`

Tracks all dispatched actions for assertion.

```typescript
import { createSpyStore } from '@angular-redux3/store';

const { store, dispatched, lastAction, reset } = createSpyStore({
  reducer: rootReducer,
  initialState: DEFAULT_STATE,
});

myService.doSomething();

expect(dispatched()).toContainEqual({ type: 'EXPECTED_ACTION' });
expect(lastAction()?.type).toBe('EXPECTED_ACTION');

reset(); // Clear tracked actions
```

### `createSelectorStub()`

```typescript
import { createSelectorStub } from '@angular-redux3/store';

const stub = createSelectorStub<string>();
stub.next('Test Name');

stub.subscribe(value => {
  expect(value).toBe('Test Name');
});
```

---

## 10. DevTools Metadata Tracker

**File:** `src/devtools/devtools-metadata.ts`

Rich debugging metadata for Redux store operations.

### `StoreActionTracker`

```typescript
import { StoreActionTracker } from '@angular-redux3/store';

const tracker = new StoreActionTracker(ngRedux);
tracker.enable();

// After some dispatches:
const info = tracker.getInfo();
console.log(info.actionCount);      // 42
console.log(info.lastActionType);   // 'INCREMENT'
console.log(info.stateSize);        // ~1024 (bytes)
console.log(info.actionHistory);    // ['INCREMENT', 'SET_NAME', ...]

// As a Signal (reactive):
const infoSignal = tracker.getInfoSignal();
// Use in template: {{ infoSignal().actionCount }}

// Console output:
tracker.logInfo();
// 📊 @angular-redux3/store DevTools Info
//   Actions dispatched: 42
//   Last action: INCREMENT
//   State size: ~1024 bytes

// Cleanup:
tracker.disable();
tracker.reset();
```

---

## Migration Guide

### From NgReduxModule to Standalone

**Before (NgModule):**
```typescript
@NgModule({
  imports: [NgReduxModule],
})
export class AppModule {
  constructor(ngRedux: NgRedux<IAppState>) {
    ngRedux.configureStore(rootReducer, INITIAL_STATE);
  }
}
```

**After (Standalone):**
```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideNgRedux({
      reducer: rootReducer,
      initialState: INITIAL_STATE,
    })
  ]
};

// main.ts
bootstrapApplication(AppComponent, appConfig);
```

### From @Select to @SelectSignal

**Before:**
```typescript
@Select('count') count$!: Observable<number>;

// In template:
{{ count$ | async }}
```

**After:**
```typescript
@SelectSignal('count') count!: Signal<number>;

// In template (no pipe needed!):
{{ count() }}
```

### From RxJS-only to Signals + RxJS

Both APIs coexist — you can migrate gradually:

```typescript
@Component({ ... })
export class MyComponent {
  // Old way (still works):
  @Select('count') count$!: Observable<number>;
  
  // New way:
  count = selectSignal(this.store, 'count');
}
```

---

## File Structure

```
src/
├── signals/
│   ├── select-signal.ts           # selectSignal(), computedFromStore(), storeSignal()
│   └── select-signal.decorator.ts # @SelectSignal decorator
├── standalone/
│   └── provide-ng-redux.ts        # provideNgRedux(), provideNgReduxServices()
├── zoneless/
│   └── zoneless-redux.ts          # ZonelessNgRedux, provideNgReduxZoneless()
├── component-store/
│   └── component-store.ts         # ComponentStoreSlice, createComponentSlice()
├── ssr/
│   └── hydration.ts               # serializeStore(), rehydrateState(), provideNgReduxHydration()
├── typed/
│   ├── create-action.ts           # createTypedAction(), InferState<R>
│   ├── create-selector.ts         # createSelector() with memoization (up to 8 inputs)
│   ├── create-action-group.ts     # createActionGroup() for batch action creation
│   └── create-feature-selector.ts # createFeatureSelector() for type-safe feature access
├── hmr/
│   └── hmr-support.ts             # saveHmrState(), restoreHmrState(), configureStoreWithHmr()
├── testing/
│   └── test-utils.ts              # createTestStore(), createSpyStore(), createSelectorStub()
├── devtools/
│   └── devtools-metadata.ts       # StoreActionTracker
├── utils/
│   └── deep-freeze.ts             # deepFreeze(), enableStateFreezing(), conditionalFreeze()
├── entity/
│   └── entity-adapter.ts          # createEntityAdapter(), EntityState, EntityAdapter
├── lazy/
│   └── lazy-reducer.ts            # loadReducer(), ReducerRegistry, configureStoreWithLazyReducers()
├── effects/
│   └── rx-effect.ts               # rxEffect(), rxActionEffect()
└── specs/
    ├── typed/
    │   ├── create-action.spec.ts
    │   ├── create-selector.spec.ts
    │   ├── create-action-group.spec.ts
    │   └── create-feature-selector.spec.ts
    ├── hmr/
    │   └── hmr-support.spec.ts
    ├── testing/
    │   └── test-utils.spec.ts
    ├── ssr/
    │   └── hydration.spec.ts
    ├── devtools/
    │   └── devtools-metadata.spec.ts
    ├── zoneless/
    │   └── zoneless-redux.spec.ts
    ├── standalone/
    │   └── provide-ng-redux.spec.ts
    ├── component-store/
    │   └── component-store.spec.ts
    ├── entity/
    │   └── entity-adapter.spec.ts
    ├── utils/
    │   └── deep-freeze.spec.ts
    ├── effects/
    │   └── rx-effect.spec.ts
    ├── lazy/
    │   └── lazy-reducer.spec.ts
    └── services/
        └── reducer-service.spec.ts
```

---

## 11. Action Groups

**File:** `src/typed/create-action-group.ts`

Create groups of related actions with a shared source prefix — inspired by NgRx's `createActionGroup`.

```typescript
import { createActionGroup } from '@angular-redux3/store';

const TodoActions = createActionGroup({
  source: 'Todos',
  events: {
    'Load Todos': void 0 as void,
    'Add Todo': '' as string,
    'Remove Todo': 0 as number,
    'Toggle Todo': 0 as number,
  }
});

// Dispatch:
store.dispatch(TodoActions['Load Todos']());
// { type: '[Todos] Load Todos' }

store.dispatch(TodoActions['Add Todo']('Buy milk'));
// { type: '[Todos] Add Todo', payload: 'Buy milk' }

// Each creator has a .type property:
console.log(TodoActions['Add Todo'].type);
// '[Todos] Add Todo'
```

---

## 12. Feature Selectors

**File:** `src/typed/create-feature-selector.ts`

Type-safe selectors for top-level state features, composable with `createSelector`.

```typescript
import { createFeatureSelector, createFeaturePropertySelector, createSelector } from '@angular-redux3/store';

interface AppState {
  auth: AuthState;
  todos: TodoState;
}

const selectAuth = createFeatureSelector<AppState, 'auth'>('auth');
const selectTodos = createFeatureSelector<AppState, 'todos'>('todos');

// Compose with createSelector:
const selectIsLoggedIn = createSelector(selectAuth, auth => auth.isLoggedIn);

// Or use createFeaturePropertySelector for nested access:
const selectToken = createFeaturePropertySelector(selectAuth, 'token');

// Use with store.select():
const auth$ = store.select(selectAuth);
const token$ = store.select(selectToken);
```

---

## 13. Entity Adapter

**File:** `src/entity/entity-adapter.ts`

Normalized entity state management — CRUD operations on collections indexed by ID.

```typescript
import { createEntityAdapter, EntityState } from '@angular-redux3/store';

interface User {
  id: number;
  name: string;
  email: string;
}

const userAdapter = createEntityAdapter<User>({
  selectId: user => user.id,
  sortComparer: (a, b) => a.name.localeCompare(b.name),
});

// Initial state:
const initialState = userAdapter.getInitialState({ loading: false });
// { ids: [], entities: {}, loading: false }

// In a reducer:
function userReducer(state = initialState, action: AnyAction) {
  switch (action.type) {
    case 'ADD_USER':
      return userAdapter.addOne(state, action.payload);
    case 'SET_USERS':
      return userAdapter.setAll(state, action.payload);
    case 'UPDATE_USER':
      return userAdapter.updateOne(state, action.payload);
    case 'REMOVE_USER':
      return userAdapter.removeOne(state, action.payload);
    default:
      return state;
  }
}

// Built-in selectors:
const { selectAll, selectTotal, selectIds, selectEntities } = userAdapter.getSelectors();

// Feature-scoped selectors:
const { selectAll: selectAllUsers } = userAdapter.getSelectors(
  (state: AppState) => state.users
);
```

**CRUD Methods:** `addOne`, `addMany`, `setAll`, `setOne`, `removeOne`, `removeMany`, `removeAll`, `updateOne`, `updateMany`, `upsertOne`, `upsertMany`

---

## 14. Deep Freeze

**File:** `src/utils/deep-freeze.ts`

Enforce state immutability in development by recursively freezing state objects.

```typescript
import { enableStateFreezing, deepFreeze } from '@angular-redux3/store';
import { isDevMode } from '@angular/core';

// Enable globally in dev mode:
if (isDevMode()) {
  enableStateFreezing({ enabled: true });
}

// Or freeze manually:
const frozenState = deepFreeze({ count: 0, nested: { value: 1 } });
frozenState.count = 5; // throws TypeError in strict mode!
```

---

## 15. Reactive Effects (`rxEffect`)

**File:** `src/effects/rx-effect.ts`

Declarative side-effect management tied to store state changes — with auto-cleanup, configurable concurrency, and error recovery.

### `rxEffect()` — State-based effects

```typescript
import { rxEffect } from '@angular-redux3/store';

@Component({ ... })
export class UserComponent {
  private loadUser = rxEffect(
    this.store,
    state => state.selectedUserId,
    userId => this.userService.loadUser(userId).pipe(
      tap(user => this.store.dispatch({ type: 'USER_LOADED', payload: user })),
    ),
    { concurrency: 'switch' }  // 'switch' | 'merge' | 'exhaust' | 'concat'
  );

  constructor(private store: NgRedux<AppState>, private userService: UserService) {}
}
```

### `rxActionEffect()` — Action-based effects

```typescript
import { rxActionEffect } from '@angular-redux3/store';

const effect = rxActionEffect(
  store,
  ['FETCH_USERS', 'REFRESH_USERS'],
  action => userService.fetchUsers().pipe(
    map(users => ({ type: 'USERS_LOADED', payload: users })),
    tap(resultAction => store.dispatch(resultAction)),
  ),
);

// Manual cleanup:
effect.destroy();
```

---

## 16. Lazy Reducer Loading

**File:** `src/lazy/lazy-reducer.ts`

Dynamically register reducers at runtime for code-splitting and lazy-loaded modules.

```typescript
import { loadReducer, configureStoreWithLazyReducers } from '@angular-redux3/store';

// Option 1: Manual lazy loading in a component
@Component({ ... })
export class AdminComponent implements OnInit, OnDestroy {
  private unloadReducer?: () => void;

  constructor(private store: NgRedux<AppState>) {}

  ngOnInit() {
    this.unloadReducer = loadReducer('admin', adminReducer, this.store);
  }

  ngOnDestroy() {
    this.unloadReducer?.(); // Unregisters the reducer
  }
}

// Option 2: Auto-registration via configureStoreWithLazyReducers
configureStoreWithLazyReducers(ngRedux, baseRootReducer, INITIAL_STATE);
// Then in lazy modules:
loadReducer('feature', featureReducer, ngRedux);
```

---

## 17. Linked Store Signal

**File:** `src/signals/linked-store-signal.ts`

Two-way signals linked to the Redux store — supports optimistic UI updates.

### `linkedStoreSignal()`

```typescript
import { linkedStoreSignal } from '@angular-redux3/store';

@Component({ ... })
export class TodoItemComponent {
  // Two-way binding: reads from store, can write locally
  title = linkedStoreSignal<AppState, string>(
    this.store,
    state => state.todo.title,
  );

  onEdit(newTitle: string) {
    this.title.set(newTitle); // Local optimistic update
  }

  onSave() {
    this.store.dispatch({ type: 'UPDATE_TITLE', payload: this.title() });
    // When store emits, title resets to the store value
  }
}
```

### `overridableStoreSignal()`

```typescript
import { overridableStoreSignal } from '@angular-redux3/store';

@Component({ ... })
export class FormComponent {
  private field = overridableStoreSignal(this.store, s => s.fieldValue);

  get value() { return this.field.value; }
  get isOverridden() { return this.field.isOverridden; }

  onLocalEdit(val: string) {
    this.field.override(val);
  }

  onReset() {
    this.field.clearOverride(); // Reverts to store value
  }
}
```

---

## 18. ReducerService Improvements

**File:** `src/services/reducer.service.ts`

### `ReducerService.reset()`

Resets the singleton for clean test isolation:

```typescript
afterEach(() => {
  ReducerService.reset();
});
```

### `unregisterSubReducer(hash)`

Cleans up sub-reducers when components/modules are destroyed:

```typescript
const service = ReducerService.getInstance();
service.unregisterSubReducer(hashReducer); // Returns true if found
```

### `getSubReducerCount()`

Monitor registered sub-reducers:

```typescript
console.log(ReducerService.getInstance().getSubReducerCount());
```

### Improved Proxy safety

`shouldCreateProxyForProperty` now correctly skips `Map`, `Set`, `WeakMap`, `WeakSet`, `RegExp`, `ArrayBuffer`, `SharedArrayBuffer`, typed arrays, `Error`, and `Promise` — preventing runtime crashes when these types appear in state.

### Enhanced `createSelector`

Now supports up to **8 input selectors** (previously 3), plus:

```typescript
const selector = createSelector(s1, s2, s3, s4, resultFn);

// New utility methods:
selector.release();         // Clear memoization cache
selector.recomputations();  // Number of times result fn was called
```
