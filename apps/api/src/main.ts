import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService) as ConfigService<AppConfig, true>;

  app.setGlobalPrefix('api');

  // Browser traffic normally reaches the API through the web app's same-origin
  // proxies, so CORS is a safety net. WEB_ORIGIN may be one origin, a
  // comma-separated list, or "*" (reflect any — dev only).
  const originSetting = config.get('WEB_ORIGIN', { infer: true }).trim();
  const corsOrigin =
    originSetting === '*'
      ? true
      : originSetting.split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-guest-session', 'x-gallery-access'],
  });
  app.enableShutdownHooks();

  // Hosts like Render/Railway inject $PORT; fall back to API_PORT for local dev.
  const port = process.env.PORT ? Number(process.env.PORT) : config.get('API_PORT', { infer: true });
  await app.listen(port, '0.0.0.0');
  new Logger('Bootstrap').log(`Tren API listening on :${port}/api`);
}

void bootstrap();
