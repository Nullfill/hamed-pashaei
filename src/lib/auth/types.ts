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

export interface AuthStoreData {
  users: StoredUser[];
  sessions: StoredSession[];
}
