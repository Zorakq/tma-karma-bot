import { PrismaClient } from '@prisma/client';

// Единственный экземпляр PrismaClient на процесс бота.
export const prisma = new PrismaClient();
