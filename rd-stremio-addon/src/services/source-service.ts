/**
 * Source Service - Orchestrates multiple source providers
 */

import type { SourceStream } from '../models/source-model.js';
import { SOURCES } from '../config/sources.js';

export class SourceService {
  static async fetchStreamsFromAllSources(
    type: string, 
    id: string
  ): Promise<SourceStream[]> {
    for (const source of SOURCES) {
      try {
        const streams = await source.getStreams(type, id);
        
        if (streams.length > 0) {
          console.log(`Found ${streams.length} streams from ${source.name}`);
          return streams;
        }
      } catch (error) {
        console.warn(`Failed to fetch from ${source.name}:`, error);
      }
    }
    
    return [];
  }
}