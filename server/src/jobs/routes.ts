import { UserRole } from '@prisma/client';
import { Router, type Router as ExpressRouter } from 'express';

import { authenticate, authorize } from '../auth/middleware.js';
import { validateRequest } from '../common/validation.js';
import { AiRepository } from '../ai/repository.js';
import { AiService } from '../ai/service.js';
import { prisma } from '../config/prisma.js';
import { EmailService } from '../email/service.js';
import { BackgroundJobsController } from './controller.js';
import { BackgroundJobsRepository } from './repository.js';
import { BackgroundJobsService } from './service.js';
import { processJobsSchema } from './validation.js';

const backgroundJobsRepository = new BackgroundJobsRepository(prisma);
const emailService = new EmailService(prisma);
const aiRepository = new AiRepository(prisma);
const aiService = new AiService(aiRepository);
const backgroundJobsService = new BackgroundJobsService(
  backgroundJobsRepository,
  prisma,
  emailService,
  aiService,
);
const backgroundJobsController = new BackgroundJobsController(backgroundJobsService);

export const backgroundJobsRouter: ExpressRouter = Router();

backgroundJobsRouter.use(authenticate(), authorize(UserRole.ADMIN));
backgroundJobsRouter.post(
  '/process',
  validateRequest({ body: processJobsSchema }),
  backgroundJobsController.processDueJobs,
);
