import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const passwordHash =
    '$2b$12$U1h8mPcis/2IGqAtdrBePuF5Vgie..tHpynWUMTBG7xGmdxI7v0E2';

  const emails = [
    'admin@healthcare.local',
    'arjun.mehta@healthcare.local',
    'samir.malhotra@healthcare.local',
    'kabir.sen@healthcare.local',
    'mira.kapoor@healthcare.local',
    'nisha.rao@healthcare.local',
  ];

  for (const email of emails) {
    await prisma.user.update({
      where: { email },
      data: { passwordHash },
    });
    console.log(`Updated password for ${email}`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });