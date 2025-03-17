import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { UserModule } from './modules/users/user.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { envValidationSchema } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { UserController } from './modules/users/user.controller';
import { UserService } from './modules/users/user.service';
import { MailService } from './modules/mail/mail.service';
import { JwtAuthGuard } from './common/enums/guards/jwt-auth.guard';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { RedisModule } from './modules/redis/redis.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    PrismaModule,
    UserModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 600000,
          limit: 100,
        },
      ],
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'mySecretKey',
      signOptions: { expiresIn: '1h' },
    }),
    AuthModule,
    RedisModule,
  ],
  controllers: [AppController, UserController],
  providers: [
    UserService,
    AppService,
    {
      provide: 'APP_GUARD',
      useClass: ThrottlerGuard,
    },
    MailService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // 👈 This makes JwtAuthGuard a global guard
    },
  ],
})
export class AppModule {}
