/**
 * TorBox Service
 *
 * Adds a magnet on play, waits until TorBox has the files, then requests a
 * CDN link for the largest video. Uncached torrents fall back to the
 * downloading placeholder, matching Real-Debrid.
 */

import { FormData, request } from 'undici';
import type { Dispatcher } from 'undici';
import { ConfigService } from './config-service.js';
import { infoHashFromMagnet, isVideoFileName } from '../models/debrid-model.js';
import type { DebridPlaybackOptions, DebridProvider } from '../models/debrid-model.js';
import type {
  TorboxCreateTorrentData,
  TorboxFile,
  TorboxResponse,
  TorboxTorrent
} from '../models/torbox-model.js';

const TORBOX_TORRENTS_URL = 'https://api.torbox.app/v1/api/torrents';
const READY_WAIT_MS = 5000;

export class TorboxApiError extends Error {
  constructor(message: string, readonly code: string | null) {
    super(`TorBox: ${message}`);
    this.name = 'TorboxApiError';
  }
}

export class TorboxService implements DebridProvider {
  readonly id = 'torbox' as const;

  constructor(private token: string) {}

  async processMagnetToDirectUrl(magnet: string, options?: DebridPlaybackOptions): Promise<string> {
    const torrentId = await this.addMagnet(magnet);
    const immediate = await this.getTorrent(torrentId);

    if (immediate && this.isPlayable(immediate)) {
      return this.getDirectDownloadUrl(immediate, options?.userIp);
    }

    await delay(READY_WAIT_MS);

    const retry = await this.getTorrent(torrentId);
    if (retry && this.isPlayable(retry)) {
      return this.getDirectDownloadUrl(retry, options?.userIp);
    }

    return downloadingPlaceholderUrl();
  }

  private async addMagnet(magnet: string): Promise<number> {
    const form = new FormData();
    form.append('magnet', magnet);
    form.append('allow_zip', 'false');

    const response = await request(`${TORBOX_TORRENTS_URL}/createtorrent`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: form
    });

    const body = await this.readJson<TorboxCreateTorrentData>(response);
    const createdId = body.data?.torrent_id;
    if (body.success && typeof createdId === 'number') {
      return createdId;
    }

    if (body.error === 'DUPLICATE_ITEM' || typeof createdId === 'number') {
      if (typeof createdId === 'number') return createdId;
      return this.findTorrentIdByMagnet(magnet);
    }

    throw new TorboxApiError(
      body.detail || `Failed to add magnet (${response.statusCode})`,
      body.error
    );
  }

  private async findTorrentIdByMagnet(magnet: string): Promise<number> {
    const hash = infoHashFromMagnet(magnet);
    if (!hash) {
      throw new Error('Torrent already exists in TorBox and the magnet has no info hash');
    }

    const response = await request(`${TORBOX_TORRENTS_URL}/mylist?bypass_cache=true`, {
      headers: this.authHeaders()
    });
    const body = await this.readJson<TorboxTorrent[]>(response);
    this.assertSuccess(response.statusCode, body);

    const torrents = Array.isArray(body.data) ? body.data : [];
    const match = torrents.find(torrent => torrent.hash?.toLowerCase() === hash);
    if (!match) {
      throw new Error('Torrent already exists in TorBox but could not be found in your torrent list');
    }

    return match.id;
  }

  private async getTorrent(torrentId: number): Promise<TorboxTorrent | undefined> {
    const response = await request(
      `${TORBOX_TORRENTS_URL}/mylist?id=${torrentId}&bypass_cache=true`,
      { headers: this.authHeaders() }
    );
    const body = await this.readJson<TorboxTorrent | TorboxTorrent[]>(response);

    if (body.error === 'ITEM_NOT_FOUND') return undefined;
    this.assertSuccess(response.statusCode, body);

    if (Array.isArray(body.data)) return body.data[0];
    return body.data ?? undefined;
  }

  private isPlayable(torrent: TorboxTorrent): boolean {
    return torrent.download_finished === true
      && torrent.download_present === true
      && this.largestVideo(torrent.files ?? []) !== undefined;
  }

  private async getDirectDownloadUrl(torrent: TorboxTorrent, userIp?: string): Promise<string> {
    const file = this.largestVideo(torrent.files ?? []);
    if (!file) {
      throw new Error('No video files found in torrent');
    }

    const params = new URLSearchParams({
      token: this.token,
      torrent_id: String(torrent.id),
      file_id: String(file.id),
      redirect: 'false'
    });
    if (userIp) params.set('user_ip', userIp);

    const response = await request(`${TORBOX_TORRENTS_URL}/requestdl?${params}`, {
      headers: this.authHeaders()
    });
    const body = await this.readJson<string>(response);
    this.assertSuccess(response.statusCode, body);

    if (typeof body.data !== 'string' || !body.data.startsWith('http')) {
      throw new Error('TorBox did not return a download link');
    }

    return body.data;
  }

  private largestVideo(files: TorboxFile[]): TorboxFile | undefined {
    const videos = files.filter(file => isVideoFileName(this.fileLabel(file)));
    const first = videos[0];
    if (!first) return undefined;

    return videos.reduce((largest, file) => file.size > largest.size ? file : largest, first);
  }

  private fileLabel(file: TorboxFile): string {
    return file.short_name || file.name || file.absolute_path || '';
  }

  private authHeaders(): { Authorization: string } {
    return { Authorization: `Bearer ${this.token}` };
  }

  private async readJson<T>(response: Dispatcher.ResponseData): Promise<TorboxResponse<T>> {
    const text = await response.body.text();
    if (!text) {
      throw new TorboxApiError(`Request failed (${response.statusCode})`, null);
    }

    try {
      return JSON.parse(text) as TorboxResponse<T>;
    } catch {
      throw new TorboxApiError(`Request failed (${response.statusCode})`, null);
    }
  }

  private assertSuccess<T>(statusCode: number, body: TorboxResponse<T>): void {
    if (statusCode >= 400 || body.success === false) {
      throw new TorboxApiError(body.detail || `Request failed (${statusCode})`, body.error);
    }
  }
}

function downloadingPlaceholderUrl(): string {
  return `${ConfigService.loadConfig().baseUrl}/placeholder/downloading.mp4`;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
