import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
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
