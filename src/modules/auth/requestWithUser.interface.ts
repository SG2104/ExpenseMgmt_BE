import { users } from '@prisma/client';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: users;
}

export default RequestWithUser;
