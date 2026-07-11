import type { Request, Response } from 'express';

import { sendSuccess } from '../common/api-response.js';
import { ApplicationError } from '../errors/application-error.js';
import type { AuthService } from './service.js';
import type { LoginInput, LogoutInput, RefreshTokenInput, RegisterInput } from './validation.js';

export class AuthController {
  public constructor(private readonly authService: AuthService) {}

  public register = async (request: Request, response: Response): Promise<void> => {
    const result = await this.authService.register(request.body as RegisterInput);
    sendSuccess(response, 201, result);
  };

  public login = async (request: Request, response: Response): Promise<void> => {
    const result = await this.authService.login(request.body as LoginInput);
    sendSuccess(response, 200, result);
  };

  public refresh = async (request: Request, response: Response): Promise<void> => {
    const result = await this.authService.refresh(request.body as RefreshTokenInput);
    sendSuccess(response, 200, result);
  };

  public logout = async (request: Request, response: Response): Promise<void> => {
    await this.authService.logout(request.body as LogoutInput);
    sendSuccess(response, 200, {
      message: 'Logged out successfully.',
    });
  };

  public me = async (request: Request, response: Response): Promise<void> => {
    if (request.user === undefined) {
      throw new ApplicationError('Authentication is required.', 401, 'AUTHENTICATION_REQUIRED');
    }

    const user = await this.authService.getCurrentUser(request.user.id);
    sendSuccess(response, 200, user);
  };
}
