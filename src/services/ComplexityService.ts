import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface FunctionComplexity {
    name: string;
    line: number;
    lines: number;
    cyclomaticComplexity: number;
    nestingDepth: number;
    paramCount: number;
    score: number; // 0-100, higher = more complex
}

export interface FileComplexity {
    file: string;
    relativePath: string;
    totalLines: number;
    functions: FunctionComplexity[];
    avgComplexity: number;
    maxComplexity: number;
    totalFunctions: number;
    imports: number;
    score: number; // 0-100
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

const IGNORE = ['node_modules', '.git', 'dist', 'out', 'build', '.next', 'coverage'];
const SUPPORTED = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.cs'];

export const ComplexityService = {

    analyzeFile(filePath: string, content: string): FileComplexity {
        const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
        const relativePath = ws ? path.relative(ws, filePath) : filePath;
        const lines = content.split('\n');

        const functions = this._extractFunctions(content, lines);
        const imports = lines.filter(l =>
            l.trim().match(/^import\s|^const\s.*require\s*\(/)
        ).length;

        const avgComplexity = functions.length > 0
            ? Math.round(functions.reduce((s, f) => s + f.score, 0) / functions.length)
            : 0;

        const maxComplexity = functions.length > 0
            ? Math.max(...functions.map(f => f.score))
            : 0;

        const score = this._calculateFileScore(lines.length, functions, imports);
        const grade = this._getGrade(score);

        return {
            file: filePath,
            relativePath,
            totalLines: lines.length,
            functions,
            avgComplexity,
            maxComplexity,
            totalFunctions: functions.length,
            imports,
            score,
            grade
        };
    },

    _extractFunctions(content: string, lines: string[]): FunctionComplexity[] {
        const functions: FunctionComplexity[] = [];

        const patterns = [
            /(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g,
            /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/g,
            /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?function/g,
        ];

        for (const pattern of patterns) {
            let match;
            const text = content;
            pattern.lastIndex = 0;

            while ((match = pattern.exec(text)) !== null) {
                const fnName = match[1];
                if (!fnName || fnName.length <= 1) continue;

                const startLine = text.slice(0, match.index).split('\n').length;
                const params = match[2] ?? '';
                const paramCount = params.trim()
                    ? params.split(',').filter(p => p.trim()).length
                    : 0;

                // Find function end by brace counting
                const fnBody = this._extractFunctionBody(text, match.index);
                const fnLines = fnBody.split('\n').length;
                const fnLinesArr = fnBody.split('\n');

                const cyclomatic = this._cyclomaticComplexity(fnBody);
                const nesting = this._maxNestingDepth(fnLinesArr);

                const score = this._calculateFunctionScore(
                    fnLines, cyclomatic, nesting, paramCount
                );

                functions.push({
                    name: fnName,
                    line: startLine,
                    lines: fnLines,
                    cyclomaticComplexity: cyclomatic,
                    nestingDepth: nesting,
                    paramCount,
                    score
                });
            }
        }

        // Deduplicate by name+line
        const seen = new Set<string>();
        return functions.filter(f => {
            const key = `${f.name}:${f.line}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).sort((a, b) => b.score - a.score);
    },

    _extractFunctionBody(text: string, startIndex: number): string {
        let braceCount = 0;
        let started = false;
        let i = startIndex;

        while (i < text.length) {
            if (text[i] === '{') { braceCount++; started = true; }
            else if (text[i] === '}') {
                braceCount--;
                if (started && braceCount === 0) {
                    return text.slice(startIndex, i + 1);
                }
            }
            i++;
        }
        return text.slice(startIndex, Math.min(startIndex + 500, text.length));
    },

    _cyclomaticComplexity(code: string): number {
        const patterns = [
            /\bif\s*\(/g, /\belse\s+if\s*\(/g, /\bfor\s*\(/g,
            /\bwhile\s*\(/g, /\bswitch\s*\(/g, /\bcase\s+/g,
            /\bcatch\s*\(/g, /\?\s*[^:]/g, /&&/g, /\|\|/g,
        ];
        let count = 1;
        patterns.forEach(p => {
            count += (code.match(p) ?? []).length;
        });
        return count;
    },

    _maxNestingDepth(lines: string[]): number {
        let maxDepth = 0;
        let depth = 0;
        lines.forEach(line => {
            depth += (line.match(/\{/g) ?? []).length;
            depth -= (line.match(/\}/g) ?? []).length;
            if (depth > maxDepth) maxDepth = depth;
        });
        return maxDepth;
    },

    _calculateFunctionScore(
        lines: number,
        cyclomatic: number,
        nesting: number,
        params: number
    ): number {
        let score = 0;
        score += Math.min(lines / 2, 40);
        score += Math.min(cyclomatic * 3, 30);
        score += Math.min(nesting * 5, 20);
        score += Math.min(params * 2, 10);
        return Math.min(Math.round(score), 100);
    },

    _calculateFileScore(
        lines: number,
        functions: FunctionComplexity[],
        imports: number
    ): number {
        let score = 0;
        score += Math.min(lines / 10, 30);
        score += Math.min(
            functions.reduce((s, f) => s + f.score, 0) / Math.max(functions.length, 1) / 2,
            40
        );
        score += Math.min(imports * 1.5, 20);
        score += Math.min(functions.filter(f => f.score > 70).length * 5, 10);
        return Math.min(Math.round(score), 100);
    },

    _getGrade(score: number): FileComplexity['grade'] {
        if (score <= 20) return 'A';
        if (score <= 40) return 'B';
        if (score <= 60) return 'C';
        if (score <= 80) return 'D';
        return 'F';
    },

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
                        results.push({
                            path: full,
                            content: fs.readFileSync(full, 'utf-8')
                        });
                    } catch { /* skip */ }
                }
            }
        } catch { /* skip */ }
    }
};