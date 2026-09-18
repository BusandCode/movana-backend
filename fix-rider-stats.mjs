import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({
  user: 'fac20af5a2a5e8f28211d7c5cf769210232dd09aee86319f01b4e8d8e7733db5',
  password: 'sk_iFZVxtKiDMdjqsKC2ZjvT',
  host: 'pooled.db.prisma.io',
  port: 5432,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🔍 Recalculating all rider stats...');

  const riders = await prisma.rider.findMany();

  for (const rider of riders) {
    const deliveries = await prisma.delivery.findMany({
      where: { riderId: rider.id },
    });

    const total = deliveries.length;
    const delivered = deliveries.filter((d) => d.status === 'DELIVERED').length;
    const successRate = total > 0 ? Math.round((delivered / total) * 100) : 0;

    await prisma.rider.update({
      where: { id: rider.id },
      data: {
        totalDeliveriesCompleted: delivered,
        successRate,
      },
    });

    console.log(
      `✅ ${rider.name}: ${delivered}/${total} delivered → ${successRate}%`
    );
  }

  console.log('\n🎉 Done!');
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
