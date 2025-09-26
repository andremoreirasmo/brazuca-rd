import Fastify from 'fastify';
import pino from 'pino';
import stremioAddonSdk from 'stremio-addon-sdk';
import { loadConfig } from './config.js';
import { fetchFirstStreamsFromSources } from './source.js';
import { RealDebridClient, ensureDirectUrlFromMagnet } from './rd.js';

const { addonBuilder, getRouter } = stremioAddonSdk;

const config = loadConfig();
const logger = pino({ level: config.logLevel });
const fastify = Fastify({ logger });

// Register CORS plugin
fastify.register(import('@fastify/cors'), {
  origin: true,
  credentials: true
});

const manifest = {
  id: 'org.andre.brazuca-rd',
  version: '1.0.0',
  name: 'Brazuca RD',
  description: 'Proxies Brazuca Torrents addon magnets through Real‑Debrid into direct streams. Credits: Brazuca Torrents addon author.',
  catalogs: [],
  resources: ['stream'],
  types: ['movie', 'series'],
  idPrefixes: ['tt'],
  behaviorHints: {
    adult: false,
    p2p: false,
    configurable: true,
    configurationRequired: true
  },
  config: [
    {
      key: 'realdebridToken',
      type: 'text',
      title: 'Real-Debrid API Token',
      description: 'Your Real-Debrid API token for accessing premium links'
    }
  ]
};

const builder = new addonBuilder(manifest as any);

