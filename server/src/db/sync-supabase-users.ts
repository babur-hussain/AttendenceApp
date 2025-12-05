/**
 * Sync Supabase Users to Local Database
 * Creates users in Supabase auth and syncs them to PostgreSQL
 */

import 'dotenv/config';
import { DatabaseManager } from './DatabaseManager';
import { SupabaseService } from '../services/SupabaseService';
import * as crypto from 'crypto';

interface UserToCreate {
  email: string;
  password: string;
  name: string;
  companyCode: string;
  role: 'ADMIN' | 'MANAGER' | 'EMP';
}

function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

async function syncSupabaseUsers() {
  const db = DatabaseManager.getInstance();

  const usersToCreate: UserToCreate[] = [
    {
      email: 'admin@ksfashion.com',
      password: 'Admin@123456',
      name: 'Admin User',
      companyCode: 'KSFASHION',
      role: 'ADMIN',
    },
    {
      email: 'manager@ksfashion.com',
      password: 'Manager@123456',
      name: 'Manager User',
      companyCode: 'KSFASHION',
      role: 'MANAGER',
    },
    {
      email: 'employee@ksfashion.com',
      password: 'Employee@123456',
      name: 'Employee User',
      companyCode: 'KSFASHION',
      role: 'EMP',
    },
  ];

  console.log('🔄 Syncing Supabase users to database...\n');

  for (const userToCreate of usersToCreate) {
    try {
      // Try to create in Supabase first
      let supabaseUser;
      console.log(`📝 Checking/Creating Supabase user: ${userToCreate.email}`);
      
      try {
        supabaseUser = await SupabaseService.createAuthUser({
          email: userToCreate.email,
          password: userToCreate.password,
          metadata: {
            companyCode: userToCreate.companyCode,
            role: userToCreate.role,
            name: userToCreate.name,
          },
        });
        console.log(`✅ Created Supabase user: ${supabaseUser.id}`);
      } catch (createError: any) {
        if (createError.message?.includes('already been registered')) {
          console.log(`   User already exists in Supabase, fetching ID...`);
          // User already exists, we'll use email as identifier for now
          // In production, you'd query Supabase to get the user ID
          supabaseUser = {
            id: `existing_${userToCreate.email.split('@')[0]}`,
          } as any;
        } else {
          throw createError;
        }
      }

      // Get or create company
      const companyQuery = await db.get<{ id: string }>(
        'SELECT id FROM companies WHERE company_code = ?',
        [userToCreate.companyCode]
      );

      let companyId: string;
      if (companyQuery) {
        companyId = companyQuery.id;
        console.log(`   Using existing company: ${userToCreate.companyCode}`);
      } else {
        // Create company if it doesn't exist
        await db.run(
          `INSERT INTO companies (company_code, name, status) 
           VALUES (?, ?, 'active')`,
          [userToCreate.companyCode, 'KS Fashion']
        );
        
        // Fetch the created company ID
        const newCompany = await db.get<{ id: string }>(
          'SELECT id FROM companies WHERE company_code = ?',
          [userToCreate.companyCode]
        );
        companyId = newCompany?.id || 'unknown';
        console.log(`   Created new company: ${userToCreate.companyCode}`);
      }

      // Sync to local database
      await db.run(
        `INSERT INTO users (id, company_id, email, name, role, pin_hash, status)
         VALUES (?, ?, ?, ?, ?, ?, 'active')
         ON CONFLICT (email) DO UPDATE SET
           company_id = EXCLUDED.company_id,
           name = EXCLUDED.name,
           role = EXCLUDED.role`,
        [supabaseUser.id, companyId, userToCreate.email, userToCreate.name, userToCreate.role, hashPin('1234')]
      );

      console.log(`✅ Synced to database: ${userToCreate.email}\n`);
    } catch (error) {
      console.error(`❌ Error processing user ${userToCreate.email}:`, error);
    }
  }

  console.log('✅ Supabase user sync complete!');
  console.log('\n📋 Login Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  for (const user of usersToCreate) {
    console.log(`Email: ${user.email}`);
    console.log(`Password: ${user.password}`);
    console.log(`Role: ${user.role}`);
    console.log('───────────────────────────────────────────────────');
  }
}

syncSupabaseUsers()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
