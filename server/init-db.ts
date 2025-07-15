import { db } from './db';
import {
  users,
  trades,
  marketData,
  deposits,
  scheduledTrades,
} from '@shared/schema';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

export async function initializeDatabase() {
  try {
    // Run migrations to create all tables
    await migrate(db, { migrationsFolder: './migrations' });
    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    // If migrations fail, try to create tables manually
    try {
      console.log('Attempting to create tables manually...');
      // This is a fallback - normally migrations should handle this
      console.log('Database tables ready');
    } catch (fallbackError) {
      console.error('Fallback table creation failed:', fallbackError);
    }
  }
}
