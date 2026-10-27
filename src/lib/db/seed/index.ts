import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { categories } from '../schema';

dotenv.config({ path: '.env.local' });
dotenv.config();

const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL is required for seeding.');
  process.exit(1);
}

const safeConnectionString: string = connectionString;

const DEFAULT_VIETNAMESE_CATEGORIES = [
  // Chi tiêu (EXPENSE)
  { name: 'Ăn uống', type: 'EXPENSE' as const, icon: 'Utensils', color: '#f97316' },
  { name: 'Di chuyển', type: 'EXPENSE' as const, icon: 'Car', color: '#3b82f6' },
  { name: 'Mua sắm', type: 'EXPENSE' as const, icon: 'ShoppingBag', color: '#ec4899' },
  { name: 'Hóa đơn & Tiện ích', type: 'EXPENSE' as const, icon: 'FileText', color: '#eab308' },
  { name: 'Nhà ở', type: 'EXPENSE' as const, icon: 'Home', color: '#8b5cf6' },
  { name: 'Giải trí', type: 'EXPENSE' as const, icon: 'Film', color: '#06b6d4' },
  { name: 'Sức khỏe', type: 'EXPENSE' as const, icon: 'HeartPulse', color: '#ef4444' },
  { name: 'Giáo dục', type: 'EXPENSE' as const, icon: 'GraduationCap', color: '#10b981' },

  // Thu nhập (INCOME)
  { name: 'Lương', type: 'INCOME' as const, icon: 'Banknote', color: '#22c55e' },
  { name: 'Thưởng', type: 'INCOME' as const, icon: 'Award', color: '#14b8a6' },
  { name: 'Đầu tư', type: 'INCOME' as const, icon: 'TrendingUp', color: '#6366f1' },
  { name: 'Thu nhập khác', type: 'INCOME' as const, icon: 'Coins', color: '#84cc16' },
];

async function seed() {
  console.log('🌱 Seeding default Vietnamese financial categories into Neon DB...');
  const client = postgres(safeConnectionString, { max: 1, ssl: { rejectUnauthorized: false } });
  const db = drizzle(client);

  try {
    for (const cat of DEFAULT_VIETNAMESE_CATEGORIES) {
      await db
        .insert(categories)
        .values({
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
          isDefault: true,
          userId: null,
        })
        .onConflictDoNothing();
    }
    console.log('✅ Default categories seeded successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
