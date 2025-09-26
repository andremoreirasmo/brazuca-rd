import { request } from 'undici';

export interface RealDebridOptions {
  token: string;
}

export interface RDMagnetInfo {
  id: string;
  status: string;
  files?: Array<{
    id: number;
    path: string;
    bytes: number;
    selected: number;
  }>;
}

export class RealDebridClient {
  private readonly token: string;
  private readonly base = 'https://api.real-debrid.com/rest/1.0';

  constructor(opts: RealDebridOptions) {
    this.token = opts.token;
  }

  async addMagnet(magnet: string): Promise<{ id: string }>
  {
    const res = await request(`${this.base}/torrents/addMagnet`, {
      method: 'POST',
      headers: this.headers(),
      body: new URLSearchParams({ magnet }).toString()
    });
    if (res.statusCode >= 400) {
      throw new Error(`RD addMagnet failed: ${res.statusCode}`);
    }
    const data = (await res.body.json()) as { id: string };
    return data;
  }

  async selectFiles(torrentId: string, fileIds: string): Promise<void>
  {
    const res = await request(`${this.base}/torrents/selectFiles/${torrentId}`, {
      method: 'POST',
      headers: this.headers(),
      body: new URLSearchParams({ files: fileIds }).toString()
    });
    if (res.statusCode >= 400) {
      const text = await res.body.text();
      throw new Error(`RD selectFiles failed: ${res.statusCode} ${text}`);
    }
  }

  async getInfo(torrentId: string): Promise<RDMagnetInfo>
  {
    const res = await request(`${this.base}/torrents/info/${torrentId}`, {
      method: 'GET',
      headers: this.headers(),
    });
    if (res.statusCode >= 400) {
      throw new Error(`RD info failed: ${res.statusCode}`);
    }
    return await res.body.json() as RDMagnetInfo;
  }

  async unrestrict(link: string): Promise<{ download: string }>
  {
    const res = await request(`${this.base}/unrestrict/link`, {
      method: 'POST',
      headers: this.headers(),
      body: new URLSearchParams({ link }).toString()
    });
    if (res.statusCode >= 400) {
      const text = await res.body.text();
      throw new Error(`RD unrestrict failed: ${res.statusCode} ${text}`);
    }
    return await res.body.json() as { download: string };
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    } as const;
  }
}

export async function ensureDirectUrlFromMagnet(client: RealDebridClient, magnet: string, pollMs = 4000, timeoutMs = 180000): Promise<string>
{
  const { id } = await client.addMagnet(magnet);
  const start = Date.now();

  // First poll to get file list, pick the largest video file
  let info = await client.getInfo(id);
  const videoFiles = (info.files || []).filter(f => /\.(mp4|mkv|mov|avi|ts|m4v)$/i.test(f.path));
  if (videoFiles.length === 0) {
    throw new Error('RD: no video files in torrent');
  }
  const largest = videoFiles.reduce((max, f) => (f.bytes > max.bytes ? f : max));
  await client.selectFiles(id, String(largest.id));

  // Poll until the file is ready in RD cloud
  while (Date.now() - start < timeoutMs) {
    info = await client.getInfo(id);
    // When the selected file is available, RD returns a link in files? No, we need to use /torrents/info to get links array
    // Some statuses: magnet_conversion, waiting_files_selection, queued, downloading, downloaded
    if (info.status === 'downloaded') {
      break;
    }
    await new Promise(r => setTimeout(r, pollMs));
  }

  // Build a link to unrestrict. RD supports /torrents/info returning links once downloaded; if not present, try /torrents/selectFiles triggered link in user cloud listing. We can use the original magnet via /unrestrict/link if RD provides a direct link in info.
  // Fallback: try RD unrestrict on the magnet (RD accepts some torrent links), otherwise throw.
  // As a pragmatic approach, RD exposes streamable links under /torrents/info -> links (array of URLs)
  const refreshed = await client.getInfo(id) as any;
  const links: string[] = Array.isArray(refreshed.links) ? refreshed.links : [];
  const link = links[0];
  if (!link) {
    throw new Error('RD: link not available yet');
  }
  const direct = await client.unrestrict(link);
  return direct.download;
}


