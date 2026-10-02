/**
 * Config Controller
 */

import type { DebridCredentials } from '../models/debrid-model.js';
import type { AddonManifest } from '../models/config-model.js';
import { ConfigService } from '../services/config-service.js';

export class ConfigController {
  private config = ConfigService.loadConfig();

  createAddonManifest(isConfigured: boolean = false): AddonManifest {
    return {
      id: 'org.andre.brazuca-rd',
      version: '1.1.0',
      name: 'Brazuca RD',
      description: 'Proxies Brazuca Torrents addon magnets through Real-Debrid or TorBox into direct streams. Credits: Brazuca Torrents addon author.',
      catalogs: [],
      resources: ['stream'],
      types: ['movie', 'series'],
      idPrefixes: ['tt'],
      behaviorHints: {
        adult: false,
        p2p: false,
        configurable: !isConfigured,
        configurationRequired: !isConfigured
      },
      config: [
        {
          key: 'debridProvider',
          type: 'select',
          title: 'Debrid service',
          description: 'Real-Debrid or TorBox. One service is used for this install.',
          options: ['Real-Debrid', 'TorBox'],
          default: 'Real-Debrid'
        },
        {
          key: 'debridToken',
          type: 'text',
          title: 'API token',
          description: 'API token for the debrid service selected above'
        }
      ]
    };
  }

  generateConfigHTML(credentials?: DebridCredentials, isConfigured: boolean = false): string {
    const buttonText = isConfigured ? 'Save Configuration' : 'Install Addon';
    const provider = credentials?.provider ?? 'realdebrid';
    const token = escapeHtml(credentials?.token ?? '');
    
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Brazuca RD Configuration</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
    .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #333; margin-bottom: 20px; }
    .form-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 5px; font-weight: bold; }
    input[type="text"], select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box; }
    .btn { background: #6c5ce7; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
    .btn:hover { background: #5a4fcf; }
    .info { background: #e8f4fd; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
    .link { color: #6c5ce7; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Brazuca RD Configuration</h1>
    <div class="info">
      <strong>Brazuca RD</strong> proxies Brazuca Torrents through Real-Debrid or TorBox for direct streaming.<br>
      One debrid service is used per install. Install the addon again to use the other service.<br>
      <strong>Credits:</strong> <a href="https://94c8cb9f702d-brazuca-torrents.baby-beamup.club/" class="link" target="_blank">Brazuca Torrents addon</a>
    </div>
    <form id="configForm">
      <div class="form-group">
        <label for="debridProvider">Debrid service:</label>
        <select id="debridProvider" required>
          <option value="realdebrid" ${provider === 'realdebrid' ? 'selected' : ''}>Real-Debrid</option>
          <option value="torbox" ${provider === 'torbox' ? 'selected' : ''}>TorBox</option>
        </select>
      </div>
      <div class="form-group">
        <label for="debridToken">API token:</label>
        <input type="text" id="debridToken" placeholder="Enter your Real-Debrid or TorBox API token" value="${token}" required>
      </div>
      <button type="submit" class="btn">${buttonText}</button>
    </form>
    <div style="margin-top: 20px; font-size: 14px; color: #666;">
      <strong>Get an API token:</strong><br>
      <a href="https://real-debrid.com/apitoken" class="link" target="_blank">Real-Debrid API token</a><br>
      <a href="https://torbox.app/settings" class="link" target="_blank">TorBox API key</a> (Settings)
    </div>
  </div>
  <script>
    document.getElementById('configForm').addEventListener('submit', function(e) {
      e.preventDefault();
      const provider = document.getElementById('debridProvider').value;
      const token = document.getElementById('debridToken').value.trim();
      if (!provider || !token) return;
      
      const installUrl = \`${this.config.baseUrl}/manifest.json?debridProvider=\${encodeURIComponent(provider)}&debridToken=\${encodeURIComponent(token)}\`;
      
      ${isConfigured ? `
      window.location.href = installUrl;
      ` : `
      navigator.clipboard.writeText(installUrl).then(() => {
        alert('Install URL copied to clipboard!\\n\\nPaste it in Stremio to install the addon.');
      }).catch(() => {
        prompt('Copy this URL to install in Stremio:', installUrl);
      });
      `}
    });
  </script>
</body>
</html>
    `;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
