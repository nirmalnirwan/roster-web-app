export type Role = 'BusinessManager' | 'Supervisor' | 'Housekeeper' | string;

export interface User {
  id: string;
  username: string;
  role: Role;
}

export interface LoginRequest {
  username: string;
  password: string;
}

// shape returned by our application logic after normalisation
export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
}
