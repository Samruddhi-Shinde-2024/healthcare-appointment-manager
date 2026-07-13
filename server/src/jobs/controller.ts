import type { Request, Response } from 'express';

import { sendSuccess } from '../common/api-response.js';
import type { BackgroundJobsService } from './service.js';
import type { ProcessJobsInput } from './validation.js';

export class BackgroundJobsController {
  public constructor(private readonly backgroundJobsService: BackgroundJobsService) {}

  public processDueJobs = async (request: Request, response: Response): Promise<void> => {
    const result = await this.backgroundJobsService.processDueJobs(
      (request.body as ProcessJobsInput).limit,
    );
    sendSuccess(response, 200, result);
  };
}
