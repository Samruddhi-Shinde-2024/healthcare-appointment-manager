import { UserRole } from '@prisma/client';
import { Router, type Router as ExpressRouter } from 'express';

import { authenticate, authorize } from '../auth/middleware.js';
import { validateRequest } from '../common/validation.js';
import { prisma } from '../config/prisma.js';
import { BackgroundJobsController } from './controller.js';
import { BackgroundJobsRepository } from './repository.js';
import { BackgroundJobsService } from './service.js';
import { processJobsSchema } from './validation.js';

const backgroundJobsRepository = new BackgroundJobsRepository(prisma);
const backgroundJobsService = new BackgroundJobsService(backgroundJobsRepository);
const backgroundJobsController = new BackgroundJobsController(backgroundJobsService);

export const backgroundJobsRouter: ExpressRouter = Router();

backgroundJobsRouter.use(authenticate(), authorize(UserRole.ADMIN));
backgroundJobsRouter.post(
  '/process',
  validateRequest({ body: processJobsSchema }),
  backgroundJobsController.processDueJobs,
);
