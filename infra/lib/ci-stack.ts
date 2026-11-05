import { CfnOutput, Duration, Stack, type StackProps } from "aws-cdk-lib";
import * as budgets from "aws-cdk-lib/aws-budgets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import type { Construct } from "constructs";
import {
  ALERT_TOPIC_NAME,
  APP_TAG,
  DOC_DEPLOY,
  DOC_EMIT,
  DOC_SEED,
  ECR_API_REPO,
  ECR_WEB_REPO,
  REGION,
  SSM_PREFIX,
  type SandboxConfig,
} from "./config";

const OIDC_HOST = "token.actions.githubusercontent.com";
export const CDK_QUALIFIER = "hnb659fds";

/** Deterministic bundle bucket name (shared with EaSbxAppStack without a cross-stack export). */
export function bundleBucketName(account: string): string {
  return `ea-sbx-bundle-${account}-${REGION}`;
}

export interface CiStackProps extends StackProps {
  readonly sandbox: SandboxConfig;
}

/**
 * Deployed ONCE, by hand, by the owner with admin/SSO credentials (breaks the
 * chicken-and-egg: the pipeline roles must exist before the pipeline can assume them).
 * Holds: GitHub OIDC provider, the two deploy roles, SNS alert topic, budget.
 */
export class EaSbxCiStack extends Stack {
  public readonly appRole: iam.Role;
  public readonly infraRole: iam.Role;
  public readonly alertTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: CiStackProps) {
    super(scope, id, props);
    const { sandbox } = props;
    const account = sandbox.account;

    // OIDC provider is created here; import an existing one via context existingOidcProviderArn.
    const providerArn =
      sandbox.existingOidcProviderArn ??
      new iam.OidcProviderNative(this, "GithubOidc", {
        url: `https://${OIDC_HOST}`,
        clientIds: ["sts.amazonaws.com"],
      }).oidcProviderArn;

    const sub = `repo:${sandbox.githubRepo}:environment:${sandbox.githubEnvironment}`;
    const trust = (): iam.WebIdentityPrincipal =>
      new iam.WebIdentityPrincipal(providerArn, {
        StringEquals: {
          [`${OIDC_HOST}:aud`]: "sts.amazonaws.com",
          [`${OIDC_HOST}:sub`]: sub,
        },
      });

    // App role: every deploy (image push, bundle upload, SSM run of fixed documents).
    this.appRole = new iam.Role(this, "AppRole", {
      roleName: "ea-sbx-gha-app",
      assumedBy: trust(),
      maxSessionDuration: Duration.hours(1),
      description:
        "GitHub Actions (environment sandbox): push images, upload bundle, run fixed SSM documents",
    });
    const repoArn = (name: string): string =>
      `arn:aws:ecr:${REGION}:${account}:repository/${name}`;
    const docArn = (name: string): string =>
      `arn:aws:ssm:${REGION}:${account}:document/${name}`;
    this.appRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "EcrAuth",
        actions: ["ecr:GetAuthorizationToken"],
        resources: ["*"],
      }),
    );
    this.appRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "EcrPush",
        actions: [
          "ecr:BatchCheckLayerAvailability",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage",
          "ecr:BatchGetImage",
          "ecr:DescribeImages",
        ],
        resources: [repoArn(ECR_API_REPO), repoArn(ECR_WEB_REPO)],
      }),
    );
    this.appRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "BundleUpload",
        actions: ["s3:PutObject"],
        resources: [`arn:aws:s3:::${bundleBucketName(account)}/releases/*`],
      }),
    );
    this.appRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "SsmSendFixedDocuments",
        actions: ["ssm:SendCommand"],
        resources: [docArn(DOC_DEPLOY), docArn(DOC_SEED), docArn(DOC_EMIT)],
      }),
    );
    this.appRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "SsmSendToTaggedInstance",
        actions: ["ssm:SendCommand"],
        resources: [`arn:aws:ec2:${REGION}:${account}:instance/*`],
        conditions: { StringEquals: { "ssm:resourceTag/ea:app": APP_TAG } },
      }),
    );
    this.appRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "SsmReadResults",
        actions: ["ssm:GetCommandInvocation", "ssm:ListCommandInvocations"],
        resources: ["*"],
      }),
    );
    this.appRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "SsmReadNonSecretParams",
        actions: ["ssm:GetParameter"],
        resources: [
          `arn:aws:ssm:${REGION}:${account}:parameter${SSM_PREFIX}/*`,
        ],
      }),
    );

    // Infra role: cdk deploy through the CDK bootstrap roles only.
    this.infraRole = new iam.Role(this, "InfraRole", {
      roleName: "ea-sbx-gha-infra",
      assumedBy: trust(),
      maxSessionDuration: Duration.hours(1),
      description:
        "GitHub Actions (environment sandbox): cdk diff/deploy through CDK bootstrap roles only",
    });
    this.infraRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "AssumeCdkBootstrapRoles",
        actions: ["sts:AssumeRole"],
        resources: [
          "deploy",
          "file-publishing",
          "image-publishing",
          "lookup",
        ].map(
          (r) =>
            `arn:aws:iam::${account}:role/cdk-${CDK_QUALIFIER}-${r}-role-${account}-${REGION}`,
        ),
      }),
    );

    // Alerts.
    this.alertTopic = new sns.Topic(this, "Alerts", {
      topicName: ALERT_TOPIC_NAME,
      displayName: "EA sandbox alerts",
    });
    this.alertTopic.addSubscription(
      new subs.EmailSubscription(sandbox.alertEmail),
    );
    this.alertTopic.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "AllowAlarmsAndBudgets",
        principals: [
          new iam.ServicePrincipal("cloudwatch.amazonaws.com"),
          new iam.ServicePrincipal("budgets.amazonaws.com"),
        ],
        actions: ["sns:Publish"],
        resources: [this.alertTopic.topicArn],
        conditions: { StringEquals: { "aws:SourceAccount": account } },
      }),
    );

    // Budget: $40/month actual; alerts at 50/80/100% actual and 100% forecast.
    const notification = (
      type: "ACTUAL" | "FORECASTED",
      threshold: number,
    ): budgets.CfnBudget.NotificationWithSubscribersProperty => ({
      notification: {
        notificationType: type,
        comparisonOperator: "GREATER_THAN",
        threshold,
        thresholdType: "PERCENTAGE",
      },
      subscribers: [{ subscriptionType: "EMAIL", address: sandbox.alertEmail }],
    });
    new budgets.CfnBudget(this, "MonthlyBudget", {
      budget: {
        budgetName: "ea-sbx-monthly",
        budgetType: "COST",
        timeUnit: "MONTHLY",
        budgetLimit: { amount: 40, unit: "USD" },
      },
      notificationsWithSubscribers: [
        notification("ACTUAL", 50),
        notification("ACTUAL", 80),
        notification("ACTUAL", 100),
        notification("FORECASTED", 100),
      ],
    });

    new CfnOutput(this, "AppRoleArn", {
      value: this.appRole.roleArn,
      description: "GitHub environment variable APP_ROLE_ARN",
    });
    new CfnOutput(this, "InfraRoleArn", {
      value: this.infraRole.roleArn,
      description: "GitHub environment variable INFRA_ROLE_ARN",
    });
    new CfnOutput(this, "BundleBucketName", {
      value: bundleBucketName(account),
      description: "GitHub environment variable BUNDLE_BUCKET",
    });
  }
}
