/*
 * Public API Surface of store
 */

export * from './ng-redux.module';

// Abstract
export * from './abstract/reducer.abstract';

// Services
export * from './services/ng-redux.service';
export * from './services/dev-tool.service';
export * from './services/sub-store.service';
export * from './services/reducer.service';

// Interfaces
export * from './interfaces/store.interface';
export * from './interfaces/reducer.interface';

// Decorators
export * from './decorators/action.decorator';
export * from './decorators/select.decorator';
export * from './decorators/dispatch.decorator';
export * from './decorators/substore.decorator';

// Components
export * from './components/object.component';

// Angular 21 — Signals integration
export * from './signals/select-signal';
export * from './signals/select-signal.decorator';
export * from './signals/linked-store-signal';

// Angular 21 — Standalone API (provideNgRedux)
export * from './standalone/provide-ng-redux';

// Angular 21 — Zone-less support & zone detection utilities
export * from './zoneless/zoneless-redux';
export {
    isZoneless,
    ChangeDetectionNotifier,
    CHANGE_DETECTION_NOTIFIER,
    ZoneChangeDetectionNotifier,
    ZonelessChangeDetectionNotifier,
    NoopChangeDetectionNotifier,
} from './services/ng-redux.service';

// Angular 21 — Component Store (per-component state slice)
export * from './component-store/component-store';

// Angular 21 — SSR / Hydration
export * from './ssr/hydration';

// Angular 21 — Typed helpers (createAction, createSelector, createActionGroup, createFeatureSelector)
export * from './typed/create-action';
export * from './typed/create-selector';
export * from './typed/create-action-group';
export * from './typed/create-feature-selector';

// Angular 21 — HMR support
export * from './hmr/hmr-support';

// Angular 21 — Test utilities
export * from './testing/test-utils';

// Angular 21 — DevTools metadata
export * from './devtools/devtools-metadata';

// Utilities — Deep freeze for development immutability enforcement
export * from './utils/deep-freeze';

// Entity Adapter — Normalized entity state management
export * from './entity/entity-adapter';

// Lazy Reducer Loading — Dynamic reducer registration for code splitting
export * from './lazy/lazy-reducer';

// Effects — Reactive side-effect management
export * from './effects/rx-effect';

