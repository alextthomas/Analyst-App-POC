import { describe, expect, it } from "vitest";
import { Match } from "aws-cdk-lib/assertions";
import { build, statementsOf } from "./helpers";

type Rule = { FromPort?: number; ToPort?: number; CidrIp?: string };

function ingressRules(template: ReturnType<typeof build>["appStack"]): Rule[] {
  const rules: Rule[] = [];
  for (const sg of Object.values(
    template.findResources("AWS::EC2::SecurityGroup"),
  )) {
    const props = (sg as { Properties: { SecurityGroupIngress?: Rule[] } })
      .Properties;
    rules.push(...(props.SecurityGroupIngress ?? []));
  }
  for (const r of Object.values(
    template.findResources("AWS::EC2::SecurityGroupIngress"),
  )) {
    rules.push((r as { Properties: Rule }).Properties);
  }
  return rules;
}

describe("EaSbxAppStack", () => {
  const { appStack } = build();

  it("opens only 443 and 80 (never 22/5432/4222/8222/8080)", () => {
    const rules = ingressRules(appStack);
    expect(rules.length).toBeGreaterThan(0);
    const ports = new Set(rules.map((r) => r.FromPort));
    expect([...ports].sort((a, b) => Number(a) - Number(b))).toEqual([80, 443]);
    for (const r of rules) expect(r.FromPort).toBe(r.ToPort);
    for (const closed of [22, 5432, 4222, 8222, 8080])
      expect(ports.has(closed)).toBe(false);
  });

  it("honours an allowedCidrs list for 443 but keeps 80 open for ACME", () => {
    const { appStack: t } = build({ allowedCidrs: "203.0.113.0/24" });
    const rules = ingressRules(t);
    expect(
      rules.filter((r) => r.FromPort === 443).map((r) => r.CidrIp),
    ).toEqual(["203.0.113.0/24"]);
    expect(rules.filter((r) => r.FromPort === 80).map((r) => r.CidrIp)).toEqual(
      ["0.0.0.0/0"],
    );
  });

  it("requires IMDSv2 with hop limit 1 and has no key pair", () => {
    appStack.hasResourceProperties("AWS::EC2::Instance", {
      MetadataOptions: { HttpTokens: "required", HttpPutResponseHopLimit: 1 },
      KeyName: Match.absent(),
      InstanceType: "t3.small",
      ImageId: "ami-0123456789abcdef0",
    });
  });

  it("encrypts the root and the data volume, and snapshots the data volume on removal", () => {
    appStack.hasResourceProperties("AWS::EC2::Instance", {
      BlockDeviceMappings: [
        Match.objectLike({
          DeviceName: "/dev/xvda",
          Ebs: Match.objectLike({ Encrypted: true, VolumeType: "gp3" }),
        }),
      ],
    });
    appStack.hasResource("AWS::EC2::Volume", {
      Properties: Match.objectLike({
        Encrypted: true,
        VolumeType: "gp3",
        Size: 20,
      }),
      DeletionPolicy: "Snapshot",
    });
    appStack.hasResourceProperties("AWS::EC2::Volume", {
      Tags: Match.arrayWith([{ Key: "ea:backup", Value: "daily" }]),
    });
  });

  it("restores the data volume from a snapshot when dataVolumeSnapshotId is given", () => {
    const { appStack: t } = build({
      dataVolumeSnapshotId: "snap-0123456789abcdef0",
    });
    t.hasResourceProperties("AWS::EC2::Volume", {
      SnapshotId: "snap-0123456789abcdef0",
      Encrypted: true,
    });
  });

  it("keeps ECR immutable, scanned, and the bundle bucket private", () => {
    for (const name of ["ea-sbx/api", "ea-sbx/web"]) {
      appStack.hasResourceProperties("AWS::ECR::Repository", {
        RepositoryName: name,
        ImageTagMutability: "IMMUTABLE",
        ImageScanningConfiguration: { ScanOnPush: true },
      });
    }
    appStack.hasResourceProperties("AWS::S3::Bucket", {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      BucketEncryption: Match.anyValue(),
    });
  });

  it("generates secrets in Secrets Manager and never embeds a value", () => {
    const secrets = appStack.findResources("AWS::SecretsManager::Secret");
    expect(Object.keys(secrets)).toHaveLength(3);
    for (const s of Object.values(secrets)) {
      const props = (s as { Properties: Record<string, unknown> }).Properties;
      expect(props.GenerateSecretString).toBeDefined();
      expect(props.SecretString).toBeUndefined();
    }
    const names = Object.values(secrets)
      .map((s) => (s as { Properties: { Name: string } }).Properties.Name)
      .sort();
    expect(names).toEqual([
      "ea/sandbox/postgres",
      "ea/sandbox/seed-admin",
      "ea/sandbox/seed-analyst",
    ]);
  });

  it("hard-codes the data-classification parameter to synthetic", () => {
    appStack.hasResourceProperties("AWS::SSM::Parameter", {
      Name: "/ea/sandbox/data-classification",
      Value: "synthetic",
    });
  });

  it("defaults the ACME CA parameter to Let's Encrypt production and allows a staging override", () => {
    appStack.hasResourceProperties("AWS::SSM::Parameter", {
      Name: "/ea/sandbox/acme-ca",
      Value: "https://acme-v02.api.letsencrypt.org/directory",
    });
    const { appStack: t } = build({
      acmeCa: "https://acme-staging-v02.api.letsencrypt.org/directory",
    });
    t.hasResourceProperties("AWS::SSM::Parameter", {
      Name: "/ea/sandbox/acme-ca",
      Value: "https://acme-staging-v02.api.letsencrypt.org/directory",
    });
  });

  it("defines the three fixed SSM documents and validates imageTag as a 40-char SHA", () => {
    for (const name of ["EaSbx-Deploy", "EaSbx-Seed", "EaSbx-EmitDemo"]) {
      appStack.hasResourceProperties("AWS::SSM::Document", {
        Name: name,
        Content: Match.objectLike({
          parameters: {
            imageTag: Match.objectLike({ allowedPattern: "^[0-9a-f]{40}$" }),
          },
        }),
      });
    }
  });

  it("gives the instance role least privilege: no ec2/iam, no S3 or ECR writes, secrets limited to 3 ARNs", () => {
    const stmts = statementsOf(appStack);
    const json = JSON.stringify(stmts);
    expect(json).not.toMatch(/"ec2:/);
    expect(json).not.toMatch(/"iam:/);
    expect(json).not.toMatch(/s3:Put/);
    expect(json).not.toMatch(/ecr:PutImage/);
    const sm = stmts.filter((s) =>
      JSON.stringify(s.Action).includes("secretsmanager:"),
    );
    expect(sm).toHaveLength(1);
    expect(sm[0]?.Action).toBe("secretsmanager:GetSecretValue");
    expect(sm[0]?.Resource).toHaveLength(3);
  });

  it("retains logs for 14 days in /ea/sandbox/* groups", () => {
    for (const svc of [
      "api",
      "ingest",
      "web",
      "postgres",
      "nats",
      "ssm-sessions",
    ]) {
      appStack.hasResourceProperties("AWS::Logs::LogGroup", {
        LogGroupName: `/ea/sandbox/${svc}`,
        RetentionInDays: 14,
      });
    }
  });

  it("has recover + SNS alarm, availability health check, worker-failure filter and daily DLM policy", () => {
    appStack.hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmName: "ea-sbx-status-check-system",
      AlarmActions: Match.arrayWith([
        Match.objectLike({ "Fn::Join": Match.anyValue() }),
      ]),
    });
    appStack.hasResourceProperties("AWS::Route53::HealthCheck", {
      HealthCheckConfig: Match.objectLike({
        Type: "HTTPS_STR_MATCH",
        Port: 443,
        ResourcePath: "/health/ready",
        SearchString: '"status":"ok"',
      }),
    });
    appStack.hasResourceProperties("AWS::Logs::MetricFilter", {
      FilterPattern: '"Ingestion worker failed"',
    });
    appStack.hasResourceProperties("AWS::DLM::LifecyclePolicy", {
      PolicyDetails: Match.objectLike({
        TargetTags: [{ Key: "ea:backup", Value: "daily" }],
        Schedules: [Match.objectLike({ RetainRule: { Count: 7 } })],
      }),
    });
  });

  it("uses one AZ, one public subnet and no NAT gateway", () => {
    appStack.resourceCountIs("AWS::EC2::NatGateway", 0);
    appStack.resourceCountIs("AWS::EC2::Subnet", 1);
    appStack.hasResourceProperties("AWS::EC2::VPCEndpoint", {
      VpcEndpointType: "Gateway",
    });
  });

  it("derives an sslip.io site host from the Elastic IP when no siteHost is given", () => {
    const json =
      JSON.stringify(appStack.findParameters("*")) +
      JSON.stringify(appStack.findResources("AWS::SSM::Parameter"));
    expect(json).toContain(".sslip.io");
    const { appStack: t } = build({ siteHost: "ea.example.invalid" });
    t.hasResourceProperties("AWS::SSM::Parameter", {
      Name: "/ea/sandbox/site-host",
      Value: "ea.example.invalid",
    });
  });
});

