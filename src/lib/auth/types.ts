export type UserRole = "USER" | "ADMIN";
export type UserStatus = "ACTIVE" | "DISABLED";

export interface StoredUser {
  id: string;
  name?: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUser {
  id: string;
  name?: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StoredSession {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

export type MobileTokenKind = "access" | "refresh";

export type ApiClientStatus = "ACTIVE" | "REVOKED";

export interface StoredApiClient {
  id: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  scopes: string[];
  status: ApiClientStatus;
  rateLimit: number;
  expiresAt?: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface StoredMobileSession {
  id: string;
  tokenHash: string;
  userId: string;
  kind: MobileTokenKind;
  expiresAt: string;
  createdAt: string;
  revokedAt?: string;
  replacedBy?: string;
}

export interface AuthStoreData {
  users: StoredUser[];
  sessions: StoredSession[];
  mobileSessions: StoredMobileSession[];
  apiClients: StoredApiClient[];
}
