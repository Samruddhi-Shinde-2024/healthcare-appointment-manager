import { UserRole } from '@prisma/client';
import { Router, type Router as ExpressRouter } from 'express';

import { validateRequest, idParamsSchema } from '../common/validation.js';
import { prisma } from '../config/prisma.js';
import { authenticate, authorize } from '../auth/middleware.js';
import { UsersRepository } from '../users/repository.js';
import { DoctorsController } from './controller.js';
import { DoctorsRepository } from './repository.js';
import { DoctorsService } from './service.js';
import { createDoctorSchema, doctorListQuerySchema, updateDoctorSchema } from './validation.js';

const doctorsRepository = new DoctorsRepository(prisma);
const usersRepository = new UsersRepository(prisma);
const doctorsService = new DoctorsService(doctorsRepository, usersRepository);
const doctorsController = new DoctorsController(doctorsService);

export const doctorsRouter: ExpressRouter = Router();

doctorsRouter.use(authenticate(), authorize(UserRole.ADMIN));
doctorsRouter.post('/', validateRequest({ body: createDoctorSchema }), doctorsController.create);
doctorsRouter.get('/', validateRequest({ query: doctorListQuerySchema }), doctorsController.list);
doctorsRouter.get('/:id', validateRequest({ params: idParamsSchema }), doctorsController.get);
doctorsRouter.patch(
  '/:id',
  validateRequest({ params: idParamsSchema, body: updateDoctorSchema }),
  doctorsController.update,
);
doctorsRouter.delete(
  '/:id',
  validateRequest({ params: idParamsSchema }),
  doctorsController.deactivate,
);
