/**
 * Stream Controller
 */

import type { DebridCredentials, DebridPlaybackOptions } from '../models/debrid-model.js';
import type { StreamRequest, StreamResponse } from '../models/stream-model.js';
import { createDebridProvider } from '../services/debrid-service.js';
import { SourceService } from '../services/source-service.js';
import { StreamService } from '../services/stream-service.js';
import { ConfigService } from '../services/config-service.js';

export class StreamController {
  private config = ConfigService.loadConfig();

  async handleStreamRequest(args: StreamRequest): Promise<StreamResponse> {
    const { type, id, extra } = args;

    try {
      console.debug(`Processing stream request: ${type}/${id}`);
      
      const sourceStreams = await SourceService.fetchStreamsFromAllSources(type, id);
      
      const processableStreams = sourceStreams.filter(stream => 
        stream.magnet || 
        stream.infoHash || 
        (stream.url && stream.url.startsWith('magnet:'))
      );
      
      if (processableStreams.length === 0) {
        console.debug('No processable streams found');
        return { streams: [] };
      }

      console.debug(`Found ${processableStreams.length} streams with magnet links`);

      const credentials = StreamService.extractDebridCredentials({}, {}, extra);
      if (!credentials) {
        console.debug('No debrid token provided, skipping streams');
      }

      const streamMetadata: StreamResponse['streams'] = processableStreams.map(stream => {
        const magnet = stream.magnet || 
                       stream.url || 
                       (stream.infoHash ? `magnet:?xt=urn:btih:${stream.infoHash}` : undefined);
        
        if (!magnet || !credentials) {
          return StreamService.createStreamMetadata(stream, '');
        }
        
        const resolveQuery = new URLSearchParams({
          provider: credentials.provider,
          token: credentials.token,
          magnet
        });
        const apiUrl = `${this.config.baseUrl.replace(/\/$/, '')}/resolve?${resolveQuery}`;
        
        return StreamService.createStreamMetadata(stream, apiUrl);
      });

      console.debug(`Returning ${streamMetadata.length} streams for ${credentials?.provider ?? 'unconfigured'}`);
      return { streams: streamMetadata };
      
    } catch (error) {
      console.error(`Stream processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { streams: [] };
    }
  }

  /**
   * Resolves a magnet through the configured debrid provider when playback starts.
   */
  async processMagnetForPlayback(
    magnet: string,
    credentials: DebridCredentials,
    userIp?: string
  ): Promise<string> {
    if (!credentials.token) {
      throw new Error('Debrid API token is required for playback');
    }

    const provider = createDebridProvider(credentials);
    const playbackOptions: DebridPlaybackOptions = {};
    if (userIp) playbackOptions.userIp = userIp;

    try {
      console.debug(`Processing magnet for playback via ${provider.id}: ${magnet.substring(0, 50)}...`);
      
      const directUrl = await provider.processMagnetToDirectUrl(magnet, playbackOptions);
      
      console.debug(`Successfully processed magnet for playback: ${directUrl}`);
      return directUrl;
      
    } catch (error) {
      console.error(`Failed to process magnet for playback: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
}
