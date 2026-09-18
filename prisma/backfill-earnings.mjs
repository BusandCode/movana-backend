import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const user = 'fac20af5a2a5e8f28211d7c5cf769210232dd09aee86319f01b4e8d8e7733db5';
const password = 'sk_iFZVxtKiDMdjqsKC2ZjvT';
const host = 'pooled.db.prisma.io';
const port = 5432;
const database = 'postgres';

const pool = new Pool({
  user,
  password,
  host,
  port,
  database,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🔍 Finding DELIVERED deliveries without earnings...');

  const delivered = await prisma.delivery.findMany({
    where: {
      status: 'DELIVERED',
      riderId: { not: null },
    },
  });

  console.log(`Found ${delivered.length} delivered deliveries`);

  let created = 0;
  let skipped = 0;

  for (const delivery of delivered) {
    const existing = await prisma.earningsEntry.findFirst({
      where: { deliveryId: delivery.id },
    });

    if (existing) {
      console.log(`⏭️  Skipping ${delivery.trackingId} (already has earning)`);
      skipped++;
      continue;
    }

    await prisma.earningsEntry.create({
      data: {
        riderId: delivery.riderId,
        deliveryId: delivery.id,
        amount: delivery.riderEarnings,
        note: `Delivery ${delivery.trackingId}`,
      },
    });

    console.log(`✅ Created earning for ${delivery.trackingId}: ₦${delivery.riderEarnings}`);
    created++;
  }

  console.log(`\n🎉 Backfill complete!`);
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });