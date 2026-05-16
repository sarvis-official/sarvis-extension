import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as util from 'util';

const exec = util.promisify(cp.exec);

export const GitService = {

    async getDiff(): Promise<string> {
        const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!ws) throw new Error('No workspace folder found.');
        try {
            // 1. Try staged first
            const { stdout: staged } = await exec('git diff --staged', { cwd: ws });
            if (staged.trim()) return staged.trim();

            // 2. Fall back to unstaged
            const { stdout: unstaged } = await exec('git diff', { cwd: ws });
            if (unstaged.trim()) return unstaged.trim();

            // 3. Fall back to last commit diff
            const { stdout: lastCommit } = await exec('git diff HEAD~1 HEAD', { cwd: ws });
            return lastCommit.trim();

        } catch {
            throw new Error('Git not found or not a git repository.');
        }
    },

    async getLog(n = 10): Promise<string> {
        const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!ws) throw new Error('No workspace folder found.');
        const { stdout } = await exec(`git log --oneline -${n}`, { cwd: ws });
        return stdout.trim();
    },

    async getStatus(): Promise<string> {
        const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!ws) throw new Error('No workspace folder found.');
        const { stdout } = await exec('git status --short', { cwd: ws });
        return stdout.trim();
    },

    async getBranch(): Promise<string> {
        const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!ws) return 'unknown';
        const { stdout } = await exec('git branch --show-current', { cwd: ws });
        return stdout.trim();
    }
};