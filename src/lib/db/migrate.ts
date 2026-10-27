import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL or DIRECT_DATABASE_URL environment variable is not defined.');
  process.exit(1);
}

const safeConnectionString: string = connectionString;

async function runMigrations() {
  console.log('⏳ Running Neon PostgreSQL migrations with Drizzle...');
  const migrationClient = postgres(safeConnectionString, { max: 1, ssl: { rejectUnauthorized: false } });
  const db = drizzle(migrationClient);

  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✅ Migrations applied successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

runMigrations();
