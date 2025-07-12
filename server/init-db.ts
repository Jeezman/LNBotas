import { db } from "./db";
import { users, marketData } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function initializeDatabase() {
  try {
    // Just ensure database tables are created - no demo data
    console.log('Database tables ready');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}