import { PrismaClient } from '@prisma/client';

// Единственный экземпляр PrismaClient на процесс сервера.
export const prisma = new PrismaClient();
