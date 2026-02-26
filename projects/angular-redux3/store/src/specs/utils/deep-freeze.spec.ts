import { deepFreeze, enableStateFreezing, getFreezeConfig, conditionalFreeze } from '../../utils/deep-freeze';

describe('Deep Freeze', () => {
    afterEach(() => {
        enableStateFreezing({ enabled: false });
    });

    describe('deepFreeze', () => {
        it('should freeze a simple object', () => {
            const obj = { a: 1, b: 'hello' };
            deepFreeze(obj);

            expect(Object.isFrozen(obj)).toBe(true);
        });

        it('should recursively freeze nested objects', () => {
            const obj = { a: { b: { c: 1 } } };
            deepFreeze(obj);

            expect(Object.isFrozen(obj)).toBe(true);
            expect(Object.isFrozen(obj.a)).toBe(true);
            expect(Object.isFrozen(obj.a.b)).toBe(true);
        });

        it('should freeze arrays', () => {
            const arr = [1, 2, { nested: true }];
            deepFreeze(arr);

            expect(Object.isFrozen(arr)).toBe(true);
            expect(Object.isFrozen(arr[2])).toBe(true);
        });

        it('should handle null and undefined', () => {
            expect(deepFreeze(null)).toBe(null);
            expect(deepFreeze(undefined)).toBe(undefined);
        });

        it('should handle primitives', () => {
            expect(deepFreeze(42)).toBe(42);
            expect(deepFreeze('hello')).toBe('hello');
            expect(deepFreeze(true)).toBe(true);
        });

        it('should freeze Date objects without recursing', () => {
            const date = new Date();
            deepFreeze(date);
            expect(Object.isFrozen(date)).toBe(true);
        });

        it('should not double-freeze already frozen objects', () => {
            const obj = Object.freeze({ a: 1 });
            // Should not throw
            expect(() => deepFreeze(obj)).not.toThrow();
        });

        it('should prevent mutation of frozen state', () => {
            'use strict';
            const state = { count: 0, nested: { value: 1 } };
            deepFreeze(state);

            expect(() => { (state as any).count = 5; }).toThrow();
            expect(() => { (state as any).nested.value = 2; }).toThrow();
        });
    });

    describe('enableStateFreezing / getFreezeConfig', () => {
        it('should default to disabled', () => {
            const config = getFreezeConfig();
            expect(config.enabled).toBe(false);
        });

        it('should enable freezing', () => {
            enableStateFreezing({ enabled: true });
            expect(getFreezeConfig().enabled).toBe(true);
        });

        it('should support warnOnly option', () => {
            enableStateFreezing({ enabled: true, warnOnly: true });
            const config = getFreezeConfig();
            expect(config.enabled).toBe(true);
            expect(config.warnOnly).toBe(true);
        });
    });

    describe('conditionalFreeze', () => {
        it('should not freeze when disabled', () => {
            enableStateFreezing({ enabled: false });
            const obj = { a: 1 };
            const result = conditionalFreeze(obj);

            expect(result).toBe(obj);
            expect(Object.isFrozen(obj)).toBe(false);
        });

        it('should freeze when enabled', () => {
            enableStateFreezing({ enabled: true });
            const obj = { a: 1, nested: { b: 2 } };
            const result = conditionalFreeze(obj);

            expect(result).toBe(obj);
            expect(Object.isFrozen(obj)).toBe(true);
            expect(Object.isFrozen(obj.nested)).toBe(true);
        });
    });
});
