# Sandbox runbook (ADR-SBX-001)

Scope: the AWS sandbox POC described in `docs/sandbox/aws-poc-deployment.md`. Synthetic data only. Expires **2026-12-03**.
Region `us-east-1`. Agents never run any command in sections 1-3 or 11; the owner does, by hand. The pipeline deploys only after the GitHub `sandbox` environment reviewer approves.

Placeholders used below (never commit real values; they live in your shell and in GitHub environment variables):

| Placeholder        | Meaning                                                          |
| ------------------ | ---------------------------------------------------------------- |
| `<AWS_ACCOUNT_ID>` | the 12-digit id of the dedicated non-production account          |
| `<ADMIN_PROFILE>`  | your local AWS CLI profile with admin/SSO rights in that account |
| `<ALERT_EMAIL>`    | the address that receives SNS alarms and budget alerts           |
| `<AMI_ID>`         | the pinned Amazon Linux 2023 x86_64 AMI id (step 1.2)            |
| `<SHA>`            | a full 40-character commit SHA                                   |

Repo: `alextthomas/Analyst-App-POC`. Deploy branch: `deploy/sandbox-aws-poc`.

---

## 1. One-time bootstrap (owner, by hand)

Preconditions: Node 22 (`.nvmrc`), `npm ci` then `npm run prisma:generate` run at the repo root (`npm ci` deletes the generated Prisma client), AWS CLI v2, GitHub CLI (`gh auth login`), and an admin profile for the sandbox account. Check you are in the right account first:

```bash
aws sts get-caller-identity --profile <ADMIN_PROFILE>   # Account must equal <AWS_ACCOUNT_ID>
```

### 1.1 CDK bootstrap (account has none yet)

Run it from the **repo root**, not `infra/`: inside `infra/` the CLI picks up `cdk.json`, synthesises the sandbox app first and fails on the missing `alertEmail`/`amiId` context.

```bash
npx cdk bootstrap aws://<AWS_ACCOUNT_ID>/us-east-1 --profile <ADMIN_PROFILE> \
  --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess
```

`AdministratorAccess` as the CloudFormation execution policy is acceptable here only because this is a dedicated sandbox account (ADR section 3.5, recorded residual risk). To scope it instead, create a customer-managed policy limited to ec2, ecr, s3, ssm, secretsmanager, logs, cloudwatch, sns, route53, dlm, iam (roles named `ea-sbx-*` and CDK service roles), lambda and budgets, and pass its ARN. A scoped policy has not been written or tested in this repo.

Verify: `aws cloudformation describe-stacks --stack-name CDKToolkit --profile <ADMIN_PROFILE> --query "Stacks[0].StackStatus"` returns `CREATE_COMPLETE`.

### 1.2 Pin the AMI

```bash
aws ssm get-parameter --profile <ADMIN_PROFILE> --region us-east-1 \
  --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
  --query Parameter.Value --output text
```

Record the output as `<AMI_ID>`. It is pinned on purpose (a newer AMI must not silently replace the instance). It is passed as CDK context and stored as the GitHub variable `AMI_ID`, not committed.

### 1.3 Deploy `EaSbxCiStack` with the admin profile

This creates the GitHub OIDC provider (the account has none), the roles `ea-sbx-gha-app` and `ea-sbx-gha-infra`, the SNS topic `ea-sbx-alerts` (email subscription), and the $40/month budget `ea-sbx-monthly`. It is deployed once, by you, because the pipeline roles must exist before the pipeline can assume them.

```bash
cd infra
npx cdk diff   EaSbxCiStack --exclusively --profile <ADMIN_PROFILE> -c account=<AWS_ACCOUNT_ID> -c alertEmail=<ALERT_EMAIL> -c amiId=<AMI_ID>
npx cdk deploy EaSbxCiStack --exclusively --profile <ADMIN_PROFILE> -c account=<AWS_ACCOUNT_ID> -c alertEmail=<ALERT_EMAIL> -c amiId=<AMI_ID>
```

