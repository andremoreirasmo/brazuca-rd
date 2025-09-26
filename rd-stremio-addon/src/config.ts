import dotenv from 'dotenv';

dotenv.config();

export interface AppConfig {
  port: number;
  logLevel: 'info' | 'debug' | 'error' | 'warn';
  realDebridToken?: string;
  sourceBaseUrls: string[]; // torrent addon bases
}

export function loadConfig(): AppConfig {
  const port = Number(process.env.PORT || 7000);
  const logLevel = (process.env.LOG_LEVEL as AppConfig['logLevel']) || 'info';
  const realDebridToken = process.env.REALDEBRID_TOKEN || undefined;
  const sourceBaseUrls = ['https://94c8cb9f702d-brazuca-torrents.baby-beamup.club'];

  const base = { port, logLevel, sourceBaseUrls } as const;
  const cfg: AppConfig = realDebridToken
    ? { ...base, realDebridToken }
    : { ...base };
  return cfg;
}


