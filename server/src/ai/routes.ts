import { UserRole, type UserRole as PrismaUserRole } from '@prisma/client';
import { Router, type Router as ExpressRouter } from 'express';

import { authenticate, authorize } from '../auth/middleware.js';
import { validateRequest } from '../common/validation.js';
import { prisma } from '../config/prisma.js';
import { AiController } from './controller.js';
import { AiRepository } from './repository.js';
import { AiService } from './service.js';
import { appointmentSummaryParamsSchema } from './validation.js';

const aiRepository = new AiRepository(prisma);
const aiService = new AiService(aiRepository);
const aiController = new AiController(aiService);
const summaryRoles: PrismaUserRole[] = [UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT];

export const aiRouter: ExpressRouter = Router();

aiRouter.use(authenticate(), authorize(...summaryRoles));
aiRouter.post(
  '/:id/pre-summary',
  validateRequest({ params: appointmentSummaryParamsSchema }),
  aiController.generatePreVisitSummary,
);
aiRouter.post(
  '/:id/post-summary',
  validateRequest({ params: appointmentSummaryParamsSchema }),
  aiController.generatePostVisitSummary,
);