If the account turns out to already have the GitHub OIDC provider, add `-c existingOidcProviderArn=arn:aws:iam::<AWS_ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com`.

Then:

1. Open the SNS "Confirm subscription" email sent to `<ALERT_EMAIL>` and confirm it. Alarms are silent until you do.
2. Read the outputs (you need them in 1.4):
   ```bash
   aws cloudformation describe-stacks --stack-name EaSbxCiStack --profile <ADMIN_PROFILE> \
     --query "Stacks[0].Outputs[].[OutputKey,OutputValue]" --output text
   ```
   `AppRoleArn`, `InfraRoleArn`, `BundleBucketName`.
3. The OIDC trust is exactly `repo:alextthomas@182850385/Analyst-App-POC@1428685040:environment:sandbox`, the immutable subject format this repo uses (check with `gh api repos/alextthomas/Analyst-App-POC/actions/oidc/customization/sub`; `sub_claim_prefix` must match) (audience `sts.amazonaws.com`). Branch scoping is enforced by the environment deployment-branch rule in 1.4.

### 1.4 GitHub environment `sandbox`

Create the environment with a required reviewer (you) and a deployment-branch rule limited to `deploy/sandbox-aws-poc`:

```bash
OWNER_ID=$(gh api users/alextthomas --jq .id)
gh api -X PUT repos/alextthomas/Analyst-App-POC/environments/sandbox --input - <<JSON
{"reviewers":[{"type":"User","id":$OWNER_ID}],
 "deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}
JSON
gh api -X POST repos/alextthomas/Analyst-App-POC/environments/sandbox/deployment-branch-policies \
  -f name='deploy/sandbox-aws-poc' -f type=branch
```

(UI equivalent: Settings > Environments > New environment `sandbox` > Required reviewers > Deployment branches and tags > Selected branches.) If you are the only reviewer and also the person who pushes, leave "Prevent self-review" off, otherwise nobody can approve. Agents (`@alextthomasagent`) must not be a reviewer.

Set the environment **variables** (not secrets; there are no AWS keys anywhere):

```bash
R=alextthomas/Analyst-App-POC
gh variable set AWS_ACCOUNT_ID --env sandbox --repo $R --body '<AWS_ACCOUNT_ID>'
gh variable set AWS_REGION     --env sandbox --repo $R --body 'us-east-1'
gh variable set APP_ROLE_ARN   --env sandbox --repo $R --body '<AppRoleArn output>'
gh variable set INFRA_ROLE_ARN --env sandbox --repo $R --body '<InfraRoleArn output>'
gh variable set BUNDLE_BUCKET  --env sandbox --repo $R --body '<BundleBucketName output>'
gh variable set ALERT_EMAIL    --env sandbox --repo $R --body '<ALERT_EMAIL>'
gh variable set AMI_ID         --env sandbox --repo $R --body '<AMI_ID>'
```

`SITE_HOST` is set in step 2.2 (it is only known after the Elastic IP exists). Optional variables:

| Variable                  | Effect                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| `ALLOWED_CIDRS`           | comma-separated CIDRs allowed on 443 (default `0.0.0.0/0`, owner decision OQ-4)             |
| `SITE_HOST_OVERRIDE`      | use your own domain instead of the sslip.io name (point an A record at the Elastic IP)      |
| `ACME_CA`                 | ACME directory URL; use the Let's Encrypt staging URL for the first rollout (step 2.3)      |
| `SMOKE_INSECURE`          | `true` only while using the staging CA, so the smoke test accepts its untrusted certificate |
| `DATA_VOLUME_SNAPSHOT_ID` | restore the data volume from this snapshot (section 6)                                      |

---

## 2. First deploy

### 2.1 Infrastructure

Actions > **Infra sandbox** > Run workflow on `deploy/sandbox-aws-poc` with `apply = false` first (diff only), read the `cdk diff` job summary, approve the environment gate, then run again with `apply = true` and approve again. This runs the infra tests, `cdk synth`, `cdk diff`, and `cdk deploy EaSbxAppStack --exclusively` through the CDK bootstrap roles. `EaSbxCiStack` is deliberately out of its reach.

