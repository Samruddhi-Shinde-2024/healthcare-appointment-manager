import { UserRole } from '@prisma/client';
import { Router, type Router as ExpressRouter } from 'express';

import { authenticate, authorize } from '../auth/middleware.js';
import { idParamsSchema, validateRequest } from '../common/validation.js';
import { prisma } from '../config/prisma.js';
import { LeaveController } from './controller.js';
import { LeaveRepository } from './repository.js';
import { LeaveService } from './service.js';
import { createLeaveSchema, leaveListQuerySchema, updateLeaveSchema } from './validation.js';

const leaveRepository = new LeaveRepository(prisma);
const leaveService = new LeaveService(leaveRepository);
const leaveController = new LeaveController(leaveService);

export const leaveRouter: ExpressRouter = Router();

leaveRouter.use(authenticate(), authorize(UserRole.ADMIN, UserRole.DOCTOR));
leaveRouter.post('/', validateRequest({ body: createLeaveSchema }), leaveController.create);
leaveRouter.get('/', validateRequest({ query: leaveListQuerySchema }), leaveController.list);
leaveRouter.patch(
  '/:id',
  validateRequest({ params: idParamsSchema, body: updateLeaveSchema }),
  leaveController.update,
);
leaveRouter.delete('/:id', validateRequest({ params: idParamsSchema }), leaveController.cancel);
