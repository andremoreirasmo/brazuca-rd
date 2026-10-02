/**
 * TorBox API models
 * https://api.torbox.app/v1/api/torrents
 */

export interface TorboxResponse<T> {
  success: boolean;
  error: string | null;
  detail: string;
  data: T | null;
}

export interface TorboxCreateTorrentData {
  hash?: string;
  torrent_id?: number;
  auth_id?: string;
}

export interface TorboxFile {
  id: number;
  name?: string;
  short_name?: string;
  absolute_path?: string;
  size: number;
  mimetype?: string;
}

export interface TorboxTorrent {
  id: number;
  hash?: string;
  name?: string;
  download_state?: string;
  download_present?: boolean;
  download_finished?: boolean;
  cached?: boolean;
  progress?: number;
  files?: TorboxFile[];
}