The instance bootstraps itself on first boot (Docker, compose plugin from a digest-pinned image, swap, data volume mount). Wait about 5 minutes, then confirm it registered with Systems Manager:

```bash
aws ssm describe-instance-information --profile <ADMIN_PROFILE> --region us-east-1 \
  --query "InstanceInformationList[].[InstanceId,PingStatus]" --output text   # expect "Online"
```

### 2.2 Site host

```bash
aws cloudformation describe-stacks --stack-name EaSbxAppStack --profile <ADMIN_PROFILE> \
  --query "Stacks[0].Outputs[].[OutputKey,OutputValue]" --output text
gh variable set SITE_HOST --env sandbox --repo alextthomas/Analyst-App-POC --body '<SiteHost output>'
```

With no domain, the host is `<eip-with-dashes>.sslip.io`, for example `3-90-12-34.sslip.io`. It is also stored in SSM parameter `/ea/sandbox/site-host`.

### 2.3 Test against Let's Encrypt staging first (avoids production rate limits)

1. `gh variable set ACME_CA --env sandbox --repo alextthomas/Analyst-App-POC --body 'https://acme-staging-v02.api.letsencrypt.org/directory'` and `gh variable set SMOKE_INSECURE --env sandbox --repo alextthomas/Analyst-App-POC --body true`.
2. Run **Infra sandbox** with `apply = true` (updates SSM `/ea/sandbox/acme-ca`), then deploy (2.4).
3. Check the issuer says staging: `openssl s_client -connect <SITE_HOST>:443 -servername <SITE_HOST> </dev/null 2>/dev/null | openssl x509 -noout -issuer`.
4. Switch to production: `gh variable delete ACME_CA --env sandbox --repo alextthomas/Analyst-App-POC`, `gh variable delete SMOKE_INSECURE ...`, run **Infra sandbox** `apply = true`, then re-run the deploy workflow. Caddy keeps certificates per CA on `/data/caddy`.

If sslip.io is rate limited (shared public service), set `SITE_HOST_OVERRIDE` to your own domain (ADR D6-A).

### 2.4 Application deploy

Push to `deploy/sandbox-aws-poc`, or run **Deploy sandbox** manually. Flow: QA gate (reuses `ci.yml`) > you approve the `sandbox` environment > build and push images tagged with the full commit SHA > upload `compose.sandbox.yml` and `deploy.sh` to `s3://<bucket>/releases/<SHA>/` > SSM document `EaSbx-Deploy` runs `deploy.sh` on the instance > smoke test (`/health/ready` returns `"status":"ok"`, SPA served). The job summary lists the SHA and each SSM command id.

`deploy.sh` order: render `/run/ea/app.env` (tmpfs, 0600) > ECR login and pull > start postgres and nats > `pg_dump` to `/data/backups` (when an API is already running; last 5 kept) > `prisma migrate deploy` > start api and ingest and wait for `"status":"ok"` > start web. If migrate fails the script exits non-zero and the previous containers keep serving.

### 2.5 Seed and demo data

Run **Deploy sandbox** manually with `seed = true` (and `emitDemo = true`). Seed refuses unless `/ea/sandbox/data-classification` is `synthetic`. Re-running the seed resets the `admin` and `analyst` passwords to the Secrets Manager values.

Read the generated passwords with your own credentials (they are never printed in logs):

```bash
aws secretsmanager get-secret-value --secret-id ea/sandbox/seed-admin   --profile <ADMIN_PROFILE> --query SecretString --output text
aws secretsmanager get-secret-value --secret-id ea/sandbox/seed-analyst --profile <ADMIN_PROFILE> --query SecretString --output text
```

Usernames are `admin` and `analyst`. Do not paste the values into tickets, chat or the repo.

---

## 3. Verification (SBX-T10 evidence)

Record results in `reports/sandbox/deploy-<date>.md`. Items with `*` need your AWS session.

