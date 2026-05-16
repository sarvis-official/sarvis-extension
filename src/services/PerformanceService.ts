import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface PerformanceIssue {
    file: string;
    line?: number;
    type: 'n-plus-1' | 'inefficient-loop' | 'blocking-code' | 'memory' | 'rerender' | 'algorithm';
    severity: 'critical' | 'medium' | 'low';
    message: string;
    snippet?: string;
}

const IGNORE = ['node_modules', '.git', 'dist', 'out', 'build', '.next', 'coverage'];
const SUPPORTED = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.cs'];

export const PerformanceService = {

    // ── Static performance analysis ────────────────────────────────────────
    analyzeFile(filePath: string, content: string): PerformanceIssue[] {
        const issues: PerformanceIssue[] = [];
        const lines = content.split('\n');
        const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
        const relativePath = ws ? path.relative(ws, filePath) : filePath;

        lines.forEach((line, i) => {
            const lineNum = i + 1;
            const trimmed = line.trim();

            // ── N+1 query patterns ─────────────────────────────────────────
            if (trimmed.match(/for\s*\(|\.forEach\s*\(|\.map\s*\(/)) {
                const nextLines = lines.slice(i + 1, i + 5).join(' ');
                if (nextLines.match(/await\s+\w+\.(find|get|query|select|fetch)/)) {
                    issues.push({
                        file: relativePath, line: lineNum,
                        type: 'n-plus-1', severity: 'critical',
                        message: `Possible N+1 query — database call inside loop at line ${lineNum}`,
                        snippet: trimmed
                    });
                }
            }

            // ── Array in loop (O(n²)) ──────────────────────────────────────
            if (trimmed.match(/\.includes\s*\(|\.indexOf\s*\(|\.find\s*\(/) &&
                lines.slice(Math.max(0, i - 5), i).some(l => l.match(/for\s*\(|forEach|\.map\s*\(/))) {
                issues.push({
                    file: relativePath, line: lineNum,
                    type: 'inefficient-loop', severity: 'medium',
                    message: `O(n²) complexity — array search inside loop at line ${lineNum}. Use Map/Set instead`,
                    snippet: trimmed
                });
            }

            // ── Nested loops ───────────────────────────────────────────────
            if (trimmed.match(/for\s*\(|\.forEach\s*\(/)) {
                const innerLines = lines.slice(i + 1, i + 20).join('\n');
                if (innerLines.match(/for\s*\(|\.forEach\s*\(/)) {
                    issues.push({
                        file: relativePath, line: lineNum,
                        type: 'inefficient-loop', severity: 'medium',
                        message: `Nested loop detected at line ${lineNum} — O(n²) or worse complexity`,
                        snippet: trimmed
                    });
                }
            }

            // ── Blocking sync operations ───────────────────────────────────
            const blockingOps = [
                { pattern: /fs\.readFileSync|fs\.writeFileSync|fs\.existsSync/, msg: 'Synchronous file I/O blocks the event loop' },
                { pattern: /execSync|spawnSync/, msg: 'Synchronous child process blocks the event loop' },
                { pattern: /while\s*\(true\)/, msg: 'Infinite while loop — potential CPU blocking' },
            ];

            blockingOps.forEach(({ pattern, msg }) => {
                if (trimmed.match(pattern)) {
                    issues.push({
                        file: relativePath, line: lineNum,
                        type: 'blocking-code', severity: 'critical',
                        message: `${msg} at line ${lineNum}`,
                        snippet: trimmed
                    });
                }
            });

            // ── Memory issues ──────────────────────────────────────────────
            const memoryPatterns = [
                { pattern: /new Array\(\d{4,}\)|new Buffer\(/, msg: 'Large memory allocation' },
                { pattern: /\.push\(.*\).*(?:for|forEach|while)/, msg: 'Array growing inside loop — pre-allocate if size known' },
                { pattern: /JSON\.parse\(JSON\.stringify\(/, msg: 'JSON deep clone is slow — use structuredClone() or a library' },
                { pattern: /global\.\w+\s*=|window\.\w+\s*=/, msg: 'Global variable assignment — potential memory leak' },
            ];

            memoryPatterns.forEach(({ pattern, msg }) => {
                if (trimmed.match(pattern)) {
                    issues.push({
                        file: relativePath, line: lineNum,
                        type: 'memory', severity: 'medium',
                        message: `${msg} at line ${lineNum}`,
                        snippet: trimmed
                    });
                }
            });

            // ── React re-render issues ─────────────────────────────────────
            const rerenderPatterns = [
                { pattern: /style\s*=\s*\{\s*\{/, msg: 'Inline style object recreated every render — move outside component or use useMemo' },
                { pattern: /onClick\s*=\s*\{.*=>/, msg: 'Inline arrow function in JSX prop recreated every render — use useCallback' },
                { pattern: /useEffect\s*\(\s*\(\s*\)\s*=>[\s\S]*?,\s*\[\s*\]\s*\)/, msg: 'useEffect with empty deps — verify this is intentional' },
            ];

            rerenderPatterns.forEach(({ pattern, msg }) => {
                if (trimmed.match(pattern)) {
                    issues.push({
                        file: relativePath, line: lineNum,
                        type: 'rerender', severity: 'medium',
                        message: `React: ${msg} at line ${lineNum}`,
                        snippet: trimmed
                    });
                }
            });

            // ── Unoptimized algorithms ─────────────────────────────────────
            if (trimmed.match(/\.sort\s*\(/) &&
                lines.slice(Math.max(0, i - 3), i + 3).join('\n').match(/for\s*\(|forEach/)) {
                issues.push({
                    file: relativePath, line: lineNum,
                    type: 'algorithm', severity: 'medium',
                    message: `Sorting inside loop at line ${lineNum} — O(n² log n) complexity`,
                    snippet: trimmed
                });
            }
        });

        return issues;
    },

    // ── Collect workspace files ────────────────────────────────────────────
    collectFiles(maxFiles = 20): { path: string; content: string; language: string }[] {
        const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!ws) return [];
        const results: { path: string; content: string; language: string }[] = [];
        this._walk(ws, results, maxFiles);
        return results;
    },

    _walk(
        dir: string,
        results: { path: string; content: string; language: string }[],
        maxFiles: number
    ): void {
        if (results.length >= maxFiles) return;
        try {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                if (results.length >= maxFiles) return;
                if (IGNORE.includes(entry.name)) continue;
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) this._walk(full, results, maxFiles);
                else if (SUPPORTED.includes(path.extname(entry.name))) {
                    try {
                        const content = fs.readFileSync(full, 'utf-8');
                        results.push({
                            path: full,
                            content: content.slice(0, 2000),
                            language: path.extname(entry.name).slice(1)
                        });
                    } catch { /* skip */ }
                }
            }
        } catch { /* skip */ }
    },

    calculateScore(issues: PerformanceIssue[]): number {
        let deductions = 0;
        issues.forEach(i => {
            deductions += i.severity === 'critical' ? 20 : i.severity === 'medium' ? 8 : 3;
        });
        return Math.max(0, 100 - deductions);
    }
};