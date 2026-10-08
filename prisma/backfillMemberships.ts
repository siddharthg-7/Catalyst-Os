/**
 * P1 Task 8 — idempotent founder-membership backfill.
 *
 * Every existing Startup already has an owner via `Startup.ownerId`. This script
 * gives that owner an explicit FOUNDER Membership so authorization can resolve
 * uniformly through User -> Membership -> Startup without changing ownerId.
 *
 * Safe to run repeatedly: it only creates rows that are missing and never
 * updates, deletes or resets anything.
 *
 *   npx tsx prisma/backfillMemberships.ts          # apply
 *   npx tsx prisma/backfillMemberships.ts --dry-run # report only
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

async function main() {
  const startups = await prisma.startup.findMany({
    select: { id: true, name: true, ownerId: true }
  });

  let created = 0;
  let alreadyPresent = 0;
  let skipped = 0;

  for (const startup of startups) {
    if (!startup.ownerId) {
      console.warn(`  ⚠ skip "${startup.name}" (${startup.id}): no ownerId`);
      skipped++;
      continue;
    }

    // The owner must exist as a User, or the foreign key would reject the row.
    const owner = await prisma.user.findUnique({ where: { id: startup.ownerId } });
    if (!owner) {
      console.warn(`  ⚠ skip "${startup.name}" (${startup.id}): owner ${startup.ownerId} not found`);
      skipped++;
      continue;
    }

    const existing = await prisma.membership.findUnique({
      where: { userId_startupId: { userId: startup.ownerId, startupId: startup.id } }
    });
    if (existing) {
      alreadyPresent++;
      continue;
    }

    if (dryRun) {
      console.log(`  + would create FOUNDER membership: ${owner.email} -> "${startup.name}"`);
      created++;
      continue;
    }

    try {
      await prisma.membership.create({
        data: {
          userId: startup.ownerId,
          startupId: startup.id,
          role: 'FOUNDER',
          status: 'ACTIVE'
        }
      });
      console.log(`  + FOUNDER membership: ${owner.email} -> "${startup.name}"`);
      created++;
    } catch (err: any) {
      // P2002: another run created it between the check and the write — benign.
      if (err?.code === 'P2002') {
        alreadyPresent++;
        continue;
      }
      // P2003: the startup or user was deleted mid-run. Skip rather than abort,
      // so one vanished row cannot stop the rest of the backfill.
      if (err?.code === 'P2003' || err?.code === 'P2025') {
        console.warn(`  ⚠ skip "${startup.name}" (${startup.id}): row disappeared during backfill`);
        skipped++;
        continue;
      }
      throw err;
    }
  }

  console.log(
    `\n${dryRun ? '[dry-run] ' : ''}Backfill complete: ` +
    `${created} created, ${alreadyPresent} already present, ${skipped} skipped, ${startups.length} startups scanned.`
  );
}

main()
  .catch(err => {
    console.error('Backfill failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
