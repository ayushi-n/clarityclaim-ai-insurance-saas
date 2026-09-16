import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  (process.env.DATABASE_URL
    ? new PrismaClient()
    : (new Proxy({} as PrismaClient, {
        get: () =>
          new Proxy(() => {}, {
            get: () => () => Promise.resolve(null),
            apply: () => Promise.resolve(null),
          }),
      }) as unknown as PrismaClient))

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db