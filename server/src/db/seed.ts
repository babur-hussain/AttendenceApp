/**
 * Seed script to create default users
 */

import 'dotenv/config';
import { DatabaseManager } from './DatabaseManager';
import * as crypto from 'crypto';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'EMP';
  pin_hash: string;
  created_at: string;
  status: 'active' | 'locked';
}

/**
 * Hash PIN using SHA-256
 */
function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

/**
 * Seed default users
 */
export async function seedUsers() {
  const db = DatabaseManager.getInstance();

  // Default users
  const defaultUsers: Omit<User, 'created_at'>[] = [
    {
      id: 'admin_001',
      email: 'admin@ksfashion.com',
      name: 'Admin User',
      role: 'ADMIN',
      pin_hash: hashPin('1234'),
      status: 'active',
    },
    {
      id: 'manager_001',
      email: 'manager@ksfashion.com',
      name: 'Manager User',
      role: 'MANAGER',
      pin_hash: hashPin('1234'),
      status: 'active',
    },
    {
      id: 'emp_001',
      email: 'employee@ksfashion.com',
      name: 'Employee User',
      role: 'EMP',
      pin_hash: hashPin('1234'),
      status: 'active',
    },
  ];

  console.log('🌱 Seeding default users...\n');

  for (const user of defaultUsers) {
    try {
      const inserted = await db.run(
        `INSERT INTO users (id, email, name, role, pin_hash, status)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO NOTHING`,
        [user.id, user.email, user.name, user.role, user.pin_hash, user.status]
      );

      if (inserted > 0) {
        console.log(`✅ Created: ${user.email} (${user.role}) - PIN: 1234`);
      } else {
        console.log(`ℹ️  Skipped (exists): ${user.email}`);
      }
    } catch (error) {
      console.error(`❌ Failed to create ${user.email}:`, error);
    }
  }

  console.log('\n✅ Seeding complete!');
  console.log('\n📋 Default Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('ADMIN:');
  console.log('  Email: admin@ksfashion.com');
  console.log('  PIN:   1234');
  console.log('');
  console.log('MANAGER:');
  console.log('  Email: manager@ksfashion.com');
  console.log('  PIN:   1234');
  console.log('');
  console.log('EMPLOYEE:');
  console.log('  Email: employee@ksfashion.com');
  console.log('  PIN:   1234');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Run if called directly
if (require.main === module) {
  seedUsers()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}
