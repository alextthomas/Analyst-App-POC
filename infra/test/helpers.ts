import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { createSandboxApp } from "../lib/sandbox-app";

/** Dummy values only: no real account id, email or AMI id ever appears in the repo. */
export const DUMMY_CONTEXT: Record<string, unknown> = {
  dataClassification: "synthetic",
  account: "111111111111",
  alertEmail: "alerts@example.invalid",
  amiId: "ami-0123456789abcdef0",
  githubRepo: "alextthomas/Analyst-App-POC",
  githubEnvironment: "sandbox",
  expiresOn: "2026-12-03",
};

export function build(overrides: Record<string, unknown> = {}): {
  app: App;
  ci: Template;
  appStack: Template;
} {
  const app = new App({ context: { ...DUMMY_CONTEXT, ...overrides } });
  const { ci, appStack } = createSandboxApp(app);
  return {
    app,
    ci: Template.fromStack(ci),
    appStack: Template.fromStack(appStack),
  };
}

/** All statements of every IAM policy in a template, flattened. */
export function statementsOf(
  template: Template,
): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  for (const res of Object.values(template.findResources("AWS::IAM::Policy"))) {
    const doc = (
      res as {
        Properties: {
          PolicyDocument: { Statement: Array<Record<string, unknown>> };
        };
      }
    ).Properties.PolicyDocument;
    out.push(...doc.Statement);
  }
  return out;
}
