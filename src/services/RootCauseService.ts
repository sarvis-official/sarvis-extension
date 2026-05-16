import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as util from 'util';
import * as path from 'path';
import * as fs from 'fs';

const exec = util.promisify(cp.exec);

export interface RootCauseContext {
    stackTrace: string;
    relatedFiles: { path: string; content: string }[];
    recentChanges: string;
    errorLocation: { file: string; line: number } | null;
}

export const RootCauseService = {

    // ── Parse stack trace to find error location ───────────────────────────
    parseErrorLocation(stackTrace: string): { file: string; line: number } | null {
        const patterns = [
            /at .+ \((.+):(\d+):\d+\)/,           // Node.js: at func (file:line:col)
            /File "(.+)", line (\d+)/,              // Python
            /at (.+):(\d+)/,                        // simple file:line
            /([a-zA-Z0-9_\-./\\]+\.(?:ts|js|py|java|go|rs)):(\d+)/  // bare file:line
        ];

        for (const pattern of patterns) {
            const match = stackTrace.match(pattern);
            if (match) {
                return { file: match[1], line: parseInt(match[2], 10) };
            }
        }
        return null;
    },

    // ── Collect related files from stack trace ─────────────────────────────
    async collectRelatedFiles(stackTrace: string): Promise<{ path: string; content: string }[]> {
        const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!ws) return [];

        const filePattern = /([a-zA-Z0-9_\-./\\]+\.(?:ts|js|py|java|go|rs|cs|cpp|c))/g;
        const matches = [...stackTrace.matchAll(filePattern)];
        const uniqueFiles = [...new Set(matches.map(m => m[1]))];

        const results: { path: string; content: string }[] = [];

        for (const file of uniqueFiles.slice(0, 5)) {
            // Try absolute path first, then relative to workspace
            const candidates = [
                file,
                path.join(ws, file),
                path.join(ws, 'src', path.basename(file)),
            ];

            for (const candidate of candidates) {
                if (fs.existsSync(candidate)) {
                    try {
                        const content = fs.readFileSync(candidate, 'utf-8');
                        results.push({
                            path: path.relative(ws, candidate),
                            content: content.slice(0, 2000)
                        });
                        break;
                    } catch { /* skip */ }
                }
            }
        }

        // Also include active editor file
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const activePath = path.relative(ws, editor.document.uri.fsPath);
            if (!results.find(r => r.path === activePath)) {
                results.push({
                    path: activePath,
                    content: editor.document.getText().slice(0, 2000)
                });
            }
        }

        return results;
    },

    // ── Get recent git changes ─────────────────────────────────────────────
    async getRecentChanges(): Promise<string> {
        const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!ws) return 'Git history unavailable';

        try {
            // Last 3 commits diff
            const { stdout: log } = await exec('git log --oneline -5', { cwd: ws });
            const { stdout: diff } = await exec('git diff HEAD~1 HEAD --stat', { cwd: ws });
            const { stdout: recentDiff } = await exec('git diff HEAD~1 HEAD -- "*.ts" "*.js" "*.py" "*.java"', { cwd: ws });

            return `Recent commits:\n${log}\n\nChanged files:\n${diff}\n\nRecent code changes:\n${recentDiff.slice(0, 2000)}`;
        } catch {
            try {
                // Fallback: just unstaged changes
                const { stdout } = await exec('git diff', { cwd: ws });
                return stdout.slice(0, 2000) || 'No recent changes';
            } catch {
                return 'Git history unavailable';
            }
        }
    },

    // ── Build full context for AI ──────────────────────────────────────────
    async buildContext(stackTrace: string): Promise<RootCauseContext> {
        const [relatedFiles, recentChanges] = await Promise.all([
            this.collectRelatedFiles(stackTrace),
            this.getRecentChanges()
        ]);

        return {
            stackTrace,
            relatedFiles,
            recentChanges,
            errorLocation: this.parseErrorLocation(stackTrace)
        };
    }
};