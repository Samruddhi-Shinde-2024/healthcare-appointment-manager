import compression from 'compression';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';

import { authRouter } from './auth/routes.js';
import { appointmentsRouter } from './appointments/routes.js';
import { adminAvailabilityRouter, doctorAvailabilityRouter } from './availability/routes.js';
import { environment } from './config/environment.js';
import { doctorsRouter } from './doctors/routes.js';
import { leaveRouter } from './leave/routes.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFound } from './middleware/not-found.js';
import { requestContext } from './middleware/request-context.js';
import { patientsRouter } from './patients/routes.js';

export function createApplication(): Express {
  const application = express();

  application.disable('x-powered-by');
  application.set('trust proxy', 1);
  application.use(requestContext);
  application.use(helmet());
  application.use(
    cors({
      credentials: true,
      origin: environment.CLIENT_ORIGIN,
    }),
  );
  application.use(compression());
  application.use(express.json({ limit: '1mb' }));
  application.use(express.urlencoded({ extended: false, limit: '1mb' }));

  application.use('/auth', authRouter);
  application.use('/appointments', appointmentsRouter);
  application.use('/doctors', doctorAvailabilityRouter);
  application.use('/doctors/leave', leaveRouter);
  application.use('/admin/availability', adminAvailabilityRouter);
  application.use('/admin/doctors', doctorsRouter);
  application.use('/admin/patients', patientsRouter);

  application.use(notFound);
  application.use(errorHandler);

  return application;
}
