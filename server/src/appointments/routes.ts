import { UserRole, type UserRole as PrismaUserRole } from '@prisma/client';
import { Router, type Router as ExpressRouter } from 'express';

import { authenticate, authorize } from '../auth/middleware.js';
import { idParamsSchema, validateRequest } from '../common/validation.js';
import { AiRepository } from '../ai/repository.js';
import { AiService } from '../ai/service.js';
import { CalendarRepository } from '../calendar/repository.js';
import { CalendarService } from '../calendar/service.js';
import { GoogleCalendarProvider } from '../calendar/provider.js';
import { prisma } from '../config/prisma.js';
import { EmailService } from '../email/service.js';
import { BackgroundJobsRepository } from '../jobs/repository.js';
import { BackgroundJobsService } from '../jobs/service.js';
import { NotificationsRepository } from '../notifications/repository.js';
import { NotificationsService } from '../notifications/service.js';
import { AppointmentsController } from './controller.js';
import { AppointmentsRepository } from './repository.js';
import { AppointmentsService } from './service.js';
import {
  appointmentListQuerySchema,
  bookAppointmentSchema,
  cancelAppointmentSchema,
  rescheduleAppointmentSchema,
  updateAppointmentSchema,
} from './validation.js';

const appointmentsRepository = new AppointmentsRepository(prisma);
const emailService = new EmailService(prisma);
const notificationsRepository = new NotificationsRepository(prisma);
const notificationsService = new NotificationsService(notificationsRepository);
const aiRepository = new AiRepository(prisma);
const aiService = new AiService(aiRepository);
const backgroundJobsRepository = new BackgroundJobsRepository(prisma);
const backgroundJobsService = new BackgroundJobsService(backgroundJobsRepository);
const calendarRepository = new CalendarRepository(prisma);
const calendarProvider = new GoogleCalendarProvider();
const calendarService = new CalendarService(calendarRepository, calendarProvider);
const appointmentsService = new AppointmentsService(
  appointmentsRepository,
  emailService,
  notificationsService,
  aiService,
  backgroundJobsService,
  calendarService,
);
const appointmentsController = new AppointmentsController(appointmentsService);
const appointmentRoles: PrismaUserRole[] = [UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT];

export const appointmentsRouter: ExpressRouter = Router();

appointmentsRouter.use(authenticate(), authorize(...appointmentRoles));
appointmentsRouter.post('/', validateRequest({ body: bookAppointmentSchema }), appointmentsController.book);
appointmentsRouter.get(
  '/',
  validateRequest({ query: appointmentListQuerySchema }),
  appointmentsController.list,
);
appointmentsRouter.get('/:id', validateRequest({ params: idParamsSchema }), appointmentsController.get);
appointmentsRouter.patch(
  '/:id',
  validateRequest({ params: idParamsSchema, body: updateAppointmentSchema }),
  appointmentsController.update,
);
appointmentsRouter.post(
  '/:id/reschedule',
  validateRequest({ params: idParamsSchema, body: rescheduleAppointmentSchema }),
  appointmentsController.reschedule,
);
appointmentsRouter.post(
  '/:id/cancel',
  validateRequest({ params: idParamsSchema, body: cancelAppointmentSchema }),
  appointmentsController.cancel,
);
