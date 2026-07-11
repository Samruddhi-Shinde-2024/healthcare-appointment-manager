import { Router, type Router as ExpressRouter } from 'express';

import { prisma } from '../config/prisma.js';
import { validateRequest } from '../common/validation.js';
import { AuthController } from './controller.js';
import { authenticate } from './middleware.js';
import { AuthRepository } from './repository.js';
import { AuthService } from './service.js';
import { loginSchema, logoutSchema, refreshTokenSchema, registerSchema } from './validation.js';

const authRepository = new AuthRepository(prisma);
const authService = new AuthService(authRepository);
const authController = new AuthController(authService);

export const authRouter: ExpressRouter = Router();

authRouter.post('/register', validateRequest({ body: registerSchema }), authController.register);
authRouter.post('/login', validateRequest({ body: loginSchema }), authController.login);
authRouter.post('/refresh', validateRequest({ body: refreshTokenSchema }), authController.refresh);
authRouter.post('/logout', validateRequest({ body: logoutSchema }), authController.logout);
authRouter.get('/me', authenticate(), authController.me);
