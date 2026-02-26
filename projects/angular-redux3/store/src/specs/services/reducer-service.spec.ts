import { ReducerService } from '../../services/reducer.service';
import { AnyAction } from 'redux';

describe('ReducerService improvements', () => {
    afterEach(() => {
        ReducerService.reset();
    });

    describe('reset', () => {
        it('should reset the singleton instance', () => {
            const instance1 = ReducerService.getInstance();
            ReducerService.reset();
            const instance2 = ReducerService.getInstance();

            expect(instance1).not.toBe(instance2);
        });
    });

    describe('unregisterSubReducer', () => {
        it('should unregister an existing sub-reducer', () => {
            const service = ReducerService.getInstance();
            const reducer = (state: any = {}, action: AnyAction) => state;
            const hash = service.hashSignature(reducer.toString());

            service.registerSubReducer(hash, reducer);
            expect(service.getSubReducerCount()).toBe(1);

            const removed = service.unregisterSubReducer(hash);
            expect(removed).toBe(true);
            expect(service.getSubReducerCount()).toBe(0);
        });

        it('should return false for non-existing sub-reducer', () => {
            const service = ReducerService.getInstance();
            const removed = service.unregisterSubReducer(99999);

            expect(removed).toBe(false);
        });
    });

    describe('getSubReducerCount', () => {
        it('should return 0 for empty registry', () => {
            const service = ReducerService.getInstance();
            expect(service.getSubReducerCount()).toBe(0);
        });

        it('should return correct count after registrations', () => {
            const service = ReducerService.getInstance();
            const reducer1 = (state: any = {}, action: AnyAction) => state;
            const reducer2 = (state: any = {}, _action: AnyAction) => state;

            const hash1 = service.hashSignature(reducer1.toString());
            const hash2 = service.hashSignature(reducer2.toString());

            service.registerSubReducer(hash1, reducer1);
            service.registerSubReducer(hash2, reducer2);

            expect(service.getSubReducerCount()).toBe(2);
        });
    });

    describe('shouldCreateProxyForProperty (via produce)', () => {
        it('should handle Map values without crashing', () => {
            const service = ReducerService.getInstance();
            const initialState = { data: new Map([['key', 'value']]) };

            const reducer = (state: any = initialState, action: AnyAction) => {
                if (action.type === 'UPDATE') {
                    return { ...state, updated: true };
                }
                return state;
            };

            const rootReducer = service.composeReducers(reducer);
            const result = rootReducer(initialState, { type: 'UPDATE' });

            expect(result.updated).toBe(true);
            expect(result.data).toBeInstanceOf(Map);
        });

        it('should handle Set values without crashing', () => {
            const service = ReducerService.getInstance();
            const initialState = { tags: new Set(['a', 'b']) };

            const reducer = (state: any = initialState, action: AnyAction) => {
                if (action.type === 'UPDATE') {
                    return { ...state, updated: true };
                }
                return state;
            };

            const rootReducer = service.composeReducers(reducer);
            const result = rootReducer(initialState, { type: 'UPDATE' });

            expect(result.updated).toBe(true);
            expect(result.tags).toBeInstanceOf(Set);
        });

        it('should handle Date values without crashing', () => {
            const service = ReducerService.getInstance();
            const now = new Date();
            const initialState = { createdAt: now };

            const reducer = (state: any = initialState, action: AnyAction) => {
                if (action.type === 'UPDATE') {
                    return { ...state, updated: true };
                }
                return state;
            };

            const rootReducer = service.composeReducers(reducer);
            const result = rootReducer(initialState, { type: 'UPDATE' });

            expect(result.updated).toBe(true);
            expect(result.createdAt).toBeInstanceOf(Date);
        });

        it('should handle RegExp values without crashing', () => {
            const service = ReducerService.getInstance();
            const initialState = { pattern: /test/gi };

            const reducer = (state: any = initialState, action: AnyAction) => {
                if (action.type === 'UPDATE') {
                    return { ...state, updated: true };
                }
                return state;
            };

            const rootReducer = service.composeReducers(reducer);
            const result = rootReducer(initialState, { type: 'UPDATE' });

            expect(result.updated).toBe(true);
            expect(result.pattern).toBeInstanceOf(RegExp);
        });
    });
});
