/**
 * Stream Controller
 */

import type { StreamRequest, StreamResponse } from '../models/stream-model.js';
import { RealDebridService } from '../services/realdebrid-service.js';
import { SourceService } from '../services/source-service.js';
import { StreamService } from '../services/stream-service.js';
import { ConfigService } from '../services/config-service.js';

export class StreamController {
  private config = ConfigService.loadConfig();

  async handleStreamRequest(args: StreamRequest): Promise<StreamResponse> {
    const { type, id, extra } = args;
    const token = StreamService.extractRealDebridToken({}, {}, extra) || this.config.realDebridToken;
    
    if (!token) {
      console.debug('No Real-Debrid token provided');
      return { streams: [] };
    }

    try {
      console.debug(`Processing stream request: ${type}/${id}`);
      
      // Fetch streams from all configured sources
      const streams = await SourceService.fetchStreamsFromAllSources(type, id);
      
      // Find a suitable candidate with magnet or infoHash
      const candidate = streams.find(stream => 
        stream.magnet || 
        stream.infoHash || 
        (stream.url && stream.url.startsWith('magnet:'))
      );
      
      if (!candidate) {
        console.debug('No suitable stream candidate found');
        return { streams: [] };
      }

      // Extract magnet link
      const magnet = candidate.magnet || 
                     candidate.url || 
                     (candidate.infoHash ? `magnet:?xt=urn:btih:${candidate.infoHash}` : undefined);
      
      if (!magnet) {
        console.debug('No magnet link available');
        return { streams: [] };
      }

      // Process through Real-Debrid
      const rdService = new RealDebridService(token);
      const directUrl = await rdService.processMagnetToDirectUrl(magnet);
      
      console.debug(`Successfully processed magnet: ${directUrl}`);
      
      // Create stream metadata
      const streamMetadata = StreamService.createStreamMetadata(candidate, directUrl);
      
      return { streams: [streamMetadata] };
      
    } catch (error) {
      console.error(`Stream processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { streams: [] };
    }
  }
}
