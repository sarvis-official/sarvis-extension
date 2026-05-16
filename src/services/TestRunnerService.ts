import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as util from 'util';
import * as path from 'path';
import * as fs from 'fs';

const exec = util.promisify(cp.exec);

export interface TestResult {
    name: string;
    status: 'passed' | 'failed' | 'skipped';
    duration?: number;
    error?: string;
    file?: string;
    line?: number;
}

export interface TestRunResult {
    passed: number;
    failed: number;
    skipped: number;
    total: number;
    duration: number;
    results: TestResult[];
    rawOutput: string;
    framework: 'jest' | 'vitest' | 'mocha' | 'pytest' | 'unknown';
}

export const TestRunnerService = {

    detectFramework(ws: string): TestRunResult['framework'] {
        const pkg = path.join(ws, 'package.json');
        if (fs.existsSync(pkg)) {
            const content = fs.readFileSync(pkg, 'utf-8');
            if (content.includes('"jest"') || content.includes('"@jest"')) return 'jest';
            if (content.includes('"vitest"')) return 'vitest';
            if (content.includes('"mocha"')) return 'mocha';
        }
        if (fs.existsSync(path.join(ws, 'pytest.ini')) ||
            fs.existsSync(path.join(ws, 'setup.py'))) return 'pytest';
        return 'unknown';
    },

    getRunCommand(framework: TestRunResult['framework']): string {
        const commands: Record<string, string> = {
            jest: 'npx jest --json --no-coverage 2>&1',
            vitest: 'npx vitest run --reporter=json 2>&1',
            mocha: 'npx mocha --reporter json 2>&1',
            pytest: 'python -m pytest --json-report --json-report-file=- 2>&1',
            unknown: 'npm test 2>&1'
        };
        return commands[framework];
    },

    async runTests(ws: string, framework: TestRunResult['framework']): Promise<TestRunResult> {
        const command = this.getRunCommand(framework);
        const startTime = Date.now();
        let rawOutput = '';

        try {
            const { stdout, stderr } = await exec(command, {
                cwd: ws,
                timeout: 60000
            });
            rawOutput = stdout + stderr;
        } catch (err: unknown) {
            const execErr = err as { stdout?: string; stderr?: string };
            rawOutput = (execErr.stdout ?? '') + (execErr.stderr ?? '');
        }

        const duration = Date.now() - startTime;
        return this.parseOutput(rawOutput, framework, duration);
    },

    parseOutput(
        output: string,
        framework: TestRunResult['framework'],
        duration: number
    ): TestRunResult {
        try {
            if (framework === 'jest' || framework === 'vitest') {
                return this._parseJestOutput(output, duration);
            } else if (framework === 'pytest') {
                return this._parsePytestOutput(output, duration);
            }
        } catch { /* fall through to text parsing */ }

        return this._parseTextOutput(output, duration);
    },

    _parseJestOutput(output: string, duration: number): TestRunResult {
        const jsonMatch = output.match(/\{[\s\S]*"testResults"[\s\S]*\}/);
        if (!jsonMatch) return this._parseTextOutput(output, duration);

        const json = JSON.parse(jsonMatch[0]);
        const results: TestResult[] = [];

        (json.testResults ?? []).forEach((suite: Record<string, unknown>) => {
            const testFilePath = (suite.testFilePath as string) ?? '';
            const assertionResults = (suite.assertionResults as Record<string, unknown>[]) ?? [];
            assertionResults.forEach((test) => {
                const status = test.status as string;
                results.push({
                    name: (test.fullName as string) ?? (test.title as string) ?? 'Unknown',
                    status: status === 'passed' ? 'passed' :
                        status === 'failed' ? 'failed' : 'skipped',
                    duration: (test.duration as number) ?? 0,
                    error: ((test.failureMessages as string[]) ?? []).join('\n').slice(0, 500),
                    file: path.basename(testFilePath)
                });
            });
        });

        const passed = results.filter(r => r.status === 'passed').length;
        const failed = results.filter(r => r.status === 'failed').length;
        const skipped = results.filter(r => r.status === 'skipped').length;

        return {
            passed, failed, skipped,
            total: results.length,
            duration,
            results,
            rawOutput: output,
            framework: 'jest'
        };
    },

    _parsePytestOutput(output: string, duration: number): TestRunResult {
        const jsonMatch = output.match(/\{[\s\S]*"summary"[\s\S]*\}/);
        if (!jsonMatch) return this._parseTextOutput(output, duration);

        const json = JSON.parse(jsonMatch[0]);
        const summary = json.summary ?? {};
        const results: TestResult[] = (json.tests ?? []).map((t: Record<string, unknown>) => ({
            name: (t.nodeid as string) ?? 'Unknown',
            status: (t.outcome as string) === 'passed' ? 'passed' :
                (t.outcome as string) === 'failed' ? 'failed' : 'skipped',
            error: ((t.call as Record<string, unknown>)?.longrepr as string) ?? undefined,
            duration: ((t.call as Record<string, unknown>)?.duration as number) ?? 0
        }));

        return {
            passed: summary.passed ?? 0,
            failed: summary.failed ?? 0,
            skipped: summary.skipped ?? 0,
            total: summary.total ?? results.length,
            duration,
            results,
            rawOutput: output,
            framework: 'pytest'
        };
    },

    _parseTextOutput(output: string, duration: number): TestRunResult {
        const results: TestResult[] = [];

        const passPattern = /✓|✔|PASS|passed|√/gi;
        const failPattern = /✗|✘|FAIL|failed|×/gi;

        const passMatches = output.match(passPattern) ?? [];
        const failMatches = output.match(failPattern) ?? [];

        // Extract test names from output
        const testLinePattern = /(?:✓|✔|✗|✘|PASS|FAIL)\s+(.+)/gm;
        let match: RegExpExecArray | null;

        while ((match = testLinePattern.exec(output)) !== null) {
            const currentMatch = match; // capture in const to avoid null check issues
            const isPass = /✓|✔|PASS/i.test(currentMatch[0]);
            results.push({
                name: currentMatch[1].trim().slice(0, 100),
                status: isPass ? 'passed' : 'failed'
            });
        }

        // Extract error messages
        const errorPattern = /●\s+(.+)\n\n([\s\S]+?)(?=\n●|\n{3}|$)/g;
        let errorMatch: RegExpExecArray | null;

        while ((errorMatch = errorPattern.exec(output)) !== null) {
            const currentError = errorMatch; // capture in const
            const existing = results.find(r => r.name.includes(currentError[1].trim()));
            if (existing) {
                existing.error = currentError[2].trim().slice(0, 300);
            }
        }

        const passed = results.filter(r => r.status === 'passed').length || passMatches.length;
        const failed = results.filter(r => r.status === 'failed').length || failMatches.length;

        return {
            passed, failed, skipped: 0,
            total: passed + failed,
            duration,
            results,
            rawOutput: output,
            framework: 'unknown'
        };
    },

    getFailingTestFiles(result: TestRunResult, ws: string): string[] {
        const files = new Set<string>();
        result.results
            .filter(r => r.status === 'failed' && r.file)
            .forEach(r => {
                const full = path.join(ws, r.file!);
                if (fs.existsSync(full)) files.add(full);
            });
        return [...files];
    }
};