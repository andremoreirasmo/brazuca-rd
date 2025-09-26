/**
 * Configuration Service
 */

import type { AppConfig } from '../models/config-model.js';

export class ConfigService {
  static loadConfig(): AppConfig {
    const port = Number(process.env.PORT || 7000);
    const logLevel = (process.env.LOG_LEVEL as AppConfig['logLevel']) || 'info';
    const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;

    const config: AppConfig = { 
      port, 
      logLevel,
      baseUrl
    };

    return config;
  }
}
