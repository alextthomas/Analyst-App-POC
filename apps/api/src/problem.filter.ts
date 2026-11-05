import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import type { Problem } from '@ea/contracts';
import { errFields, logger } from './logger';

/** Translates thrown exceptions into RFC 9457-style problem+json responses. */
@Catch()
export class ProblemFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let code = 'internal-error';
    let title = 'Unexpected error';
    let detail: string | undefined;
    let errors: Problem['errors'];

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        title = body;
      } else if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        if (typeof b.code === 'string') code = b.code;
        if (typeof b.title === 'string') title = b.title;
        else if (typeof b.message === 'string') title = b.message;
        if (typeof b.detail === 'string') detail = b.detail;
        if (Array.isArray(b.errors)) errors = b.errors as Problem['errors'];
        // class-validator puts messages under `message` as an array.
        if (Array.isArray(b.message)) {
          code = 'validation-error';
          title = 'Request failed validation';
          errors = (b.message as string[]).map((m) => ({ field: '', code: 'validation', message: m }));
        }
      }
    } else {
      logger.error({ err: errFields(exception) }, 'Unhandled error');
    }

    const problem: Problem = {
      type: `https://github.com/alextthomas/Analyst-App-POC/problems/${code}`,
      title,
      status,
      code,
      ...(detail ? { detail } : {}),
      ...(errors ? { errors } : {}),
    };
    res.status(status).type('application/problem+json').send(problem);
  }
}
