/**
 * Acceptance test: runs every scenario in ./scenarios.ts against the legacy
 * (`/legacy/memberships`) and modern (`/memberships`) route stacks — both
 * mounted in-process in this same script, each with its own independent
 * in-memory state, exactly like they are in src/index.ts — and diffs the
 * responses to confirm the modern implementation behaves identically to the
 * legacy reference implementation.
 *
 * Usage: npm run acceptance-test
 * Output: printed to stdout AND written to acceptance-testing/results/
 */

import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import request from 'supertest';
import { errorHandler } from '../src/error-handler.middleware';
import modernRoutes from '../src/modern/routes/membership.routes';
import { compareResponses, type Diff } from './compare';
import { type Ctx, type Scenario, type Step, scenarios } from './scenarios';

// legacy route is CommonJS JS — require it like src/index.ts does
const legacyRoutes = require('../src/legacy/routes/membership.routes');

const LEGACY_PATH = '/legacy/memberships';
const MODERN_PATH = '/memberships';

function buildApp(mountPath: string, router: express.Router): express.Express {
    const app = express();
    app.use(express.json());
    app.use(mountPath, router);
    app.use(errorHandler);
    return app;
}

const legacyApp = buildApp(LEGACY_PATH, legacyRoutes);
const modernApp = buildApp(MODERN_PATH, modernRoutes);

interface StepResult {
    scenario: string;
    step: string;
    method: string;
    body?: Record<string, unknown>;
    expectedStatus?: number;
    legacyStatus: number;
    modernStatus: number;
    legacyBody: unknown;
    modernBody: unknown;
    diffs: Diff[];
    violations: string[];
    passed: boolean;
}

async function runStep(
    ctx: Ctx,
    scenarioName: string,
    step: Step,
): Promise<StepResult> {
    const legacyReq =
        step.method === 'GET'
            ? request(legacyApp).get(LEGACY_PATH)
            : request(legacyApp)
                  .post(LEGACY_PATH)
                  .send(step.body ?? {});
    const modernReq =
        step.method === 'GET'
            ? request(modernApp).get(MODERN_PATH)
            : request(modernApp)
                  .post(MODERN_PATH)
                  .send(step.body ?? {});

    const [legacyRes, modernRes] = await Promise.all([legacyReq, modernReq]);

    const diffs = compareResponses(legacyRes.body, modernRes.body);
    const violations: string[] = [];

    if (legacyRes.status !== modernRes.status) {
        violations.push(
            `status mismatch: legacy=${legacyRes.status} modern=${modernRes.status}`,
        );
    }
    if (step.expectedStatus !== undefined) {
        if (legacyRes.status !== step.expectedStatus) {
            violations.push(
                `expected legacy status ${step.expectedStatus}, got ${legacyRes.status} (body: ${JSON.stringify(legacyRes.body)})`,
            );
        }
        if (modernRes.status !== step.expectedStatus) {
            violations.push(
                `expected modern status ${step.expectedStatus}, got ${modernRes.status} (body: ${JSON.stringify(modernRes.body)})`,
            );
        }
    }
    if (step.extraCheck) {
        violations.push(
            ...step.extraCheck(ctx, legacyRes.body, modernRes.body),
        );
    }

    const passed = diffs.length === 0 && violations.length === 0;

    return {
        scenario: scenarioName,
        step: step.description,
        method: step.method,
        body: step.body,
        expectedStatus: step.expectedStatus,
        legacyStatus: legacyRes.status,
        modernStatus: modernRes.status,
        legacyBody: legacyRes.body,
        modernBody: modernRes.body,
        diffs,
        violations,
        passed,
    };
}

function formatStepResult(result: StepResult): string {
    const lines: string[] = [];
    const status = result.passed ? 'PASS' : 'FAIL';
    lines.push(
        `  [${status}] ${result.method} — ${result.step} (legacy=${result.legacyStatus}, modern=${result.modernStatus})`,
    );
    if (!result.passed) {
        for (const violation of result.violations) {
            lines.push(`         ! ${violation}`);
        }
        for (const diff of result.diffs) {
            lines.push(
                `         ~ ${diff.path}: legacy=${JSON.stringify(diff.legacy)} modern=${JSON.stringify(diff.modern)} (${diff.reason})`,
            );
        }
    }
    return lines.join('\n');
}

async function main(): Promise<void> {
    const allResults: StepResult[] = [];
    const logLines: string[] = [];

    const log = (line = '') => {
        console.log(line);
        logLines.push(line);
    };

    log(`Acceptance test run started at ${new Date().toISOString()}`);
    log(`Comparing ${LEGACY_PATH} (legacy) against ${MODERN_PATH} (modern)`);
    log('='.repeat(80));

    for (const scenario of scenarios as Scenario[]) {
        log();
        log(`Scenario: ${scenario.name}`);
        log(`  ${scenario.description}`);

        const ctx: Ctx = {};
        for (const step of scenario.steps) {
            const result = await runStep(ctx, scenario.name, step);
            allResults.push(result);
            log(formatStepResult(result));
        }
    }

    const failed = allResults.filter((r) => !r.passed);
    const passedCount = allResults.length - failed.length;

    log();
    log('='.repeat(80));
    log(
        `Summary: ${passedCount}/${allResults.length} steps passed across ${scenarios.length} scenarios`,
    );
    if (failed.length > 0) {
        log(`${failed.length} step(s) FAILED:`);
        for (const f of failed) {
            log(`  - [${f.scenario}] ${f.step}`);
        }
    } else {
        log('All steps behaved identically between legacy and modern routes.');
    }

    const resultsDir = path.join(__dirname, 'results');
    fs.mkdirSync(resultsDir, { recursive: true });

    const jsonReportPath = path.join(resultsDir, 'run-report.json');
    fs.writeFileSync(
        jsonReportPath,
        JSON.stringify(
            {
                runAt: new Date().toISOString(),
                totalSteps: allResults.length,
                passedSteps: passedCount,
                failedSteps: failed.length,
                results: allResults,
            },
            null,
            2,
        ),
    );

    const logReportPath = path.join(resultsDir, 'run-report.log');
    fs.writeFileSync(logReportPath, logLines.join('\n'));

    log();
    log(
        `Full JSON report written to ${path.relative(process.cwd(), jsonReportPath)}`,
    );
    log(`Full log written to ${path.relative(process.cwd(), logReportPath)}`);

    process.exitCode = failed.length > 0 ? 1 : 0;
}

main().catch((err) => {
    console.error('Acceptance test run crashed:', err);
    process.exitCode = 1;
});
