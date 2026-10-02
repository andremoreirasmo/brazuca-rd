/**
 * Routes
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import Fastify from 'fastify';
import pino from 'pino';
import path from 'path';
import stremioAddonSdk from 'stremio-addon-sdk';
import { ConfigController } from '../controllers/config-controller.js';
import { StreamController } from '../controllers/stream-controller.js';
import { parseDebridProvider } from '../models/debrid-model.js';
import type { DebridCredentials, DebridRequestExtra, DebridRequestQuery } from '../models/debrid-model.js';
import type { StreamRequest } from '../models/stream-model.js';
import { ConfigService } from '../services/config-service.js';
import { StreamService } from '../services/stream-service.js';

const { addonBuilder } = stremioAddonSdk;

export function setupRoutes() {
  const config = ConfigService.loadConfig();
  const logger = pino({ level: config.logLevel });
  const fastify = Fastify({
    logger,
    // Legacy play URLs keep the magnet in the path. Encoded magnets are longer than Fastify's default 100-character limit.
    maxParamLength: 8192
  });

  fastify.register(import('@fastify/cors'), {
    origin: true,
    credentials: true
  });

  fastify.register(import('@fastify/static'), {
    root: path.resolve('public')
  });

  const configController = new ConfigController();
  const streamController = new StreamController();

  const builder = new addonBuilder(configController.createAddonManifest());
  builder.defineStreamHandler(async (args: StreamRequest) => {
    return streamController.handleStreamRequest(args);
  });

  fastify.all('/manifest.json', async (req, reply) => {
    const credentials = readCredentials(req);
    const manifest = configController.createAddonManifest(!!credentials);
    reply.send(manifest);
  });

  fastify.get('/configure', async (req, reply) => {
    const credentials = readCredentials(req);
    reply.type('text/html').send(configController.generateConfigHTML(credentials, true));
  });

  fastify.get('/', async (_req, reply) => {
    reply.type('text/html').send(configController.generateConfigHTML());
  });

  fastify.all('/stream/:type/:id.json', async (req, reply) => {
    const { type, id } = req.params as { type: string; id: string };
    const credentials = readCredentials(req);
    
    try {
      const extra: DebridRequestExtra = credentials
        ? { debridProvider: credentials.provider, debridToken: credentials.token }
        : {};
      
      const result = await streamController.handleStreamRequest({ 
        type, 
        id, 
        extra 
      });
      reply.send(result);
    } catch (error) {
      logger.error(`Stream endpoint error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      reply.send({ streams: [] });
    }
  });

  const playMagnet = async (
    reply: FastifyReply,
    credentials: DebridCredentials,
    magnet: string,
    userIp: string | undefined
  ): Promise<void> => {
    if (!credentials.token) {
      reply.status(400).send({ error: 'Debrid API token is required' });
      return;
    }

    if (!magnet.startsWith('magnet:')) {
      reply.status(400).send({ error: 'Magnet link is required' });
      return;
    }

    try {
      const directUrl = await streamController.processMagnetForPlayback(magnet, credentials, userIp);
      reply.redirect(directUrl);
    } catch (error) {
      logger.error(`Magnet processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      reply.status(500).send({ error: 'Failed to process magnet link' });
    }
  };

  // Magnet stays in the query string. Fastify only partially decodes path parameters, which corrupts characters such as spaces.
  fastify.get('/resolve', async (req, reply) => {
    const query = req.query as ResolveQuery;
    const provider = parseDebridProvider(query.provider);
    const token = query.token;
    const magnet = query.magnet;

    if (!provider || !token) {
      reply.status(400).send({ error: 'Debrid provider must be realdebrid or torbox, and an API token is required' });
      return;
    }

    if (!magnet) {
      reply.status(400).send({ error: 'Magnet link is required' });
      return;
    }

    await playMagnet(reply, { provider, token }, magnet, clientIp(req));
  });

  // Older installs put only the Real-Debrid token in the play URL.
  fastify.get('/resolve/:token/:magnet', async (req, reply) => {
    const { token, magnet } = req.params as { token: string; magnet: string };

    if (!token) {
      reply.status(400).send({ error: 'Debrid API token is required' });
      return;
    }

    let decodedMagnet: string;
    try {
      decodedMagnet = decodeURIComponent(magnet);
    } catch {
      reply.status(400).send({ error: 'Magnet link is not valid URL encoding' });
      return;
    }

    await playMagnet(reply, { provider: 'realdebrid', token }, decodedMagnet, clientIp(req));
  });

  fastify.get('/placeholder/downloading.mp4', async (_req, reply) => {
    reply.type('video/mp4');
    reply.sendFile('downloading.mp4');
  });

  fastify.get('/debug', async (_req, reply) => {
    reply.send({
      environment: {
        PORT: process.env.PORT,
        LOG_LEVEL: process.env.LOG_LEVEL,
        BASE_URL: process.env.BASE_URL,
        NODE_ENV: process.env.NODE_ENV
      },
      config: ConfigService.loadConfig()
    });
  });

  return fastify;
}

function readCredentials(req: FastifyRequest): DebridCredentials | undefined {
  return StreamService.extractDebridCredentials(req.query as DebridRequestQuery, req.headers);
}

function clientIp(req: FastifyRequest): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  const headerIp = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
  const candidate = headerIp || req.ip;
  if (!candidate || candidate === '127.0.0.1' || candidate === '::1' || candidate === '::ffff:127.0.0.1') {
    return undefined;
  }
  return candidate;
}

interface ResolveQuery {
  provider?: string;
  token?: string;
  magnet?: string;
}
