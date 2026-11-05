-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "analytics";

-- CreateEnum
CREATE TYPE "control"."Role" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "control"."AccountStatus" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "control"."CredentialStatus" AS ENUM ('active', 'revoked');

-- CreateTable
CREATE TABLE "control"."account" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "role" "control"."Role" NOT NULL DEFAULT 'user',
    "status" "control"."AccountStatus" NOT NULL DEFAULT 'active',
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control"."session" (
    "id_hash" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "csrf_token" TEXT NOT NULL,
    "idle_expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id_hash")
);

-- CreateTable
CREATE TABLE "control"."tenant" (
    "id" TEXT NOT NULL,
    "department_owner" TEXT NOT NULL,
    "privacy_notice_url" TEXT NOT NULL,
    "retention_days" INTEGER NOT NULL DEFAULT 396,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control"."entitlement" (
    "account_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entitlement_pkey" PRIMARY KEY ("account_id","tenant_id")
);

-- CreateTable
CREATE TABLE "control"."producer_credential" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "secret_hash" TEXT NOT NULL,
    "status" "control"."CredentialStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "producer_credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control"."allowed_property_key" (
    "tenant_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "allowed_property_key_pkey" PRIMARY KEY ("tenant_id","key")
);

-- CreateTable
CREATE TABLE "analytics"."event" (
    "tenant_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "ingest_date" DATE NOT NULL,
    "ingest_ts" TIMESTAMP(3) NOT NULL,
    "event_ts" TIMESTAMP(3) NOT NULL,
    "event_date" DATE NOT NULL,
    "event_type" TEXT NOT NULL,
    "subject_id" TEXT,
    "country" TEXT,
    "browser_family" TEXT,
    "os_family" TEXT,
    "properties" JSONB NOT NULL,
    "contract_version" TEXT NOT NULL,
    "credential_id" TEXT NOT NULL,

    CONSTRAINT "event_pkey" PRIMARY KEY ("tenant_id","event_id")
);

-- CreateTable
CREATE TABLE "analytics"."dedup_key" (
    "tenant_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dedup_key_pkey" PRIMARY KEY ("tenant_id","event_id")
);

-- CreateTable
CREATE TABLE "analytics"."agg_daily" (
    "tenant_id" TEXT NOT NULL,
    "event_date" DATE NOT NULL,
    "event_type" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "browser_family" TEXT NOT NULL,
    "os_family" TEXT NOT NULL,
    "subject_key" TEXT NOT NULL,
    "event_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "agg_daily_pkey" PRIMARY KEY ("tenant_id","event_date","event_type","country","browser_family","os_family","subject_key")
);

-- CreateTable
CREATE TABLE "analytics"."dead_letter" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "credential_id" TEXT NOT NULL,
    "reason_code" TEXT NOT NULL,
    "field_path" TEXT,
    "dead_lettered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dead_letter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics"."ingest_stats_minute" (
    "tenant_id" TEXT NOT NULL,
    "minute" TIMESTAMP(3) NOT NULL,
    "accepted" INTEGER NOT NULL DEFAULT 0,
    "duplicates" INTEGER NOT NULL DEFAULT 0,
    "dead_lettered" INTEGER NOT NULL DEFAULT 0,
    "dropped_keys" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ingest_stats_minute_pkey" PRIMARY KEY ("tenant_id","minute")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_username_key" ON "control"."account"("username");

-- CreateIndex
CREATE INDEX "session_account_id_idx" ON "control"."session"("account_id");

-- CreateIndex
CREATE INDEX "entitlement_tenant_id_idx" ON "control"."entitlement"("tenant_id");

-- CreateIndex
CREATE INDEX "producer_credential_tenant_id_idx" ON "control"."producer_credential"("tenant_id");

-- CreateIndex
CREATE INDEX "event_tenant_id_subject_id_idx" ON "analytics"."event"("tenant_id", "subject_id");

-- CreateIndex
CREATE INDEX "event_tenant_id_ingest_ts_idx" ON "analytics"."event"("tenant_id", "ingest_ts");

-- CreateIndex
CREATE INDEX "dedup_key_first_seen_at_idx" ON "analytics"."dedup_key"("first_seen_at");

-- CreateIndex
CREATE INDEX "agg_daily_tenant_id_event_date_idx" ON "analytics"."agg_daily"("tenant_id", "event_date");

-- CreateIndex
CREATE INDEX "dead_letter_tenant_id_dead_lettered_at_idx" ON "analytics"."dead_letter"("tenant_id", "dead_lettered_at");

-- CreateIndex
CREATE INDEX "dead_letter_expires_at_idx" ON "analytics"."dead_letter"("expires_at");

-- AddForeignKey
ALTER TABLE "control"."session" ADD CONSTRAINT "session_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "control"."account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control"."entitlement" ADD CONSTRAINT "entitlement_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "control"."account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control"."entitlement" ADD CONSTRAINT "entitlement_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "control"."tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control"."producer_credential" ADD CONSTRAINT "producer_credential_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "control"."tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control"."allowed_property_key" ADD CONSTRAINT "allowed_property_key_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "control"."tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