| Check                         | How                                                                                                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TLS issuer                    | `openssl s_client` command in 2.3 (expect Let's Encrypt, not "STAGING")                                                                                     |
| Only 80/443 open              | `nmap -Pn -p 22,80,443,4222,5432,8080,8222 <SITE_HOST>` from outside: 80 and 443 open, rest filtered; plus `aws ec2 describe-security-groups` * (rules)     |
| Session Manager works, no SSH | `aws ssm start-session --target <InstanceId> --profile <ADMIN_PROFILE>` * ; `nc -vz <ip> 22` fails; instance has no key pair                                |
| IMDSv1 refused                | in a session: `curl -s -o /dev/null -w '%{http_code}' http://169.254.169.254/latest/meta-data/` returns 401; with a token it returns 200 *                  |
| Containers cannot reach IMDS  | in a session: `docker run --rm --entrypoint wget caddy:2-alpine -T 3 -qO- http://169.254.169.254/latest/meta-data/` fails (hop limit 1) *                   |
| `/health/ready` ok            | `curl -fsS https://<SITE_HOST>/health/ready` returns `{"status":"ok"}`                                                                                      |
| Seed + demo visible           | sign in as `analyst`, dashboard shows events after `emitDemo`                                                                                               |
| Log sample with redaction     | CloudWatch Logs Insights on `/ea/sandbox/api`: no cookie, password, `userId`, `properties`; `"[Redacted]"` where expected *                                 |
| One rollback                  | section 5, attach the workflow run link                                                                                                                     |
| One snapshot restore drill    | section 6                                                                                                                                                   |
| Budget and alarms configured  | `aws budgets describe-budgets --account-id <AWS_ACCOUNT_ID>` * ; `aws cloudwatch describe-alarms --alarm-name-prefix ea-sbx` * ; SNS subscription confirmed |

---

## 4. Routine operations

- Logs: CloudWatch groups `/ea/sandbox/{api,ingest,web,postgres,nats,ops,ssm-sessions}`, 14-day retention.
- Operator shell: Session Manager only. One-time console step for session logging: Systems Manager > Session Manager > Preferences > enable CloudWatch logging to `/ea/sandbox/ssm-sessions` (the account-level preference document is not created by CDK).
- Alarms (to `ea-sbx-alerts`): system status check (also triggers `ec2:recover`), instance status check, app availability (Route 53 health check on `/health/ready`), ingest worker crash, Postgres disk full. The availability alarm fires until the first successful deploy.
- Cost: about $28-30/month estimated (unverified; check the Pricing Calculator). Budget $40.
- Disk full: grow the gp3 volume (`aws ec2 modify-volume`), then in a session `sudo xfs_growfs /data`.

---

## 5. Rollback

Rollback means redeploying a previous SHA. Images are immutable full-SHA tags (ECR keeps the last 10) and release bundles live 90 days in S3.

1. Find the previous SHA: Session Manager `cat /opt/ea/previous`, or the earlier successful run's job summary.
2. Actions > **Deploy sandbox** > Run workflow with `sha = <SHA>` (leave seed/emitDemo off). QA and build are skipped; the run still needs your environment approval. It verifies both images exist, runs `EaSbx-Deploy` for that SHA and smoke-tests.
3. Verify: smoke test green; `cat /opt/ea/current` shows `<SHA>`.

**Migrations are forward-only; rollback does not reverse them.** `prisma migrate deploy` on the older image skips migrations it does not know about.

- If the newer migration was additive (expand), rolling back the code is safe.
- If it was destructive or incompatible, restore the pre-migration dump, then redeploy the old SHA. In a Session Manager shell as root:
  ```bash
  ls -lt /data/backups                      # <ts>-<previous-sha>.dump
  cd /opt/ea/releases/<CURRENT_SHA>
  DC="docker compose -p ea-sbx -f compose.sandbox.yml --env-file /run/ea/app.env"
  $DC stop web ingest api
  $DC exec -T postgres pg_restore -U ea -d event_analytics --clean --if-exists --no-owner < /data/backups/<file>.dump
  ```
  then run the rollback workflow above. If `/run/ea/app.env` is gone (reboot), run `deploy.sh` for any SHA first or recreate it from a deploy run.
- Contract (destructive) migrations ship in a separate deploy after the code that stops using the dropped objects.

Rehearse once and attach the evidence (SBX-T10): deploy SHA A, deploy SHA B, roll back to A, confirm smoke test.

---

## 6. Restore drill (snapshot)

RPO 24 h, RTO 2 h (targets, not yet tested). Snapshots: DLM daily at 03:00 UTC, last 7, for volumes tagged `ea:backup=daily`.

1. Pick a snapshot: `aws ec2 describe-snapshots --owner-ids self --filters Name=tag:ea:app,Values=event-analytics-sbx --query "Snapshots[].[SnapshotId,StartTime]" --output text --profile <ADMIN_PROFILE>`.
2. `gh variable set DATA_VOLUME_SNAPSHOT_ID --env sandbox --repo alextthomas/Analyst-App-POC --body <snap-id>`.
3. Run **Infra sandbox** `apply = true`. CloudFormation replaces the data volume (the old one is snapshotted, then deleted). Review the diff first.
4. Run **Deploy sandbox** (same SHA is fine) so containers start on the restored data. Verify with a seeded login and `/health/ready`.
5. Delete the variable afterwards so later infra runs do not re-restore. Record timings in the evidence file.

---

## 7. Failure quick reference

| Symptom                       | Action                                                                                                                            |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Deploy job: SSM status Failed | the job prints the command output; fix forward or roll back (section 5)                                                           |
| Migration failed              | old containers still serve; fix the migration and redeploy, or restore the dump                                                   |
| No HTTPS                      | `docker logs` via session on `ea-sbx-web-1`; check port 80 reachable, rate limits, then `SITE_HOST_OVERRIDE`                      |
| Secret exposure               | rotate the secret in Secrets Manager, redeploy, truncate the session table; Postgres password also needs `ALTER ROLE ea PASSWORD` |
| Over budget                   | stop the instance or tear down (section 8)                                                                                        |

---

## 8. Teardown (expiry 2026-12-03, or before any real data)

Run with `<ADMIN_PROFILE>`; this can also be done through **Infra sandbox** extended with `cdk destroy`, but the owner should do it by hand.

```bash
cd infra
CTX="-c account=<AWS_ACCOUNT_ID> -c alertEmail=<ALERT_EMAIL> -c amiId=<AMI_ID>"
npx cdk destroy EaSbxAppStack --exclusively --profile <ADMIN_PROFILE> $CTX
npx cdk destroy EaSbxCiStack  --exclusively --profile <ADMIN_PROFILE> $CTX
```

`EaSbxAppStack` terminates the instance, snapshots then deletes the data volume (`RemovalPolicy.SNAPSHOT`), and deletes ECR repositories, the bundle bucket, log groups, alarms, SSM documents and parameters, the DLM policy, the VPC, the Elastic IP and the health check. Secrets are scheduled for deletion (recovery window). `EaSbxCiStack` removes the OIDC provider, roles, topic and budget.

Manual clean-up (retained on purpose):

```bash
aws ec2 describe-snapshots --owner-ids self --filters Name=tag:ea:app,Values=event-analytics-sbx \
  --query "Snapshots[].SnapshotId" --output text --profile <ADMIN_PROFILE>
aws ec2 delete-snapshot --snapshot-id <snap-id> --profile <ADMIN_PROFILE>   # for each, once you confirm nothing is needed
```

Then, if nothing else in the account uses CDK: delete the `CDKToolkit` stack, its staging bucket and ECR repository. Delete the GitHub `sandbox` environment (or remove the reviewer). Secret names are unusable until the recovery window ends; to redeploy sooner, force-delete them with `aws secretsmanager delete-secret --force-delete-without-recovery --secret-id ea/sandbox/<name>`.

Record teardown evidence (stack deletion events, snapshot deletion) in `reports/sandbox/teardown-<date>.md`.
