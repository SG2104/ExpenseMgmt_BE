import { users } from '@prisma/client';
import { Request } from 'express';

interface RequestWithUser extends Request {
  //this interface ensures typescript recognizes request.user as a valid field.
  user: users;
  //when a user logs in, their details are stored in the req object
}

export default RequestWithUser;
