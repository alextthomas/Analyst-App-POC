import { Controller, Get, HttpCode } from '@nestjs/common';
import type { HealthStatus } from '@ea/contracts';
import { Public } from './auth/auth.guard';
import { PrismaService } from './prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('live')
  live(): HealthStatus {
    return { status: 'ok' };
  }

  @Public()
  @Get('ready')
  @HttpCode(200)
  async ready(): Promise<HealthStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch {
      return { status: 'error' };
    }
  }
}
