export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserCreate {
  email: string;
  password_hash: string;
  name?: string;
}

export interface UserPublic {
  id: number;
  email: string;
  name: string | null;
}
