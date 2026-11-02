import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { IsIn, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import type {
  Account,
  AccountList,
  AllowedKey,
  AllowedKeyList,
  DeadLetterPage,
  Entitlement,
  EntitlementList,
  IngestionHealth,
  ProducerCredential,
  ProducerCredentialIssued,
  ProducerCredentialList,
  Tenant,
  TenantList,
} from '@ea/contracts';
import { PROPERTY_KEY_PATTERN, TENANT_ID_PATTERN } from '@ea/contracts';
import { RequireAdmin } from '../auth/auth.guard';
import { AdminService } from './admin.service';

class TenantCreateDto {
  @Matches(TENANT_ID_PATTERN)
  tenantId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  departmentOwner!: string;

  @IsString()
  @Matches(/^https:\/\/.+/)
  @MaxLength(2048)
  privacyNoticeUrl!: string;
}

class AccountCreateDto {
  @Matches(/^[a-z0-9-]{3,40}$/)
  username!: string;

  @IsIn(['user', 'admin'])
  role!: 'user' | 'admin';

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}

class AllowedKeyCreateDto {
  @Matches(PROPERTY_KEY_PATTERN)
  key!: string;
}

class CredentialCreateDto {
  @Matches(TENANT_ID_PATTERN)
  tenantId!: string;
}

@RequireAdmin()
@Controller('api/v1/admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  // ----- tenants -----
  @Get('tenants')
  async listTenants(): Promise<TenantList> {
    return { items: await this.admin.listTenants() };
  }

  @Post('tenants')
  async createTenant(@Body() dto: TenantCreateDto): Promise<Tenant> {
    return this.admin.createTenant(dto);
  }

  // ----- accounts -----
  @Get('accounts')
  async listAccounts(): Promise<AccountList> {
    return { items: await this.admin.listAccounts() };
  }

  @Post('accounts')
  async createAccount(@Body() dto: AccountCreateDto): Promise<Account> {
    return this.admin.createAccount(dto);
  }

  // ----- entitlements -----
  @Get('accounts/:accountId/entitlements')
  async listEntitlements(@Param('accountId') accountId: string): Promise<EntitlementList> {
    return { items: await this.admin.listEntitlements(accountId) };
  }

  @Post('accounts/:accountId/entitlements/:tenantId')
  async grantEntitlement(
    @Param('accountId') accountId: string,
    @Param('tenantId') tenantId: string,
  ): Promise<Entitlement> {
    return this.admin.grantEntitlement(accountId, tenantId);
  }

  @Delete('accounts/:accountId/entitlements/:tenantId')
  @HttpCode(204)
  async revokeEntitlement(
    @Param('accountId') accountId: string,
    @Param('tenantId') tenantId: string,
  ): Promise<void> {
    await this.admin.revokeEntitlement(accountId, tenantId);
  }

  // ----- producer credentials -----
  @Get('producer-credentials')
  async listCredentials(@Query('tenantId') tenantId?: string): Promise<ProducerCredentialList> {
    return { items: await this.admin.listCredentials(tenantId) };
  }

  @Post('producer-credentials')
  async createCredential(@Body() dto: CredentialCreateDto): Promise<ProducerCredentialIssued> {
    return this.admin.createCredential(dto.tenantId);
  }

  @Post('producer-credentials/:credentialId/revoke')
  async revokeCredential(@Param('credentialId') credentialId: string): Promise<ProducerCredential> {
    return this.admin.revokeCredential(credentialId);
  }

  // ----- allowed keys -----
  @Get('tenants/:tenantId/allowed-keys')
  async listAllowedKeys(@Param('tenantId') tenantId: string): Promise<AllowedKeyList> {
    return { items: await this.admin.listAllowedKeys(tenantId) };
  }

  @Post('tenants/:tenantId/allowed-keys')
  async addAllowedKey(
    @Param('tenantId') tenantId: string,
    @Body() dto: AllowedKeyCreateDto,
  ): Promise<AllowedKey> {
    return this.admin.addAllowedKey(tenantId, dto.key);
  }

  @Delete('tenants/:tenantId/allowed-keys/:key')
  @HttpCode(204)
  async removeAllowedKey(
    @Param('tenantId') tenantId: string,
    @Param('key') key: string,
  ): Promise<void> {
    await this.admin.removeAllowedKey(tenantId, key);
  }

  // ----- ingestion health + dead letters -----
  @Get('ingestion-health')
  async ingestionHealth(): Promise<IngestionHealth> {
    return this.admin.ingestionHealth();
  }

  @Get('tenants/:tenantId/dead-letters')
  async deadLetters(
    @Param('tenantId') tenantId: string,
    @Query('page') page?: string,
  ): Promise<DeadLetterPage> {
    const pageNum = Math.max(1, Number(page ?? 1) || 1);
    return this.admin.listDeadLetters(tenantId, pageNum);
  }
}
