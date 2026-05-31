import { PrismaClient, RoleType, ParkingSpaceType, VehicleType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding ParkNest...');

  // ── Roles ──────────────────────────────────────────────────────────────────

  const roles = await Promise.all(
    Object.values(RoleType).map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: {
          name,
          description: `${name} role`,
          permissions: getRolePermissions(name),
        },
      }),
    ),
  );
  const roleMap = Object.fromEntries(roles.map((r) => [r.name, r]));

  // ── Users ──────────────────────────────────────────────────────────────────

  const adminHash = await bcrypt.hash('Admin@1234', 12);
  const userHash = await bcrypt.hash('User@1234', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@parknest.com' },
    update: {},
    create: {
      email: 'admin@parknest.com',
      passwordHash: adminHash,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      profile: {
        create: { firstName: 'System', lastName: 'Admin', country: 'BD' },
      },
      roles: {
        create: { roleId: roleMap['ADMIN'].id },
      },
      wallet: { create: {} },
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: 'owner@parknest.com' },
    update: {},
    create: {
      email: 'owner@parknest.com',
      passwordHash: userHash,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      profile: {
        create: { firstName: 'Parking', lastName: 'Owner', country: 'BD' },
      },
      roles: {
        create: { roleId: roleMap['OWNER'].id },
      },
      wallet: { create: {} },
    },
  });

  const driver = await prisma.user.upsert({
    where: { email: 'driver@parknest.com' },
    update: {},
    create: {
      email: 'driver@parknest.com',
      passwordHash: userHash,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      profile: {
        create: { firstName: 'Test', lastName: 'Driver', country: 'BD' },
      },
      roles: {
        create: { roleId: roleMap['DRIVER'].id },
      },
      wallet: { create: { coinBalance: 100 } },
    },
  });

  const security = await prisma.user.upsert({
    where: { email: 'security@parknest.com' },
    update: {},
    create: {
      email: 'security@parknest.com',
      passwordHash: userHash,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      profile: {
        create: { firstName: 'Security', lastName: 'Guard', country: 'BD' },
      },
      roles: {
        create: { roleId: roleMap['SECURITY'].id },
      },
      wallet: { create: {} },
    },
  });

  // ── Parking Space ──────────────────────────────────────────────────────────

  const space = await prisma.parkingSpace.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      ownerId: owner.id,
      name: 'Gulshan Parking Center',
      description: 'Secure covered parking in Gulshan',
      spaceType: ParkingSpaceType.COVERED,
      status: 'ACTIVE',
      totalSlots: 10,
      availableSlots: 10,
      pricePerHour: 50,
      currency: 'BDT',
      addressLine1: '45 Gulshan Avenue',
      city: 'Dhaka',
      country: 'BD',
      latitude: 23.7925,
      longitude: 90.4078,
      amenities: ['CCTV', 'Security Guard', 'EV Charging'],
      vehicleTypes: [VehicleType.CAR, VehicleType.SUV, VehicleType.MOTORCYCLE],
      isInstantBook: true,
      approvedAt: new Date(),
      approvedBy: admin.id,
      images: {
        create: [
          {
            url: 'https://placehold.co/800x600?text=Gulshan+Parking',
            isPrimary: true,
            sortOrder: 0,
            uploadedBy: owner.id,
          },
        ],
      },
      polygon: {
        create: {
          coordinates: {
            type: 'Polygon',
            coordinates: [
              [
                [90.406, 23.791],
                [90.409, 23.791],
                [90.409, 23.794],
                [90.406, 23.794],
                [90.406, 23.791],
              ],
            ],
          },
          centerLat: 23.7925,
          centerLng: 90.4075,
          zoomLevel: 17,
        },
      },
      availability: {
        createMany: {
          data: [
            'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY',
            'FRIDAY', 'SATURDAY', 'SUNDAY',
          ].map((day) => ({
            type: 'REGULAR' as const,
            dayOfWeek: day as any,
            openTime: '06:00',
            closeTime: '23:00',
            isAvailable: true,
          })),
          skipDuplicates: true,
        },
      },
      securityContacts: {
        create: {
          userId: security.id,
          name: 'Security Guard',
          phone: '+8801700000000',
          isPrimary: true,
        },
      },
    },
  });

  console.log('Seed complete:', {
    admin: admin.email,
    owner: owner.email,
    driver: driver.email,
    security: security.email,
    space: space.name,
  });
}

function getRolePermissions(role: RoleType): string[] {
  const permissions: Record<RoleType, string[]> = {
    DRIVER: ['booking:create', 'booking:read', 'booking:cancel', 'review:create'],
    OWNER: ['space:create', 'space:update', 'space:delete', 'booking:read', 'payout:request'],
    SECURITY: ['booking:checkin', 'booking:checkout', 'booking:read'],
    ADMIN: ['*'],
    SUPER_ADMIN: ['*'],
  };
  return permissions[role];
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
