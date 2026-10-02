/**
 * Debrid provider factory
 */

import type { DebridCredentials, DebridProvider } from '../models/debrid-model.js';
import { RealDebridService } from './realdebrid-service.js';
import { TorboxService } from './torbox-service.js';

export function createDebridProvider(credentials: DebridCredentials): DebridProvider {
  if (credentials.provider === 'torbox') {
    return new TorboxService(credentials.token);
  }

  return new RealDebridService(credentials.token);
}
