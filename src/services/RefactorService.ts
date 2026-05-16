import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface RefactorFile {
    filePath: string;
    originalContent: string;
    newContent: string;
    action: 'modify' | 'create' | 'delete' | 'rename';
    newPath?: string;
}

export interface RefactorPlan {
    description: string;
    files: RefactorFile[];
    summary: string;
}

const SUPPORTED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.css', '.scss', '.html', '.json'];
const IGNORE = ['node_modules', '.git', 'dist', 'out', 'build', '.next', 'coverage'];

export const RefactorService = {

    collectProjectFiles(maxFiles = 20): { path: string; content: string; language: string }[] {
        const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!ws) return [];

        const results: { path: string; content: string; language: string }[] = [];
        this._walk(ws, ws, results, maxFiles);
        return results;
    },

    _walk(
        baseDir: string,
        dir: string,
        results: { path: string; content: string; language: string }[],
        maxFiles: number
    ): void {
        if (results.length >= maxFiles) return;

        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (results.length >= maxFiles) return;
            if (IGNORE.includes(entry.name)) continue;

            const full = path.join(dir, entry.name);
            const relative = path.relative(baseDir, full);

            if (entry.isDirectory()) {
                this._walk(baseDir, full, results, maxFiles);
            } else if (SUPPORTED_EXTENSIONS.includes(path.extname(entry.name))) {
                try {
                    const content = fs.readFileSync(full, 'utf-8');
                    if (content.length > 50000) continue; // skip huge files
                    results.push({
                        path: relative,
                        content: content.slice(0, 3000), // truncate for context
                        language: path.extname(entry.name).slice(1)
                    });
                } catch { /* skip unreadable files */ }
            }
        }
    },

    applyRefactorPlan(plan: RefactorPlan): vscode.WorkspaceEdit {
        const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
        const edit = new vscode.WorkspaceEdit();

        for (const file of plan.files) {
            const fullPath = path.isAbsolute(file.filePath)
                ? file.filePath
                : path.join(ws, file.filePath);
            const uri = vscode.Uri.file(fullPath);

            if (file.action === 'create') {
                edit.createFile(uri, { overwrite: true });
                edit.insert(uri, new vscode.Position(0, 0), file.newContent);
            } else if (file.action === 'delete') {
                edit.deleteFile(uri, { ignoreIfNotExists: true });
            } else if (file.action === 'rename' && file.newPath) {
                const newFullPath = path.isAbsolute(file.newPath)
                    ? file.newPath
                    : path.join(ws, file.newPath);
                edit.renameFile(uri, vscode.Uri.file(newFullPath));
            } else if (file.action === 'modify') {
                const range = new vscode.Range(
                    new vscode.Position(0, 0),
                    new vscode.Position(999999, 0)
                );
                edit.replace(uri, range, file.newContent);
            }
        }

        return edit;
    }
};