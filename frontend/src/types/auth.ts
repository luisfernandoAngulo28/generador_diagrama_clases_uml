export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthResult {
  token: string;
  user: AuthUser;
}
