module.exports = {
    roots: ['<rootDir>/projects/angular-redux3/store/src'],
    testMatch: ['**/specs/**/*(*.)@(spec|test).ts?(x)'],
    moduleNameMapper: {
        '^@angular-redux3/store$': '<rootDir>/projects/angular-redux3/store/src/public-api.ts',
        '^@angular-redux3/store/mocks$': '<rootDir>/projects/angular-redux3/store/mocks/public-api.ts'
    },
    modulePathIgnorePatterns: ['<rootDir>/dist'],
    setupFilesAfterEnv: ['<rootDir>/projects/angular-redux3/store/src/test-setup.ts'],
    globals: {
        'ts-jest': {
            diagnostics: false
        }
    }
};
