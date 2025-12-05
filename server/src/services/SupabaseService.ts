import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

/**
 * SupabaseService
 * Centralized wrapper for Supabase Auth and Database interactions
 */
export type SupabaseClientScope = 'service' | 'anon';

export interface SupabaseAuthResult {
  session: Session;
  user: User;
}

export class SupabaseService {
  private static clients: Partial<Record<SupabaseClientScope, SupabaseClient>> = {};

  private static ensureEnv(scope: SupabaseClientScope): { url: string; key: string } {
    const url = process.env.SUPABASE_URL;
    if (!url) {
      throw new Error('Missing SUPABASE_URL for Supabase client initialization');
    }

    const keyVar = scope === 'service' ? 'SUPABASE_SERVICE_ROLE_KEY' : 'SUPABASE_ANON_KEY';
    const keyValue = process.env[keyVar];

    if (!keyValue) {
      throw new Error(`Missing ${keyVar} environment variable`);
    }

    return { url, key: keyValue };
  }

  private static getClient(scope: SupabaseClientScope): SupabaseClient {
    if (!this.clients[scope]) {
      const { url, key } = this.ensureEnv(scope);
      this.clients[scope] = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }

    return this.clients[scope]!;
  }

  static get serviceClient(): SupabaseClient {
    return this.getClient('service');
  }

  static get publicClient(): SupabaseClient {
    if (process.env.SUPABASE_ANON_KEY) {
      return this.getClient('anon');
    }
    // Fallback to service client if anon key is not set
    return this.serviceClient;
  }

  static async signInWithPassword(email: string, password: string): Promise<SupabaseAuthResult> {
    const { data, error } = await this.publicClient.auth.signInWithPassword({ email, password });
    if (error || !data.session || !data.user) {
      const message = error?.message || 'Invalid credentials';
      throw new Error(message);
    }
    return {
      session: data.session,
      user: data.user,
    };
  }

  static async triggerPasswordReset(email: string, redirectTo?: string): Promise<void> {
    const { error } = await this.publicClient.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  static async createAuthUser(params: {
    email: string;
    password: string;
    metadata?: Record<string, any>;
  }): Promise<User> {
    const { email, password, metadata } = params;
    const { data, error } = await this.serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (error || !data.user) {
      console.error('Supabase createUser error:', {
        message: error?.message,
        status: error?.status,
        name: error?.name,
      });
      throw new Error(error?.message || 'Failed to create Supabase user');
    }

    return data.user;
  }

  static async deleteAuthUser(userId: string): Promise<void> {
    const { error } = await this.serviceClient.auth.admin.deleteUser(userId);
    if (error && error.message !== 'User not found') {
      throw new Error(error.message);
    }
  }

  static async updateUserPassword(userId: string, newPassword: string): Promise<void> {
    const { error } = await this.serviceClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  static async getUserFromAccessToken(accessToken: string): Promise<User> {
    const { data, error } = await this.serviceClient.auth.getUser(accessToken);
    if (error || !data.user) {
      throw new Error(error?.message || 'Unable to resolve Supabase user');
    }
    return data.user;
  }
}
