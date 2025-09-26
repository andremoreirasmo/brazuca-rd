/**
 * Real-Debrid Service
 */

import { request } from 'undici';
import type { TorrentInfo, MagnetResponse, UnrestrictResponse } from '../models/realdebrid-model.js';

export class RealDebridService {
  constructor(private token: string) {}

  async addMagnet(magnet: string): Promise<MagnetResponse> {
    const response = await request('https://api.real-debrid.com/rest/1.0/torrents/addMagnet', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ magnet }).toString()
    });

    if (response.statusCode >= 400) {
      throw new Error(`Failed to add magnet: ${response.statusCode}`);
    }

    return await response.body.json() as MagnetResponse;
  }

  async selectFiles(torrentId: string, fileIds: string): Promise<void> {
    const response = await request(`https://api.real-debrid.com/rest/1.0/torrents/selectFiles/${torrentId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ files: fileIds }).toString()
    });

    if (response.statusCode >= 400) {
      throw new Error(`Failed to select files: ${response.statusCode}`);
    }
  }

  async getTorrentInfo(torrentId: string): Promise<TorrentInfo> {
    const response = await request(`https://api.real-debrid.com/rest/1.0/torrents/info/${torrentId}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    if (response.statusCode >= 400) {
      throw new Error(`Failed to get torrent info: ${response.statusCode}`);
    }

    return await response.body.json() as TorrentInfo;
  }

  async unrestrictLink(link: string): Promise<UnrestrictResponse> {
    const response = await request('https://api.real-debrid.com/rest/1.0/unrestrict/link', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ link }).toString()
    });

    if (response.statusCode >= 400) {
      throw new Error(`Failed to unrestrict link: ${response.statusCode}`);
    }

    return await response.body.json() as UnrestrictResponse;
  }

  async processMagnetToDirectUrl(magnet: string): Promise<string> {
    // Add magnet
    const { id: torrentId } = await this.addMagnet(magnet);
    
    // Get torrent info
    const torrentInfo = await this.getTorrentInfo(torrentId);
    
    if (!torrentInfo.files || torrentInfo.files.length === 0) {
      throw new Error(`No files found in torrent: ${torrentId}`);
    }
    
    // Find largest video file
    const videoFiles = torrentInfo.files.filter(file => 
      /\.(mp4|mkv|mov|avi|ts|m4v)$/i.test(file.path)
    );
    
    if (videoFiles.length === 0) {
      throw new Error('No video files found in torrent');
    }
    
    const largestFile = videoFiles.reduce((max, file) => 
      file.bytes > max.bytes ? file : max
    );
    
    // Select file
    await this.selectFiles(torrentId, String(largestFile.id));
    
    // Wait for download
    const startTime = Date.now();
    const timeout = 180000; // 3 minutes
    
    while (Date.now() - startTime < timeout) {
      const info = await this.getTorrentInfo(torrentId);
      
      if (info.status === 'downloaded') {
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 4000));
    }
    
    // Get final info and unrestrict
    const finalInfo = await this.getTorrentInfo(torrentId);
    
    if (!finalInfo.links || finalInfo.links.length === 0) {
      throw new Error(`No download links available for torrent: ${torrentId}`);
    }
    
    const downloadLink = finalInfo.links[0];
    if (!downloadLink) {
      throw new Error(`Download link is undefined for torrent: ${torrentId}`);
    }
    
    const { download } = await this.unrestrictLink(downloadLink);
    return download;
  }
}
