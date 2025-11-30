import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

/**
 * Bootstrap the NestJS application
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
  });

  // Set global API prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 Ciphra.Pay Backend running on: http://localhost:${port}`);
  logger.log(`📋 API Prefix: /api`);
  logger.log(`💳 X402 Payment: ${process.env.X402_ENABLED === 'true' ? 'ENABLED' : 'DISABLED'}`);
  logger.log(`🌐 Starknet Network: ${process.env.STARKNET_NETWORK || 'starknet-sepolia'}`);
}

bootstrap();
