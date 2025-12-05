/**
 * Database Connection Manager for Supabase/PostgreSQL
 * Centralized pool + migration runner for the TOON backend.
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { POSTGRES_MIGRATIONS } from './migrations';

interface QueryConfig {
  text: string;
  params?: any[];
}

export class DatabaseManager {
  private static instance: DatabaseManager;
  private pool: Pool;
  private migrationsReady: Promise<void>;

  private constructor() {
    const connectionString =
      process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        'Missing SUPABASE_DB_URL or DATABASE_URL for PostgreSQL connection'
      );
    }

    const shouldUseSSL = /supabase|render|railway/.test(connectionString);

    this.pool = new Pool({
      connectionString,
      ssl: shouldUseSSL
        ? {
            rejectUnauthorized: false,
          }
        : undefined,
      max: Number(process.env.DB_POOL_MAX || 10),
      idleTimeoutMillis: Number(process.env.DB_POOL_IDLE || 30_000),
      connectionTimeoutMillis: Number(
        process.env.DB_POOL_CONNECT_TIMEOUT || 5_000
      ),
    });

    this.pool.on('error', (err: Error) => {
      console.error('Unexpected PostgreSQL error:', err);
    });

    this.migrationsReady = this.runMigrations();
  }

  /**
   * Singleton accessor
   */
  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Await migrations before executing any query to avoid race conditions.
   */
  private async ensureReady(): Promise<void> {
    await this.migrationsReady;
  }

  /**
   * Run idempotent migrations sourced from POSTGRES_MIGRATIONS.
   */
  private async runMigrations(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id TEXT PRIMARY KEY,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      for (const migration of POSTGRES_MIGRATIONS) {
        const applied = await client.query(
          'SELECT 1 FROM schema_migrations WHERE id = $1',
          [migration.id]
        );

        if (applied.rowCount) {
          continue;
        }

        console.log(`📦 Applying migration ${migration.id}`);
        await client.query(migration.sql);
        await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [
          migration.id,
        ]);
      }

      await client.query('COMMIT');
      console.log('✅ PostgreSQL migrations complete');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Acquire a dedicated client, useful for transactions.
   */
  async withClient<T>(handler: (client: PoolClient) => Promise<T>): Promise<T> {
    await this.ensureReady();
    const client = await this.pool.connect();
    try {
      return await handler(client);
    } finally {
      client.release();
    }
  }

  private async execute<T extends QueryResultRow = QueryResultRow>(
    config: QueryConfig
  ): Promise<QueryResult<T>> {
    await this.ensureReady();
    const { text, params } = this.formatQuery(config.text, config.params);
    return this.pool.query<T>(text, params);
  }

  private formatQuery(text: string, params: any[] = []): QueryConfig {
    if (!params.length || !text.includes('?')) {
      return { text, params };
    }

    let index = 0;
    const transformed = text.replace(/\?/g, () => {
      index += 1;
      return `$${index}`;
    });

    return { text: transformed, params };
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: any[] = []
  ): Promise<T[]> {
    const result = await this.execute<T>({ text, params });
    return result.rows;
  }

  async get<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: any[] = []
  ): Promise<T | undefined> {
    const rows = await this.query<T>(text, params);
    return rows[0];
  }

  async run(text: string, params: any[] = []): Promise<number> {
    const result = await this.execute({ text, params });
    return result.rowCount ?? 0;
  }

  async all<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: any[] = []
  ): Promise<T[]> {
    return this.query<T>(text, params);
  }

  getPool(): Pool {
    return this.pool;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