describe("guards", () => {
  it("fails to synthesise when dataClassification is not synthetic", () => {
    expect(() => build({ dataClassification: "production" })).toThrow(
      /synthetic/,
    );
    expect(() => build({ dataClassification: undefined })).toThrow(/synthetic/);
  });

  it("requires alertEmail, account and amiId from context", () => {
    expect(() => build({ alertEmail: undefined })).toThrow(/alertEmail/);
    expect(() => build({ account: undefined })).toThrow(/account/);
    expect(() => build({ amiId: undefined })).toThrow(/amiId/);
    expect(() => build({ amiId: "not-an-ami" })).toThrow(/amiId/);
  });

  it("tags every stack with data classification, exception and expiry", () => {
    const { app } = build();
    const assembly = app.synth();
    for (const stack of assembly.stacks) {
      expect(stack.tags).toMatchObject({
        "ea:data-classification": "synthetic",
        "ea:exception": "ADR-SBX-001",
        "ea:expires": "2026-12-03",
        "ea:app": "event-analytics-sbx",
      });
    }
  });

  it("contains no secret-looking literal and no dummy values leak into the repo", () => {
    const { appStack } = build();
    const json = JSON.stringify(appStack.toJSON());
    expect(json).not.toMatch(/"SecretString"/);
    expect(json).not.toMatch(/AKIA[0-9A-Z]{16}/);
  });
});
