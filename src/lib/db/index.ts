import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || '';

declare global {
  // eslint-disable-next-line no-var
  var __dbClient: postgres.Sql | undefined;
}

let client: postgres.Sql;

if (process.env.NODE_ENV === 'production') {
  client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: { rejectUnauthorized: false },
  });
} else {
  if (!global.__dbClient) {
    global.__dbClient = postgres(connectionString, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
    });
  }
  client = global.__dbClient;
}

export const db = drizzle(client, { schema });
export { client };
