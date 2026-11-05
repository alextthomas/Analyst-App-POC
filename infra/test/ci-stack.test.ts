import { describe, expect, it } from "vitest";
import { Match } from "aws-cdk-lib/assertions";
import { build, statementsOf } from "./helpers";

describe("EaSbxCiStack", () => {
  const { ci } = build();

  it("creates the GitHub OIDC provider with audience sts.amazonaws.com", () => {
    ci.hasResourceProperties("AWS::IAM::OIDCProvider", {
      Url: "https://token.actions.githubusercontent.com",
      ClientIdList: ["sts.amazonaws.com"],
    });
  });

  it("trusts exactly repo:<org>/<repo>:environment:sandbox for both roles", () => {
    for (const roleName of ["ea-sbx-gha-app", "ea-sbx-gha-infra"]) {
      ci.hasResourceProperties("AWS::IAM::Role", {
        RoleName: roleName,
        AssumeRolePolicyDocument: {
          Statement: [
            Match.objectLike({
              Action: "sts:AssumeRoleWithWebIdentity",
              Condition: {
                StringEquals: {
                  "token.actions.githubusercontent.com:aud":
                    "sts.amazonaws.com",
                  "token.actions.githubusercontent.com:sub":
                    "repo:alextthomas/Analyst-App-POC:environment:sandbox",
                },
              },
            }),
          ],
        },
      });
    }
  });

  it("gives the app role no secretsmanager, iam, wildcard-ssm-run or AWS-RunShellScript access", () => {
    const json = JSON.stringify(statementsOf(ci));
    expect(json).not.toMatch(/secretsmanager:/);
    expect(json).not.toMatch(/AWS-RunShellScript/);
    expect(json).not.toMatch(/"iam:/);
    expect(json).not.toMatch(/"Action":"\*"/);
  });

  it("limits SendCommand to the three fixed documents and instances tagged ea:app", () => {
    const sends = statementsOf(ci).filter((s) =>
      JSON.stringify(s.Action).includes("ssm:SendCommand"),
    );
    expect(sends).toHaveLength(2);
    const docs = JSON.stringify(sends[0]?.Resource);
    for (const name of ["EaSbx-Deploy", "EaSbx-Seed", "EaSbx-EmitDemo"])
      expect(docs).toContain(`document/${name}`);
    expect(JSON.stringify(sends[1])).toContain("ssm:resourceTag/ea:app");
  });

  it("infra role may only assume the CDK bootstrap roles", () => {
    const stmts = statementsOf(ci).filter((s) =>
      JSON.stringify(s.Action).includes("sts:AssumeRole"),
    );
    expect(stmts).toHaveLength(1);
    const res = JSON.stringify(stmts[0]?.Resource);
    for (const r of [
      "deploy",
      "file-publishing",
      "image-publishing",
      "lookup",
    ]) {
      expect(res).toContain(`cdk-hnb659fds-${r}-role-111111111111-us-east-1`);
    }
  });

  it("creates the alert topic with an email subscription and a $40 budget", () => {
    ci.hasResourceProperties("AWS::SNS::Topic", { TopicName: "ea-sbx-alerts" });
    ci.hasResourceProperties("AWS::SNS::Subscription", { Protocol: "email" });
    ci.hasResourceProperties("AWS::Budgets::Budget", {
      Budget: Match.objectLike({
        BudgetName: "ea-sbx-monthly",
        BudgetLimit: { Amount: 40, Unit: "USD" },
      }),
      NotificationsWithSubscribers: Match.arrayWith([
        Match.objectLike({
          Notification: Match.objectLike({
            NotificationType: "FORECASTED",
            Threshold: 100,
          }),
        }),
      ]),
    });
  });

  it("imports an existing OIDC provider instead of creating one when asked", () => {
    const { ci: imported } = build({
      existingOidcProviderArn:
        "arn:aws:iam::111111111111:oidc-provider/token.actions.githubusercontent.com",
    });
    imported.resourceCountIs("AWS::IAM::OIDCProvider", 0);
  });
});
