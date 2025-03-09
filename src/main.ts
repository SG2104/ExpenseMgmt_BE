import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe());

  console.log(
    '🟡 Loaded JWT_EXPIRATION_TIME:',
    configService.get<string>('JWT_EXPIRATION_TIME'),
  );

  const port = process.env.PORT ?? 3000;
  Logger.log(`***** Listening on port:${port} *****`);

  await app.listen(port);
}
bootstrap();
