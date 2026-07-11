import { UserRole } from '@prisma/client';
import { Router, type Router as ExpressRouter } from 'express';

import { authenticate, authorize } from '../auth/middleware.js';
import { idParamsSchema, validateRequest } from '../common/validation.js';
import { prisma } from '../config/prisma.js';
import { UsersRepository } from '../users/repository.js';
import { PatientsController } from './controller.js';
import { PatientsRepository } from './repository.js';
import { PatientsService } from './service.js';
import { patientListQuerySchema, updatePatientSchema } from './validation.js';

const patientsRepository = new PatientsRepository(prisma);
const usersRepository = new UsersRepository(prisma);
const patientsService = new PatientsService(patientsRepository, usersRepository);
const patientsController = new PatientsController(patientsService);

export const patientsRouter: ExpressRouter = Router();

patientsRouter.use(authenticate(), authorize(UserRole.ADMIN));
patientsRouter.get('/', validateRequest({ query: patientListQuerySchema }), patientsController.list);
patientsRouter.get('/:id', validateRequest({ params: idParamsSchema }), patientsController.get);
patientsRouter.patch(
  '/:id',
  validateRequest({ params: idParamsSchema, body: updatePatientSchema }),
  patientsController.update,
);
patientsRouter.delete(
  '/:id',
  validateRequest({ params: idParamsSchema }),
  patientsController.deactivate,
);
