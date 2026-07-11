import { UserRole, type UserRole as PrismaUserRole } from '@prisma/client';
import { Router, type Router as ExpressRouter } from 'express';

import { authenticate, authorize } from '../auth/middleware.js';
import { idParamsSchema, validateRequest } from '../common/validation.js';
import { prisma } from '../config/prisma.js';
import { AvailabilityController } from './controller.js';
import { AvailabilityRepository } from './repository.js';
import { AvailabilityService } from './service.js';
import {
  availabilityListQuerySchema,
  createAvailabilitySchema,
  updateAvailabilitySchema,
} from './validation.js';

const availabilityRepository = new AvailabilityRepository(prisma);
const availabilityService = new AvailabilityService(availabilityRepository);
const availabilityController = new AvailabilityController(availabilityService);
const allRoles: PrismaUserRole[] = [UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT];

export const doctorAvailabilityRouter: ExpressRouter = Router();
export const adminAvailabilityRouter: ExpressRouter = Router();

doctorAvailabilityRouter.use(authenticate(), authorize(...allRoles));
doctorAvailabilityRouter.get(
  '/:id/availability',
  validateRequest({ params: idParamsSchema, query: availabilityListQuerySchema }),
  availabilityController.list,
);

adminAvailabilityRouter.use(authenticate(), authorize(UserRole.ADMIN));
adminAvailabilityRouter.post(
  '/',
  validateRequest({ body: createAvailabilitySchema }),
  availabilityController.create,
);
adminAvailabilityRouter.patch(
  '/:id',
  validateRequest({ params: idParamsSchema, body: updateAvailabilitySchema }),
  availabilityController.update,
);
adminAvailabilityRouter.delete(
  '/:id',
  validateRequest({ params: idParamsSchema }),
  availabilityController.delete,
);
