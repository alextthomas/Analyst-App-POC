import type { App } from "aws-cdk-lib";

export const REGION = "us-east-1";
export const APP_TAG = "event-analytics-sbx";
export const ALERT_TOPIC_NAME = "ea-sbx-alerts";
export const ECR_API_REPO = "ea-sbx/api";
export const ECR_WEB_REPO = "ea-sbx/web";
export const DOC_DEPLOY = "EaSbx-Deploy";
export const DOC_SEED = "EaSbx-Seed";
export const DOC_EMIT = "EaSbx-EmitDemo";
export const SSM_PREFIX = "/ea/sandbox";
export const SECRET_PREFIX = "ea/sandbox";

export interface SandboxConfig {
  readonly account: string;
  readonly alertEmail: string;
  readonly githubRepo: string;
  readonly githubEnvironment: string;
  readonly expiresOn: string;
  readonly existingOidcProviderArn: string | undefined;
}

export interface AppStackConfig {
  readonly amiId: string;
  readonly availabilityZone: string;
  readonly allowedCidrs: string[];
  readonly siteHost: string | undefined;
  readonly acmeCa: string;
  readonly dataVolumeSnapshotId: string | undefined;
  readonly instanceType: string;
}

function ctxString(app: App, key: string): string | undefined {
  const v: unknown = app.node.tryGetContext(key);
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v !== "string")
    throw new Error(`Context "${key}" must be a string`);
  return v;
}

/**
 * Guard that data stays synthetic (ADR-SBX-001 section 3.8): synthesis fails
 * unless context dataClassification is exactly "synthetic".
 */
export function assertSynthetic(app: App): void {
  const v: unknown = app.node.tryGetContext("dataClassification");
  if (v !== "synthetic") {
    throw new Error(
      `Refusing to synthesise: context dataClassification must be "synthetic" (got ${JSON.stringify(v)}). ` +
        "The sandbox must never hold real data.",
    );
  }
}

export function readSandboxConfig(app: App): SandboxConfig {
  assertSynthetic(app);
  const account = ctxString(app, "account") ?? process.env.CDK_DEFAULT_ACCOUNT;
  if (!account || !/^\d{12}$/.test(account)) {
    throw new Error(
      "AWS account id missing: pass -c account=<AWS_ACCOUNT_ID> or set CDK_DEFAULT_ACCOUNT (12 digits).",
    );
  }
  const alertEmail = ctxString(app, "alertEmail");
  if (!alertEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alertEmail)) {
    throw new Error(
      "Context alertEmail is required: pass -c alertEmail=<ALERT_EMAIL> at deploy time (never committed).",
    );
  }
  const expiresOn = ctxString(app, "expiresOn") ?? "2026-12-03";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresOn))
    throw new Error("Context expiresOn must be YYYY-MM-DD");
  const githubRepo =
    ctxString(app, "githubRepo") ?? "alextthomas/Analyst-App-POC";
  if (!/^[\w.-]+\/[\w.-]+$/.test(githubRepo))
    throw new Error("Context githubRepo must be <org>/<repo>");
  return {
    account,
    alertEmail,
    githubRepo,
    githubEnvironment: ctxString(app, "githubEnvironment") ?? "sandbox",
    expiresOn,
    existingOidcProviderArn: ctxString(app, "existingOidcProviderArn"),
  };
}

export function readAppStackConfig(app: App): AppStackConfig {
  const amiId = ctxString(app, "amiId");
  if (!amiId || !/^ami-[0-9a-f]{8,17}$/.test(amiId)) {
    throw new Error(
      "Context amiId is required (pinned Amazon Linux 2023 x86_64 AMI id, e.g. -c amiId=ami-...). " +
        "The AMI is pinned on purpose so a new image never silently replaces the instance.",
    );
  }
  const cidrsRaw = ctxString(app, "allowedCidrs");
  const allowedCidrs = (cidrsRaw ?? "0.0.0.0/0")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const c of allowedCidrs) {
    if (!/^\d{1,3}(\.\d{1,3}){3}\/\d{1,2}$/.test(c))
      throw new Error(`Invalid CIDR in allowedCidrs: ${c}`);
  }
  const snap = ctxString(app, "dataVolumeSnapshotId");
  if (snap !== undefined && !/^snap-[0-9a-f]{8,17}$/.test(snap))
    throw new Error("Invalid dataVolumeSnapshotId");
  return {
    amiId,
    availabilityZone: ctxString(app, "availabilityZone") ?? `${REGION}a`,
    allowedCidrs,
    siteHost: ctxString(app, "siteHost"),
    acmeCa: ctxString(app, "acmeCa") ?? "https://acme-v02.api.letsencrypt.org/directory",
    dataVolumeSnapshotId: snap,
    instanceType: ctxString(app, "instanceType") ?? "t3.small",
  };
}
