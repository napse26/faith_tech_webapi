export interface JwtPayload {
  sub: string; // userId
  sid: string; // sessionId
  jti: string; // token unique identifier
  iss?: string;
  aud?: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // in seconds
  tokenType: string;
}

export interface CreateSessionParams {
  userId: string;
  deviceId?: string;
  deviceName?: string;
  platform?: string;
  ipAddress?: string;
  userAgent?: string;
}
