import * as vscode from 'vscode';
import { AiService } from '../services/AiService';
import { GitService } from '../services/GitService';
import { LearningService } from '../services/LearningService';
import { SessionMemoryService } from '../services/SessionMemoryService';
import { DiffManager } from '../providers/DiffManager';
import { handleError } from '../utils/errorHandler';
import { showGitPanel } from '../panels/gitPanel';
import { showPRPanel } from '../panels/prPanel';
import { showChangelogPanel } from '../panels/changelogPanel';
import { requireApiKey } from '../helpers/requireApiKey';
import * as path from 'path';
import * as fs from 'fs';

export function registerGitCommands(
    context: vscode.ExtensionContext,
    learningService: LearningService,
    sessionMemory: SessionMemoryService
): void {

    context.subscriptions.push(
        vscode.commands.registerCommand('sarvis.gitCommitMessage', async () => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;
                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Sarvis generating commit message...', cancellable: false },
                    async () => {
                        const diff = await GitService.getDiff();
                        if (!diff) { vscode.window.showWarningMessage('No changes found to commit.'); return; }
                        const message = await AiService.generateCommitMessage(apiKey, diff);
                        if (!message) return;

                        const clean = message.trim();
                        const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
                        const git = gitExtension?.getAPI(1);
                        const repo = git?.repositories?.[0];

                        if (repo) {
                            repo.inputBox.value = clean;
                            vscode.commands.executeCommand('workbench.view.scm');
                            vscode.window.setStatusBarMessage('⚡ Sarvis commit message ready', 3000);
                        } else {
                            await vscode.env.clipboard.writeText(clean);
                            vscode.window.showInformationMessage(`📋 Copied: ${clean}`);
                        }
                    }
                );
            } catch (err) { handleError(err, 'gitCommitMessage'); }
        }),

        vscode.commands.registerCommand('sarvis.gitSummarize', async () => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;
                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Sarvis summarizing changes...', cancellable: false },
                    async () => {
                        const diff = await GitService.getDiff();
                        if (!diff) { vscode.window.showWarningMessage('No changes found.'); return; }
                        const summary = await AiService.summarizeChanges(apiKey, diff);
                        if (summary) showGitPanel('📝 Change Summary', summary, context);
                    }
                );
            } catch (err) { handleError(err, 'gitSummarize'); }
        }),

        vscode.commands.registerCommand('sarvis.gitReview', async () => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;
                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Sarvis reviewing diff...', cancellable: false },
                    async () => {
                        const diff = await GitService.getDiff();
                        if (!diff) { vscode.window.showWarningMessage('No changes found.'); return; }
                        const review = await AiService.reviewDiff(apiKey, diff);
                        if (review) showGitPanel('🔍 Code Review', review, context);
                    }
                );
            } catch (err) { handleError(err, 'gitReview'); }
        }),

        vscode.commands.registerCommand('sarvis.createPR', async () => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;

                const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (!ws) { vscode.window.showWarningMessage('No workspace folder open.'); return; }

                let diff = '', commits = '', branch = 'main';
                let prData: Record<string, unknown> | null = null;

                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Sarvis generating PR...', cancellable: false },
                    async (progress) => {
                        progress.report({ message: 'Reading git changes...' });
                        try {
                            branch = require('child_process')
                                .execSync('git branch --show-current', { cwd: ws })
                                .toString().trim() || 'feature-branch';
                        } catch { branch = 'feature-branch'; }

                        try { diff = await GitService.getDiff(); } catch { diff = ''; }
                        if (!diff) { vscode.window.showWarningMessage('No changes found. Make some changes first.'); return; }

                        if (diff.length > 6000) {
                            vscode.window.showWarningMessage(`Diff is large (${Math.round(diff.length / 1000)}KB). Using first 6000 chars.`);
                            diff = diff.slice(0, 6000);
                        }

                        progress.report({ message: 'Reading commit history...' });
                        try { commits = await GitService.getLog(10); } catch { commits = 'No commits yet'; }

                        progress.report({ message: 'AI generating PR...' });
                        const raw = await AiService.generatePullRequest(
                            apiKey, diff, commits, branch,
                            learningService.buildContextPrompt() + '\n' + sessionMemory.buildContextPrompt()
                        );
                        if (!raw) return;
                        try {
                            prData = JSON.parse((raw as string).replace(/```json|```/g, '').trim());
                        } catch {
                            vscode.window.showErrorMessage('Sarvis returned invalid PR data. Try again.');
                        }
                    }
                );

                if (prData) showPRPanel(prData, branch, diff, context);
            } catch (err) { handleError(err, 'createPR'); }
        }),

        vscode.commands.registerCommand('sarvis.generateChangelog', async () => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;

                const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (!ws) { vscode.window.showWarningMessage('No workspace open.'); return; }

                let commits = '', lastTag = 'beginning', currentVersion = '1.0.0';
                let changelogData: Record<string, unknown> | null = null;

                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Sarvis generating changelog...', cancellable: false },
                    async (progress) => {
                        const execAsync = require('util').promisify(require('child_process').exec);

                        progress.report({ message: 'Reading git tags...' });
                        try {
                            const { stdout } = await execAsync('git describe --tags --abbrev=0', { cwd: ws });
                            lastTag = stdout.trim();
                        } catch { lastTag = 'beginning'; }

                        try {
                            const pkgPath = path.join(ws, 'package.json');
                            if (fs.existsSync(pkgPath)) {
                                currentVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')).version ?? '1.0.0';
                            }
                        } catch { /* skip */ }

                        progress.report({ message: 'Reading commits...' });
                        try {
                            let range = '';
                            if (lastTag === 'beginning') {
                                range = 'HEAD';
                            } else {
                                const { stdout: countOut } = await execAsync(`git rev-list ${lastTag}..HEAD --count`, { cwd: ws }).catch(() => ({ stdout: '0' }));
                                const count = parseInt(countOut.trim(), 10);
                                range = count === 0 ? '-10' : `${lastTag}..HEAD`;
                                if (count === 0) vscode.window.showInformationMessage(`No commits since tag ${lastTag}. Using last 10 commits.`);
                            }
                            const cmd = `git log ${range} --pretty=format:"%h %s (%an)" --no-merges`;
                            const { stdout } = await execAsync(cmd, { cwd: ws });
                            commits = stdout.trim();
                        } catch {
                            try {
                                const { stdout } = await execAsync('git log -10 --pretty=format:"%h %s (%an)" --no-merges', { cwd: ws });
                                commits = stdout.trim();
                            } catch { commits = 'No commits found'; }
                        }

                        if (!commits || commits === 'No commits found') {
                            vscode.window.showWarningMessage('No commits found. Make some commits first then try again.');
                            return;
                        }

                        progress.report({ message: 'AI generating changelog...' });
                        const raw = await AiService.generateChangelog(apiKey, commits, currentVersion, lastTag, learningService.buildContextPrompt());
                        if (!raw) return;
                        try { changelogData = JSON.parse(raw); } catch {
                            vscode.window.showErrorMessage('Could not parse changelog data.');
                        }
                    }
                );

                if (changelogData) showChangelogPanel(changelogData, ws, commits);
            } catch (err) { handleError(err, 'generateChangelog'); }
        })
    );
}
