/**
 * Authentication Types
 * Defines the shape of user data and auth state
 */

export type UserRole = 'ADMIN' | 'MANAGER' | 'EMP';

export interface User {
  id: string;        // E1
  email: string;     // U1
  name: string;      // U2 or display
  role?: UserRole;   // R1
  policyProfile?: string; // P1
  consentToken?: string;  // C1
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
