import compression from 'compression';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';

import { environment } from './config/environment.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFound } from './middleware/not-found.js';
import { requestContext } from './middleware/request-context.js';

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

  application.use(notFound);
  application.use(errorHandler);

  return application;
}