// Define the stream handler function
async function handleStreamRequest(args: any) {
  const { type, id, extra } = args;
  const token = (extra && (extra.realdebridToken || extra.token)) || config.realDebridToken;
  if (!token) {
    return { streams: [] };
  }
  try {
    const streams = await fetchFirstStreamsFromSources(type, id, config.sourceBaseUrls);
    // Find a magnet or infoHash
    const candidate = streams.find(s => s.magnet || s.infoHash || (s.url && s.url.startsWith('magnet:')));
    if (!candidate) {
      return { streams: [] };
    }
    const magnet = candidate.magnet || candidate.url || (candidate.infoHash ? `magnet:?xt=urn:btih:${candidate.infoHash}` : undefined);
    if (!magnet) {
      return { streams: [] };
    }
    const rd = new RealDebridClient({ token });
    const directUrl = await ensureDirectUrlFromMagnet(rd, magnet);
    // Format exactly as requested
    const quality = candidate.quality || '1080p';
    const size = candidate.size ? `${(candidate.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown size';
    const seeders = candidate.seeders || 0;
    const releaseGroup = candidate.releaseGroup || 'Unknown';
    
    return {
      streams: [
        {
          name: `[Brazuca RD] ${candidate.name || candidate.title || 'Brazuca'}`,
          title: `${candidate.title || 'Unknown file'}`,
          url: directUrl,         
          // Include original Brazuca torrent info
          infoHash: candidate.infoHash,
          // Add metadata from the original stream
          ...(candidate.url && { externalUrl: candidate.url }),
          ...(candidate.size && { size: candidate.size }),
          ...(candidate.seeders && { seeders: candidate.seeders }),
          ...(candidate.quality && { quality: candidate.quality }),
          // Keep original release group format
          ...(candidate.releaseGroup && { releaseGroup: candidate.releaseGroup })
        }
      ]
    };
  } catch (err: any) {
    fastify.log.error(err);
    return { streams: [] };
  }
}

builder.defineStreamHandler(handleStreamRequest);

const router = getRouter(builder.getInterface());

fastify.all('/manifest.json', async (req, reply) => {
  const q = req.query as any;
  const token = q.realdebridToken || q.rdToken || q.token;
  
  // If token is provided, make it non-configurable for direct install
  const dynamicManifest = {
    ...manifest,
    behaviorHints: {
      ...manifest.behaviorHints,
      configurable: !token,
      configurationRequired: !token
    }
  };
  
  reply.send(dynamicManifest);
});

fastify.get('/configure', async (req, reply) => {
  const q = req.query as any;
  const token = q.realdebridToken || q.rdToken || q.token;
  
  reply.type('text/html').send(`
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
    input[type="text"] { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
    .btn { background: #6c5ce7; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
    .btn:hover { background: #5a4fcf; }
    .info { background: #e8f4fd; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
    .link { color: #6c5ce7; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔗 Brazuca RD Configuration</h1>
    <div class="info">
      <strong>Brazuca RD</strong> - Proxies Brazuca Torrents through Real-Debrid for direct streaming.<br>
      <strong>Credits:</strong> <a href="https://94c8cb9f702d-brazuca-torrents.baby-beamup.club/" class="link" target="_blank">Brazuca Torrents addon</a>
    </div>
    <form id="configForm">
      <div class="form-group">
        <label for="rdToken">Real-Debrid API Token:</label>
        <input type="text" id="rdToken" placeholder="Enter your Real-Debrid API token" value="${token || ''}" required>
      </div>
      <button type="submit" class="btn">Save Configuration</button>
    </form>
    <div style="margin-top: 20px; font-size: 14px; color: #666;">
      <strong>Get your Real-Debrid API token:</strong><br>
      <a href="https://real-debrid.com/apitoken" class="link" target="_blank">Real-Debrid API Token</a>
    </div>
  </div>
  <script>
    document.getElementById('configForm').addEventListener('submit', function(e) {
      e.preventDefault();
      const token = document.getElementById('rdToken').value.trim();
      if (!token) return;
      
      // Redirect back to Stremio with the token
      const installUrl = \`http://localhost:${config.port}/manifest.json?realdebridToken=\${encodeURIComponent(token)}\`;
      window.location.href = installUrl;
    });
  </script>
</body>
</html>
  `);
});

fastify.get('/', async (_req, reply) => {
  reply.type('text/html').send(`
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
    input[type="text"] { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
    .btn { background: #6c5ce7; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
    .btn:hover { background: #5a4fcf; }
    .info { background: #e8f4fd; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
    .link { color: #6c5ce7; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔗 Brazuca RD Configuration</h1>
    <div class="info">
      <strong>Brazuca RD</strong> - Proxies Brazuca Torrents through Real-Debrid for direct streaming.<br>
      <strong>Credits:</strong> <a href="https://94c8cb9f702d-brazuca-torrents.baby-beamup.club/" class="link" target="_blank">Brazuca Torrents addon</a>
    </div>
    <form id="configForm">
      <div class="form-group">
        <label for="rdToken">Real-Debrid API Token:</label>
        <input type="text" id="rdToken" placeholder="Enter your Real-Debrid API token" required>
      </div>
      <button type="submit" class="btn">Install Addon</button>
    </form>
    <div style="margin-top: 20px; font-size: 14px; color: #666;">
      <strong>Get your Real-Debrid API token:</strong><br>
      <a href="https://real-debrid.com/apitoken" class="link" target="_blank">Real-Debrid API Token</a>
    </div>
  </div>
  <script>
    document.getElementById('configForm').addEventListener('submit', function(e) {
      e.preventDefault();
      const token = document.getElementById('rdToken').value.trim();
      if (!token) return;
      const installUrl = \`http://localhost:${config.port}/manifest.json?realdebridToken=\${encodeURIComponent(token)}\`;
      navigator.clipboard.writeText(installUrl).then(() => {
        alert('Install URL copied to clipboard!\\n\\nPaste it in Stremio to install the addon.');
      }).catch(() => {
        prompt('Copy this URL to install in Stremio:', installUrl);
      });
    });
  </script>
</body>
</html>
  `);
});

fastify.all('/stream/:type/:id.json', async (req, reply) => {
  // Pass realdebridToken as extra
  const { type, id } = req.params as any;
  const q = req.query as any;
  const token = q.realdebridToken || q.rdToken || q.token || (req.headers['x-rd-token'] as string | undefined);
  
  // Call our stream handler directly
  try {
    const result = await handleStreamRequest({ type, id, extra: { realdebridToken: token } });
    reply.send(result);
  } catch (err) {
    fastify.log.error(err);
    reply.send({ streams: [] });
  }
});

fastify.listen({ port: config.port, host: '0.0.0.0' }).then(() => {
  fastify.log.info(`Addon running on :${config.port}`);
});
