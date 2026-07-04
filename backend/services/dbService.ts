import { PrismaClient } from '@prisma/client';

/**
 * Singleton instance of PrismaClient for Catalyst OS backend.
 * Configured with connection retry resilience for Neon PostgreSQL compute auto-suspend.
 */
declare global {
  // eslint-disable-next-line no-var
  var prismaSingleton: PrismaClient | undefined;
}

export const prisma = global.prismaSingleton || new PrismaClient({
  log: ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prismaSingleton = prisma;
}

/**
 * Safe Database Query Wrapper
 * Retries queries automatically if Neon PostgreSQL drops an idle connection (SqlState E57P01).
 */
export async function safeDbQuery<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      const isConnectionError = err?.message?.includes('terminating connection') || 
                                err?.code === 'E57P01' || 
                                err?.message?.includes('Closed connection');

      if (isConnectionError && attempt < retries) {
        console.warn(`[dbService] Retrying database operation (attempt ${attempt}/${retries})...`);
        try {
          await prisma.$disconnect();
          await prisma.$connect();
        } catch (e) {
          // ignore disconnect error
        }
        await new Promise(res => setTimeout(res, 500 * attempt));
      } else {
        throw err;
      }
    }
  }
  return fn();
}

export default prisma;
