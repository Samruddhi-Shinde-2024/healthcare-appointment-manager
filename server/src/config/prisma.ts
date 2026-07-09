import { PrismaClient } from '@prisma/client';

import { environment } from './environment.js';

export const prisma = new PrismaClient({
  log:
    environment.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
});
