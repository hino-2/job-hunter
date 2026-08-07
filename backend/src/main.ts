import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { API_GLOBAL_PREFIX, BOOTSTRAP_CONTEXT, LISTEN_HOST } from './app.constants';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { DEFAULT_API_PORT } from './config/config.constants';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger(BOOTSTRAP_CONTEXT);
  const port = Number(process.env.API_PORT ?? DEFAULT_API_PORT);

  configureApp(app);
  app.enableShutdownHooks();

  await app.listen(port, LISTEN_HOST);

  logger.log(`Job Hunter API слушает порт ${port}, префикс /${API_GLOBAL_PREFIX}`);
}

void bootstrap();
