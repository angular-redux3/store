/**
 * Enhanced DevTools integration for @angular-redux3/store.
 *
 * Provides richer metadata for Redux DevTools and potential integration
 * points for Angular DevTools.
 */

import { NgRedux } from '../services/ng-redux.service';
import { Signal, signal, WritableSignal } from '@angular/core';

/**
 * DevTools metadata about the store state.
 */
export interface StoreDevToolsInfo {
    /** Total number of dispatched actions. */
    actionCount: number;
    /** Last dispatched action type. */
    lastActionType: string | null;
    /** Timestamp of last dispatch. */
    lastDispatchTime: number | null;
    /** Number of registered sub-store reducers. */
    subStoreCount: number;
    /** State size in bytes (approximate). */
    stateSize: number;
    /** List of all registered action types seen. */
    actionHistory: string[];
}

/**
 * Tracks and provides metadata about store operations for debugging.
 *
 * @example
 * ```typescript
 * const tracker = new StoreActionTracker(ngRedux);
 * tracker.enable();
 *
 * // After some dispatches:
 * console.log(tracker.getInfo().actionCount);
 * console.log(tracker.getInfo().lastActionType);
 * ```
 */
export class StoreActionTracker<RootState = any> {
    private info: StoreDevToolsInfo = {
        actionCount: 0,
        lastActionType: null,
        lastDispatchTime: null,
        subStoreCount: 0,
        stateSize: 0,
        actionHistory: [],
    };

    private maxHistory = 100;
    private unsubscribe: (() => void) | null = null;
    private previousDispatch: any;
    private _isEnabled = false;
    private _infoSignal: WritableSignal<StoreDevToolsInfo>;

    constructor(private store: NgRedux<RootState>) {
        this._infoSignal = signal({ ...this.info });
    }

    /**
     * Starts tracking store dispatches.
     */
    enable(): void {
        if (this._isEnabled) return;
        this._isEnabled = true;

        this.previousDispatch = this.store.dispatch.bind(this.store);

        const self = this;
        (this.store as any).dispatch = function (action: any) {
            if (!self._isEnabled) {
                return self.previousDispatch(action);
            }

            self.info.actionCount++;
            self.info.lastActionType = action?.type ?? null;
            self.info.lastDispatchTime = Date.now();

            if (action?.type) {
                self.info.actionHistory.push(action.type);
                if (self.info.actionHistory.length > self.maxHistory) {
                    self.info.actionHistory.shift();
                }
            }

            const result = self.previousDispatch(action);

            try {
                self.info.stateSize = JSON.stringify(self.store.getState()).length;
            } catch {
                self.info.stateSize = -1;
            }

            self._infoSignal.set({ ...self.info });

            return result;
        };
    }

    /**
     * Stops tracking. Does not restore dispatch to avoid breaking the chain
     * when multiple wrappers are active. Instead, disables tracking logic.
     */
    disable(): void {
        this._isEnabled = false;
    }

    /**
     * Gets the current tracking info.
     */
    getInfo(): StoreDevToolsInfo {
        return { ...this.info };
    }

    /**
     * Gets the tracking info as an Angular Signal (reactive).
     */
    getInfoSignal(): Signal<StoreDevToolsInfo> {
        return this._infoSignal.asReadonly();
    }

    /**
     * Resets all tracked statistics.
     */
    reset(): void {
        this.info = {
            actionCount: 0,
            lastActionType: null,
            lastDispatchTime: null,
            subStoreCount: 0,
            stateSize: 0,
            actionHistory: [],
        };
        this._infoSignal.set({ ...this.info });
    }

    /**
     * Logs the current info to the console in a formatted way.
     */
    logInfo(): void {
        console.group('📊 @angular-redux3/store DevTools Info');
        console.log('Actions dispatched:', this.info.actionCount);
        console.log('Last action:', this.info.lastActionType);
        console.log('State size:', `~${this.info.stateSize} bytes`);
        console.log('Action history:', this.info.actionHistory);
        console.groupEnd();
    }
}
