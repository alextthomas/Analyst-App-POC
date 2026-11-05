import { Tags, type App } from "aws-cdk-lib";
import { EaSbxAppStack } from "./app-stack";
import { EaSbxCiStack } from "./ci-stack";
import {
  APP_TAG,
  readAppStackConfig,
  readSandboxConfig,
  REGION,
} from "./config";

/**
 * Builds both stacks inside an App. Everything environment-specific (account id,
 * alert email, AMI id) comes from CDK context or CDK_DEFAULT_ACCOUNT, never from files.
 */
export function createSandboxApp(app: App): {
  ci: EaSbxCiStack;
  appStack: EaSbxAppStack;
} {
  const sandbox = readSandboxConfig(app);
  const env = { account: sandbox.account, region: REGION };

  const ci = new EaSbxCiStack(app, "EaSbxCiStack", {
    env,
    sandbox,
    description:
      "EA sandbox POC (ADR-SBX-001): GitHub OIDC provider, deploy roles, alerts, budget",
  });
  const appStack = new EaSbxAppStack(app, "EaSbxAppStack", {
    env,
    sandbox,
    app: readAppStackConfig(app),
    description:
      "EA sandbox POC (ADR-SBX-001): single EC2 host running docker compose",
  });
  appStack.addStackDependency(ci);

  Tags.of(app).add("ea:app", APP_TAG);
  Tags.of(app).add("ea:data-classification", "synthetic");
  Tags.of(app).add("ea:exception", "ADR-SBX-001");
  Tags.of(app).add("ea:expires", sandbox.expiresOn);
  return { ci, appStack };
}
