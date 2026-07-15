import { UserRole, type UserRole as PrismaUserRole } from '@prisma/client';
import { Router, type Router as ExpressRouter } from 'express';

import { authenticate, authorize } from '../auth/middleware.js';
import { validateRequest } from '../common/validation.js';
import { prisma } from '../config/prisma.js';
import { CalendarController } from './controller.js';
import { GoogleCalendarProvider } from './provider.js';
import { CalendarRepository } from './repository.js';
import { CalendarService } from './service.js';
import { googleCalendarCallbackQuerySchema, googleCalendarCallbackSchema } from './validation.js';

const calendarRepository = new CalendarRepository(prisma);
const calendarProvider = new GoogleCalendarProvider();
const calendarService = new CalendarService(calendarRepository, calendarProvider);
const calendarController = new CalendarController(calendarService);
const calendarRoles: PrismaUserRole[] = [UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT];

export const calendarRouter: ExpressRouter = Router();

calendarRouter.get(
  '/google/callback',
  validateRequest({ query: googleCalendarCallbackQuerySchema }),
  calendarController.completeGoogleBrowserCallback,
);
calendarRouter.use(authenticate(), authorize(...calendarRoles));
calendarRouter.get('/google/connect', calendarController.connectGoogle);
calendarRouter.post(
  '/google/callback',
  validateRequest({ body: googleCalendarCallbackSchema }),
  calendarController.completeGoogleConnection,
);
calendarRouter.delete('/google', calendarController.disconnectGoogle);
