//when a JWT token is created, it contains the info about auth user.
//this file ensures that every JWT token has a userId field.
//helps to know what data should be stored in the JWT
export interface TokenPayload {
  userId: string;
}
