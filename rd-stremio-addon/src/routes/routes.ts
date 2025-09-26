/**
 * Routes
 */

import Fastify from 'fastify';
import pino from 'pino';
import stremioAddonSdk from 'stremio-addon-sdk';
import { ConfigController } from '../controllers/config-controller.js';
import { StreamController } from '../controllers/stream-controller.js';
import { ConfigService } from '../services/config-service.js';
import { StreamService } from '../services/stream-service.js';
import type { StreamRequest } from '../models/stream-model.js';

const { addonBuilder, getRouter } = stremioAddonSdk;

export function setupRoutes() {
  const config = ConfigService.loadConfig();
  const logger = pino({ level: config.logLevel });
  const fastify = Fastify({ logger });

  // Register CORS plugin
  fastify.register(import('@fastify/cors'), {
    origin: true,
    credentials: true
  });

  // Initialize controllers
  const configController = new ConfigController();
  const streamController = new StreamController();

  // Initialize addon builder and router
  const builder = new addonBuilder(configController.createAddonManifest() as any);
  builder.defineStreamHandler(async (args: StreamRequest) => {
    return streamController.handleStreamRequest(args);
  });
  const router = getRouter(builder.getInterface());

  // Routes
  fastify.all('/manifest.json', async (req, reply) => {
    const query = req.query as any;
    const token = StreamService.extractRealDebridToken(query, req.headers);
    
    const manifest = configController.createAddonManifest(!!token);
    reply.send(manifest);
  });

  fastify.get('/configure', async (req, reply) => {
    const query = req.query as any;
    const token = StreamService.extractRealDebridToken(query, req.headers);
    
    reply.type('text/html').send(configController.generateConfigHTML(token, true));
  });

  fastify.get('/', async (_req, reply) => {
    reply.type('text/html').send(configController.generateConfigHTML());
  });

  fastify.all('/stream/:type/:id.json', async (req, reply) => {
    const { type, id } = req.params as any;
    const query = req.query as any;
    const token = StreamService.extractRealDebridToken(query, req.headers);
    
    try {
      const extra: { realdebridToken?: string } = {};
      if (token) extra.realdebridToken = token;
      
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

  return fastify;
}
