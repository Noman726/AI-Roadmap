import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Also export as 'db' for backward compatibility
export const db = prisma;

/**
 * Resolve the actual Prisma user ID from a Firebase UID.
 * Firebase Auth uses its own UIDs, but Prisma User records have CUID-based IDs.
 * This function tries to find the user by ID first, then by email as fallback.
 * Returns the Prisma user ID that owns database records.
 */
export async function resolveDbUserId(firebaseUid: string, email?: string | null): Promise<string | null> {
  // Try finding user by the provided ID first
  const directUser = await prisma.user.findUnique({ where: { id: firebaseUid } });
  if (directUser) return directUser.id;

  // If email is provided, look up by email
  if (email) {
    const userByEmail = await prisma.user.findUnique({ where: { email } });
    if (userByEmail) return userByEmail.id;
  }

  // Last resort: find any user that has a roadmap (for single-user dev scenarios)
  const roadmap = await prisma.roadmap.findFirst({
    select: { userId: true },
  });
  if (roadmap) return roadmap.userId;

  return null;
}

