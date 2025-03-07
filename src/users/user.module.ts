import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule], // Import PrismaModule for DB access
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService], // Export if used in other modules
})
export class UserModule {}
