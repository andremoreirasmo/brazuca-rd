/**
 * Sources Configuration - Direct SourceProvider instances
 */

import { StremioAddonProvider } from '../services/stremio-addon-provider.js';
import type { BaseSourceProvider } from '../services/base-source-provider.js';

export const SOURCES: BaseSourceProvider[] = [
  new StremioAddonProvider('Brazuca', 'https://94c8cb9f702d-brazuca-torrents.baby-beamup.club')
  
  // Future sources can be added here:
  // new StremioAddonProvider('AnotherAddon', 'https://another-addon.com'),
  // new ExampleScraperProvider('TorrentSite', 'https://torrent-site.com'),
  // new CustomScraperProvider('AnotherSite', 'https://another-site.com')
];
