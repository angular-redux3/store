import { NgRedux, ZonelessChangeDetectionNotifier } from '../../services/ng-redux.service';
import { AnyAction, Reducer } from 'redux';
import { NgZone, ApplicationRef } from '@angular/core';

describe('NgRedux Zone/Zoneless compatibility (smoke)', () => {
    it('should detect zone mode and configure ZoneChangeDetectionNotifier', () => {
        const ngZone = new NgZone({ enableLongStackTrace: false });
        const store = new NgRedux<any>(ngZone as any);

        // internal flag should be false (not zoneless)
        expect((store as any)._isZoneless).toBe(false);
        // notifier should be set (ZoneChangeDetectionNotifier or Noop)
        const notifier = (store as any)._cdNotifier;
        expect(notifier).toBeDefined();
    });

    it('should detect zoneless mode and call ApplicationRef.tick() after dispatch', async () => {
        const mockAppRef: Partial<ApplicationRef> = {
            tick: jest.fn(),
        };

        // Pass undefined ngZone to force zoneless detection
        const store = new NgRedux<any>(undefined as any, mockAppRef as ApplicationRef);

        expect((store as any)._isZoneless).toBe(true);

        const reducer: Reducer<any, AnyAction> = (s = { value: 0 }, a) => {
            if (a.type === 'SET') return { ...s, value: a['payload'] };
            return s;
        };

        store.configureStore(reducer, { value: 0 });

        // dispatch should schedule an ApplicationRef.tick via coalesced ZonelessChangeDetectionNotifier
        store.dispatch({ type: 'SET', payload: 5 } as AnyAction);

        // tick is now coalesced via queueMicrotask, so we need to flush microtasks
        await Promise.resolve();

        expect((mockAppRef.tick as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    it('should coalesce multiple rapid dispatches into a single tick()', async () => {
        const mockAppRef: Partial<ApplicationRef> = {
            tick: jest.fn(),
        };

        const notifier = new ZonelessChangeDetectionNotifier(mockAppRef as ApplicationRef);

        // Call notify() multiple times synchronously
        notifier.notify();
        notifier.notify();
        notifier.notify();

        // Before microtask flushes, tick should not have been called yet
        expect((mockAppRef.tick as jest.Mock).mock.calls.length).toBe(0);

        // Flush microtask queue
        await Promise.resolve();

        // Should have been called exactly once (coalesced)
        expect((mockAppRef.tick as jest.Mock).mock.calls.length).toBe(1);
    });

    it('should allow a second batch of notifications after the first microtask flushes', async () => {
        const mockAppRef: Partial<ApplicationRef> = {
            tick: jest.fn(),
        };

        const notifier = new ZonelessChangeDetectionNotifier(mockAppRef as ApplicationRef);

        // First batch
        notifier.notify();
        notifier.notify();
        await Promise.resolve();
        expect((mockAppRef.tick as jest.Mock).mock.calls.length).toBe(1);

        // Second batch
        notifier.notify();
        await Promise.resolve();
        expect((mockAppRef.tick as jest.Mock).mock.calls.length).toBe(2);
    });
});
