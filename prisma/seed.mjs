import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// ✅ Use the same adapter setup as prisma.service.ts
const user = process.env.DB_USER || 'fac20af5a2a5e8f28211d7c5cf769210232dd09aee86319f01b4e8d8e7733db5';
const password = process.env.DB_PASSWORD || 'sk_iFZVxtKiDMdjqsKC2ZjvT';
const host = process.env.DB_HOST || 'pooled.db.prisma.io';
const port = Number(process.env.DB_PORT) || 5432;
const database = process.env.DB_NAME || 'postgres';

const pool = new Pool({
  user,
  password,
  host,
  port,
  database,
  ssl: { rejectUnauthorized: false },
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('Unexpected idle client error:', err.message);
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding deliveries...');

  let business = await prisma.business.findFirst();

  if (!business) {
    console.log('Creating a business user...');
    const businessUser = await prisma.user.create({
      data: {
        email: 'business@movana.com',
        phone: '08098765432',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
        role: 'BUSINESS',
        business: {
          create: {
            businessName: 'Movana Test Business',
            businessType: 'Restaurant',
            address: '14 Admiralty Way, Lekki Phase 1, Lagos',
            isVerified: true,
          },
        },
      },
      include: { business: true },
    });
    business = businessUser.business;
  }

  if (!business) {
    console.error('❌ Could not create/find business');
    return;
  }

  console.log(`✅ Using business: ${business.businessName} (${business.id})`);

  const deliveries = [
    {
      trackingId: 'LD-2026-000101',
      pickupName: "Zainab's Kitchen",
      pickupPhone: '08023456789',
      pickupAddress: '22 Admiralty Way, Lekki Phase 1, Lagos',
      pickupLatitude: 6.4406,
      pickupLongitude: 3.4784,
      dropoffName: 'Chidi Okeke',
      dropoffPhone: '08034567890',
      dropoffAddress: '5 Freedom Way, Lekki Phase 1, Lagos',
      dropoffLatitude: 6.4478,
      dropoffLongitude: 3.4726,
      packageDescription: 'Jollof rice & grilled chicken, 3 packs',
      packageQuantity: 3,
      packageWeightKg: 2.5,
      deliveryType: 'EXPRESS',
      priority: 'NORMAL',
      status: 'PENDING',
      fee: 1800,
      riderEarnings: 1200,
      distanceKm: 3.4,
      etaWindowStart: '2:35 PM',
      etaWindowEnd: '2:55 PM',
    },
    {
      trackingId: 'LD-2026-000102',
      pickupName: 'TechHub Electronics',
      pickupPhone: '08045678901',
      pickupAddress: '10 Adeola Odeku St, Victoria Island, Lagos',
      pickupLatitude: 6.4281,
      pickupLongitude: 3.4219,
      dropoffName: 'Amaka Nwosu',
      dropoffPhone: '08056789012',
      dropoffAddress: '18 Ligali Ayorinde St, Victoria Island, Lagos',
      dropoffLatitude: 6.4335,
      dropoffLongitude: 3.4258,
      packageDescription: 'Laptop accessories & cables',
      packageQuantity: 1,
      packageWeightKg: 1.2,
      deliveryType: 'STANDARD',
      priority: 'HIGH',
      status: 'PENDING',
      fee: 2500,
      riderEarnings: 1800,
      distanceKm: 4.2,
      etaWindowStart: '3:10 PM',
      etaWindowEnd: '3:30 PM',
    },
    {
      trackingId: 'LD-2026-000103',
      pickupName: 'Green Bowl Salads',
      pickupPhone: '08056789012',
      pickupAddress: '3 Ozumba Mbadiwe Ave, Victoria Island, Lagos',
      pickupLatitude: 6.4304,
      pickupLongitude: 3.4219,
      dropoffName: 'Tunde Bakare',
      dropoffPhone: '08067890123',
      dropoffAddress: '15 Bourdillon Rd, Ikoyi, Lagos',
      dropoffLatitude: 6.4498,
      dropoffLongitude: 3.4356,
      packageDescription: 'Salad bowls & fresh juice, 2 packs',
      packageQuantity: 2,
      packageWeightKg: 1.0,
      deliveryType: 'EXPRESS',
      priority: 'NORMAL',
      status: 'PENDING',
      fee: 1500,
      riderEarnings: 1000,
      distanceKm: 5.1,
      etaWindowStart: '4:00 PM',
      etaWindowEnd: '4:20 PM',
    },
    {
      trackingId: 'LD-2026-000104',
      pickupName: 'Sweet Sensation',
      pickupPhone: '08078901234',
      pickupAddress: '24 Adeola Odeku St, Victoria Island, Lagos',
      pickupLatitude: 6.4285,
      pickupLongitude: 3.4235,
      dropoffName: 'Ngozi Eze',
      dropoffPhone: '08089012345',
      dropoffAddress: '7 Awolowo Rd, Ikoyi, Lagos',
      dropoffLatitude: 6.4478,
      dropoffLongitude: 3.4356,
      packageDescription: 'Meat pie & sausage rolls, 5 pieces',
      packageQuantity: 5,
      packageWeightKg: 1.5,
      deliveryType: 'STANDARD',
      priority: 'LOW',
      status: 'PENDING',
      fee: 1200,
      riderEarnings: 800,
      distanceKm: 2.8,
      etaWindowStart: '5:15 PM',
      etaWindowEnd: '5:35 PM',
    },
    {
      trackingId: 'LD-2026-000105',
      pickupName: 'Shoprite Ikeja',
      pickupPhone: '08090123456',
      pickupAddress: 'Ikeja City Mall, Alausa, Ikeja, Lagos',
      pickupLatitude: 6.6136,
      pickupLongitude: 3.3583,
      dropoffName: 'Bola Adeyemi',
      dropoffPhone: '08101234567',
      dropoffAddress: '10 Allen Avenue, Ikeja, Lagos',
      dropoffLatitude: 6.6018,
      dropoffLongitude: 3.3515,
      packageDescription: 'Groceries & household items',
      packageQuantity: 8,
      packageWeightKg: 12.0,
      deliveryType: 'STANDARD',
      priority: 'NORMAL',
      status: 'PENDING',
      fee: 3000,
      riderEarnings: 2200,
      distanceKm: 2.1,
      etaWindowStart: '6:00 PM',
      etaWindowEnd: '6:30 PM',
    },
  ];

  for (const delivery of deliveries) {
    const existing = await prisma.delivery.findUnique({
      where: { trackingId: delivery.trackingId },
    });

    if (existing) {
      console.log(`⏭️  Skipping ${delivery.trackingId} (already exists)`);
      continue;
    }

    await prisma.delivery.create({
      data: {
        ...delivery,
        businessId: business.id,
        statusHistory: {
          create: {
            status: 'CREATED',
          },
        },
      },
    });

    console.log(`✅ Created ${delivery.trackingId}`);
  }

  console.log('\n🎉 Seeding complete!');
  console.log(`📦 ${deliveries.length} deliveries available`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
