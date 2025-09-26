/**
 * Configuration Service
 */

import type { AppConfig } from '../models/config-model.js';

export class ConfigService {
  static loadConfig(): AppConfig {
    const port = Number(process.env.PORT || 7000);
    const logLevel = (process.env.LOG_LEVEL as AppConfig['logLevel']) || 'info';
    const realDebridToken = process.env.REALDEBRID_TOKEN || undefined;
    const sourceBaseUrls = ['https://94c8cb9f702d-brazuca-torrents.baby-beamup.club'];

    const config: AppConfig = { 
      port, 
      logLevel, 
      sourceBaseUrls 
    };

    if (realDebridToken) {
      config.realDebridToken = realDebridToken;
    }

    return config;
  }
}
