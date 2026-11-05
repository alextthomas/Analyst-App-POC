#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { createSandboxApp } from "../lib/sandbox-app";

createSandboxApp(new App());
