import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { loggerOptions } from './logger';
import { PrismaService } from './prisma.service';
import { ProblemFilter } from './problem.filter';
import { AuthGuard } from './auth/auth.guard';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { EntitlementService } from './dashboard/entitlement.service';
import { DashboardService } from './dashboard/dashboard.service';
import { DashboardController } from './dashboard/dashboard.controller';
import { AdminService } from './admin/admin.service';
import { AdminController } from './admin/admin.controller';
import { HealthController } from './health.controller';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        ...loggerOptions(),
        // Log only method/url path/status; no headers or bodies are serialised.
        serializers: {
          req: (req: { id?: unknown; method?: string; url?: string }) => ({
            id: req.id,
            method: req.method,
            url: (req.url ?? '').split('?')[0],
          }),
          res: (res: { statusCode?: number }) => ({ statusCode: res.statusCode }),
        },
      },
    }),
  ],
  controllers: [AuthController, DashboardController, AdminController, HealthController],
  providers: [
    PrismaService,
    AuthService,
    EntitlementService,
    DashboardService,
    AdminService,
    // Global session/auth guard: every route requires a session unless @Public().
    { provide: APP_GUARD, useClass: AuthGuard },
    // Global problem+json error formatter.
    { provide: APP_FILTER, useClass: ProblemFilter },
  ],
})
export class AppModule {}
