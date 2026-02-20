/**
 * Imports third-party libraries
 */

import { Injectable } from '@angular/core';

/**
 * angular-redux3
 */

import { DevToolsExtension } from '@angular-redux3/store';

/**
 * MockDevToolsExtension
 */

@Injectable()
export class MockDevToolsExtension extends DevToolsExtension {}
