import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigAppModule } from './config/config.module'; // ✅ Use ConfigAppModule instead of ConfigModule
import { ConfigService } from '@nestjs/config';
import { getSequelizeConfig } from './config/database.config';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigAppModule, // ✅ Import ConfigAppModule instead of re-declaring ConfigModule
    SequelizeModule.forRootAsync({
      imports: [ConfigAppModule], // ✅ Import ConfigAppModule
      inject: [ConfigService],
      useFactory: getSequelizeConfig,
    }),
    UsersModule,
  ],
})
export class AppModule {}
