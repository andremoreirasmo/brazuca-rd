/**
 * Shared debrid provider types.
 * One addon install uses one provider. Real-Debrid remains the default when
 * an older install only sends a Real-Debrid token.
 */

export type DebridProviderId = 'realdebrid' | 'torbox';

export interface DebridCredentials {
  provider: DebridProviderId;
  token: string;
}

export interface DebridPlaybackOptions {
  userIp?: string;
}

export interface DebridProvider {
  readonly id: DebridProviderId;
  processMagnetToDirectUrl(magnet: string, options?: DebridPlaybackOptions): Promise<string>;
}

export interface DebridRequestQuery {
  debridProvider?: string;
  debridToken?: string;
  torboxToken?: string;
  tbToken?: string;
  realdebridToken?: string;
  rdToken?: string;
  token?: string;
}

export interface DebridRequestExtra {
  debridProvider?: string;
  debridToken?: string;
  torboxToken?: string;
  realdebridToken?: string;
  token?: string;
}

const VIDEO_FILE_PATTERN = /\.(mp4|mkv|mov|avi|ts|m4v)$/i;

export function isVideoFileName(name: string): boolean {
  return VIDEO_FILE_PATTERN.test(name);
}

export function parseDebridProvider(value: string | undefined): DebridProviderId | undefined {
  if (!value) return undefined;

  switch (value.trim().toLowerCase()) {
    case 'realdebrid':
    case 'real-debrid':
    case 'rd':
      return 'realdebrid';
    case 'torbox':
    case 'tb':
      return 'torbox';
    default:
      return undefined;
  }
}

export function infoHashFromMagnet(magnet: string): string | undefined {
  const match = /xt=urn:btih:([a-zA-Z0-9]+)/i.exec(magnet);
  const hash = match?.[1];
  return hash?.toLowerCase();
}
