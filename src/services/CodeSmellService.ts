import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface CodeSmell {
    file: string;
    line?: number;
    type: 'long-function' | 'deep-nesting' | 'duplicate-code' | 'tight-coupling' | 'memory-leak' | 'god-class' | 'dead-code' | 'magic-number' | 'long-file';
    severity: 'high' | 'medium' | 'low';
    message: string;
    snippet?: string;
}

export interface SmellReport {
    file: string;
    smells: CodeSmell[];
    score: number; // 0-100, higher = cleaner
}

const IGNORE = ['node_modules', '.git', 'dist', 'out', 'build', '.next', 'coverage'];
const SUPPORTED = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.cs'];

export const CodeSmellService = {

    // ── Static analysis — runs locally without AI ──────────────────────────
    analyzeFile(filePath: string, content: string): CodeSmell[] {
        const smells: CodeSmell[] = [];
        const lines = content.split('\n');
        const relativePath = vscode.workspace.workspaceFolders?.[0]
            ? path.relative(vscode.workspace.workspaceFolders[0].uri.fsPath, filePath)
            : filePath;

        // ── Long file ──────────────────────────────────────────────────────
        if (lines.length > 300) {
            smells.push({
                file: relativePath,
                type: 'long-file',
                severity: lines.length > 600 ? 'high' : 'medium',
                message: `File is ${lines.length} lines long (recommended: <300)`
            });
        }

        // ── Long functions ─────────────────────────────────────────────────
        const functionStarts: { name: string; line: number }[] = [];
        lines.forEach((line, i) => {
            const fnMatch = line.match(
                /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(|async\s+(\w+)\s*\(|(\w+)\s*\([^)]*\)\s*(?::\s*\w+)?\s*{)/
            );
            if (fnMatch) {
                const name = fnMatch[1] ?? fnMatch[2] ?? fnMatch[3] ?? fnMatch[4] ?? 'anonymous';
                functionStarts.push({ name, line: i });
            }
        });

        for (let i = 0; i < functionStarts.length; i++) {
            const start = functionStarts[i].line;
            const end = functionStarts[i + 1]?.line ?? lines.length;
            const length = end - start;
            if (length > 50) {
                smells.push({
                    file: relativePath,
                    line: start + 1,
                    type: 'long-function',
                    severity: length > 100 ? 'high' : 'medium',
                    message: `Function "${functionStarts[i].name}()" is ${length} lines long (recommended: <50)`,
                    snippet: lines.slice(start, start + 3).join('\n')
                });
            }
        }

        // ── Deep nesting ───────────────────────────────────────────────────
        lines.forEach((line, i) => {
            const depth = (line.match(/^\s+/)?.[0].length ?? 0) / 4;
            if (depth >= 4) {
                smells.push({
                    file: relativePath,
                    line: i + 1,
                    type: 'deep-nesting',
                    severity: depth >= 6 ? 'high' : 'medium',
                    message: `Deep nesting (depth ${Math.floor(depth)}) at line ${i + 1} — consider extracting functions`,
                    snippet: line.trim()
                });
            }
        });

        // ── Magic numbers ──────────────────────────────────────────────────
        const magicNumberPattern = /\b([3-9]\d|\d{3,})\b/g;
        lines.forEach((line, i) => {
            if (line.includes('const') || line.includes('//')) return;
            const matches = line.match(magicNumberPattern);
            if (matches) {
                smells.push({
                    file: relativePath,
                    line: i + 1,
                    type: 'magic-number',
                    severity: 'low',
                    message: `Magic number(s) ${matches.join(', ')} at line ${i + 1} — use named constants`,
                    snippet: line.trim()
                });
            }
        });

        // ── Memory leak indicators ─────────────────────────────────────────
        const leakPatterns = [
            { regex: /setInterval\s*\(/g, msg: 'setInterval without cleanup — store reference and call clearInterval' },
            { regex: /addEventListener\s*\(/g, msg: 'addEventListener without removeEventListener — possible memory leak' },
            { regex: /new\s+\w+\(\)\s*;(?!\s*\/\/)/g, msg: 'Object created but not assigned — possible memory leak' },
        ];

        leakPatterns.forEach(({ regex, msg }) => {
            lines.forEach((line, i) => {
                if (line.match(regex)) {
                    smells.push({
                        file: relativePath,
                        line: i + 1,
                        type: 'memory-leak',
                        severity: 'medium',
                        message: msg,
                        snippet: line.trim()
                    });
                }
            });
        });

        // ── Tight coupling indicators ──────────────────────────────────────
        const importCount = lines.filter(l => l.match(/^import\s+|require\s*\(/)).length;
        if (importCount > 15) {
            smells.push({
                file: relativePath,
                type: 'tight-coupling',
                severity: 'medium',
                message: `${importCount} imports detected — file may be too tightly coupled`
            });
        }

        // ── Dead code ──────────────────────────────────────────────────────
        lines.forEach((line, i) => {
            if (line.trim().match(/^\/\/\s*(TODO|FIXME|HACK|XXX|TEMP|DEPRECATED)/i)) {
                smells.push({
                    file: relativePath,
                    line: i + 1,
                    type: 'dead-code',
                    severity: 'low',
                    message: `Technical debt marker: "${line.trim()}"`,
                    snippet: line.trim()
                });
            }
        });

        return smells;
    },

    // ── Calculate cleanliness score ────────────────────────────────────────
    calculateScore(smells: CodeSmell[]): number {
        let deductions = 0;
        smells.forEach(s => {
            deductions += s.severity === 'high' ? 15 : s.severity === 'medium' ? 7 : 3;
        });
        return Math.max(0, 100 - deductions);
    },

    // ── Collect workspace files ────────────────────────────────────────────
    collectFiles(): { path: string; content: string }[] {
        const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!ws) return [];

        const results: { path: string; content: string }[] = [];
        this._walk(ws, results);
        return results;
    },

    _walk(dir: string, results: { path: string; content: string }[]): void {
        try {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                if (IGNORE.includes(entry.name)) continue;
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) this._walk(full, results);
                else if (SUPPORTED.includes(path.extname(entry.name))) {
                    try {
                        results.push({ path: full, content: fs.readFileSync(full, 'utf-8') });
                    } catch { /* skip */ }
                }
            }
        } catch { /* skip unreadable dirs */ }
    },

    // ── Format smells for AI deep analysis ────────────────────────────────
    formatForAI(reports: SmellReport[]): string {
        return reports
            .filter(r => r.smells.length > 0)
            .map(r => {
                const smellList = r.smells
                    .map(s => `  [${s.severity.toUpperCase()}] ${s.message}`)
                    .join('\n');
                return `File: ${r.file} (score: ${r.score}/100)\n${smellList}`;
            })
            .join('\n\n');
    }
};