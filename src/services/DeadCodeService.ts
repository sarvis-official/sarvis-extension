import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface DeadCodeItem {
    file: string;
    line?: number;
    type: 'unused-function' | 'unused-import' | 'unused-variable' | 'unused-component' | 'unused-file' | 'unused-export' | 'commented-code';
    severity: 'high' | 'medium' | 'low';
    name: string;
    message: string;
    snippet?: string;
}

const IGNORE = ['node_modules', '.git', 'dist', 'out', 'build', '.next', 'coverage', '__tests__'];
const SUPPORTED = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go'];

export const DeadCodeService = {

    analyzeFile(filePath: string, content: string, allFiles: { path: string; content: string }[]): DeadCodeItem[] {
        const items: DeadCodeItem[] = [];
        const lines = content.split('\n');
        const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
        const relativePath = ws ? path.relative(ws, filePath) : filePath;
        const allContent = allFiles.map(f => f.content).join('\n');

        // ── Unused imports ─────────────────────────────────────────────────
        lines.forEach((line, i) => {
            const lineNum = i + 1;
            const trimmed = line.trim();

            // ES6 named imports: import { Foo, Bar } from '...'
            const namedImportMatch = trimmed.match(/^import\s*\{([^}]+)\}\s*from/);
            if (namedImportMatch) {
                const names = namedImportMatch[1]
                    .split(',')
                    .map(n => n.trim().split(' as ').pop()!.trim())
                    .filter(Boolean);

                names.forEach(name => {
                    const usageCount = (content.match(new RegExp(`\\b${name}\\b`, 'g')) ?? []).length;
                    if (usageCount <= 1) { // only the import line itself
                        items.push({
                            file: relativePath, line: lineNum,
                            type: 'unused-import', severity: 'medium',
                            name,
                            message: `"${name}" is imported but never used`,
                            snippet: trimmed
                        });
                    }
                });
            }

            // Default import: import Foo from '...'
            const defaultImportMatch = trimmed.match(/^import\s+(\w+)\s+from/);
            if (defaultImportMatch) {
                const name = defaultImportMatch[1];
                const usageCount = (content.match(new RegExp(`\\b${name}\\b`, 'g')) ?? []).length;
                if (usageCount <= 1) {
                    items.push({
                        file: relativePath, line: lineNum,
                        type: 'unused-import', severity: 'medium',
                        name,
                        message: `Default import "${name}" is never used`,
                        snippet: trimmed
                    });
                }
            }
        });

        // ── Unused functions ───────────────────────────────────────────────
        const functionPattern = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/g;
        let match;
        const fileText = content;

        while ((match = functionPattern.exec(fileText)) !== null) {
            const fnName = match[1] ?? match[2];
            if (!fnName || fnName === 'constructor' || fnName.startsWith('_')) continue;

            const lineNum = fileText.slice(0, match.index).split('\n').length;

            // Check usage across ALL files
            const usageInAllFiles = (allContent.match(new RegExp(`\\b${fnName}\\b`, 'g')) ?? []).length;
            const usageInThisFile = (content.match(new RegExp(`\\b${fnName}\\b`, 'g')) ?? []).length;

            // If only defined here and not used anywhere else
            const isExported = fileText.slice(match.index - 10, match.index).includes('export');
            const externalUsage = usageInAllFiles - usageInThisFile;

            if (usageInThisFile <= 1 && externalUsage === 0) {
                items.push({
                    file: relativePath, line: lineNum,
                    type: 'unused-function', severity: 'high',
                    name: fnName,
                    message: `Function "${fnName}()" is defined but never called`,
                    snippet: `function ${fnName}(...) { ... }`
                });
            } else if (isExported && externalUsage === 0 && usageInThisFile <= 1) {
                items.push({
                    file: relativePath, line: lineNum,
                    type: 'unused-export', severity: 'medium',
                    name: fnName,
                    message: `Exported function "${fnName}()" is never imported anywhere`,
                    snippet: `export function ${fnName}(...) { ... }`
                });
            }
        }

        // ── Unused variables ───────────────────────────────────────────────
        lines.forEach((line, i) => {
            const lineNum = i + 1;
            const trimmed = line.trim();

            const varMatch = trimmed.match(/^(?:const|let|var)\s+(\w+)\s*=/);
            if (varMatch) {
                const varName = varMatch[1];
                if (varName.startsWith('_')) return; // convention: _ prefix = intentionally unused
                const usageCount = (content.match(new RegExp(`\\b${varName}\\b`, 'g')) ?? []).length;
                if (usageCount <= 1) {
                    items.push({
                        file: relativePath, line: lineNum,
                        type: 'unused-variable', severity: 'low',
                        name: varName,
                        message: `Variable "${varName}" is declared but never used`,
                        snippet: trimmed
                    });
                }
            }
        });

        // ── React unused components ────────────────────────────────────────
        if (filePath.match(/\.(tsx|jsx)$/)) {
            const componentPattern = /(?:export\s+)?(?:const|function)\s+([A-Z]\w+)\s*[=(]/g;
            let compMatch;
            while ((compMatch = componentPattern.exec(fileText)) !== null) {
                const compName = compMatch[1];
                const usageInAll = (allContent.match(new RegExp(`<${compName}[\\s/>]`, 'g')) ?? []).length;
                if (usageInAll === 0) {
                    const lineNum = fileText.slice(0, compMatch.index).split('\n').length;
                    items.push({
                        file: relativePath, line: lineNum,
                        type: 'unused-component', severity: 'high',
                        name: compName,
                        message: `React component "${compName}" is never used in JSX`,
                        snippet: `<${compName} />`
                    });
                }
            }
        }

        // ── Commented-out code blocks ──────────────────────────────────────
        let consecutiveComments = 0;
        let startLine = 0;
        lines.forEach((line, i) => {
            const trimmed = line.trim();
            const isCodeComment = trimmed.match(/^\/\/\s*(?:const|let|var|function|return|if|for|import|export|\w+\s*\()/);
            if (isCodeComment) {
                if (consecutiveComments === 0) startLine = i + 1;
                consecutiveComments++;
            } else {
                if (consecutiveComments >= 3) {
                    items.push({
                        file: relativePath, line: startLine,
                        type: 'commented-code', severity: 'low',
                        name: 'commented block',
                        message: `${consecutiveComments} lines of commented-out code starting at line ${startLine} — remove if not needed`,
                    });
                }
                consecutiveComments = 0;
            }
        });

        return items;
    },

    // ── Find unused files ──────────────────────────────────────────────────
    findUnusedFiles(files: { path: string; content: string }[]): DeadCodeItem[] {
        const items: DeadCodeItem[] = [];
        const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
        const allContent = files.map(f => f.content).join('\n');

        files.forEach(file => {
            const relativePath = ws ? path.relative(ws, file.path) : file.path;
            const baseName = path.basename(file.path, path.extname(file.path));

            // Skip index files, config files, entry points
            const skipFiles = ['index', 'main', 'app', 'server', 'config', 'setup', 'jest.config', 'vite.config', 'webpack.config'];
            if (skipFiles.some(s => baseName.toLowerCase().includes(s))) return;

            // Check if this file is imported anywhere
            const importPatterns = [
                new RegExp(`from\\s+['"].*${baseName}['"]`),
                new RegExp(`require\\s*\\(\\s*['"].*${baseName}['"]`),
                new RegExp(`import\\s+['"].*${baseName}['"]`),
            ];

            const isImported = importPatterns.some(p => allContent.match(p));

            if (!isImported) {
                items.push({
                    file: relativePath,
                    type: 'unused-file', severity: 'high',
                    name: relativePath,
                    message: `File "${relativePath}" is never imported or referenced`,
                });
            }
        });

        return items;
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
                        results.push({ path: full, content: fs.readFileSync(full, 'utf-8') });
                    } catch { /* skip */ }
                }
            }
        } catch { /* skip */ }
    },

    calculateScore(items: DeadCodeItem[]): number {
        let deductions = 0;
        items.forEach(i => {
            deductions += i.severity === 'high' ? 10 : i.severity === 'medium' ? 5 : 2;
        });
        return Math.max(0, 100 - deductions);
    }
};