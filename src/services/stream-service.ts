/**
 * Stream Service
 */

import type { IncomingHttpHeaders } from 'node:http';
import { parseDebridProvider } from '../models/debrid-model.js';
import type { DebridCredentials, DebridRequestExtra, DebridRequestQuery } from '../models/debrid-model.js';
import type { SourceStream } from '../models/source-model.js';
import type { StremioStream } from '../models/stream-model.js';

export class StreamService {
  static createStreamMetadata(sourceStream: SourceStream, url: string): StremioStream {
    const metadata: StremioStream = {
      name: sourceStream.name || `[Brazuca RD] ${sourceStream.title || 'Unknown'}`,
      title: sourceStream.title || 'Unknown file',
      url: url, // This will be either a magnet link or direct URL
      behaviorHints: { notWebReady: false }
    };

    // Add optional properties only if they exist
    if (sourceStream.infoHash) metadata.infoHash = sourceStream.infoHash;
    if (sourceStream.url) metadata.externalUrl = sourceStream.url;
    if (sourceStream.size !== undefined) metadata.size = sourceStream.size;
    if (sourceStream.seeders !== undefined) metadata.seeders = sourceStream.seeders;
    if (sourceStream.quality) metadata.quality = sourceStream.quality;
    if (sourceStream.releaseGroup) metadata.releaseGroup = sourceStream.releaseGroup;

    return metadata;
  }

  static extractDebridCredentials(
    query: DebridRequestQuery,
    headers: IncomingHttpHeaders,
    extra?: DebridRequestExtra
  ): DebridCredentials | undefined {
    const provider = parseDebridProvider(query.debridProvider ?? extra?.debridProvider);
    const torboxToken = firstDefined(
      query.torboxToken,
      query.tbToken,
      headerValue(headers, 'x-tb-token'),
      extra?.torboxToken
    );
    const realDebridToken = firstDefined(
      query.realdebridToken,
      query.rdToken,
      headerValue(headers, 'x-rd-token'),
      extra?.realdebridToken
    );
    const genericToken = firstDefined(query.debridToken, query.token, extra?.debridToken, extra?.token);

    if (provider === 'torbox') {
      const token = genericToken || torboxToken;
      return token ? { provider: 'torbox', token } : undefined;
    }

    if (provider === 'realdebrid') {
      const token = genericToken || realDebridToken;
      return token ? { provider: 'realdebrid', token } : undefined;
    }

    if (torboxToken && !realDebridToken && !genericToken) {
      return { provider: 'torbox', token: torboxToken };
    }

    const legacyToken = realDebridToken || genericToken;
    if (legacyToken) {
      return { provider: 'realdebrid', token: legacyToken };
    }

    return undefined;
  }
}

function headerValue(headers: IncomingHttpHeaders, name: string): string | undefined {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function firstDefined(...values: Array<string | undefined>): string | undefined {
  return values.find((value): value is string => typeof value === 'string' && value.length > 0);
}
