import * as vscode from 'vscode';
import { AiService } from '../services/AiService';
import { GitService } from '../services/GitService';
import { handleError } from '../utils/errorHandler';
import { showReviewPanel } from '../panels/reviewPanel';
import { requireApiKey } from '../helpers/requireApiKey';
import * as path from 'path';

export function registerReviewCommands(
    context: vscode.ExtensionContext
): void {

    context.subscriptions.push(

        vscode.commands.registerCommand('sarvis.reviewFile', async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) { vscode.window.showWarningMessage('Open a file to review.'); return; }

                const apiKey = await requireApiKey(context);
                if (!apiKey) return;

                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Sarvis reviewing file...', cancellable: false },
                    async () => {
                        const code = editor.document.getText();
                        const language = editor.document.languageId;
                        const fileName = path.basename(editor.document.fileName);
                        const review = await AiService.reviewFile(apiKey, code, language);
                        if (review) showReviewPanel(`📄 File Review: ${fileName}`, review);
                    }
                );
            } catch (err) { handleError(err, 'reviewFile'); }
        }),

        vscode.commands.registerCommand('sarvis.reviewDiffCode', async () => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;

                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Sarvis reviewing diff...', cancellable: false },
                    async () => {
                        const diff = await GitService.getDiff();
                        if (!diff) { vscode.window.showWarningMessage('No changes found to review.'); return; }
                        const review = await AiService.reviewDiffCode(apiKey, diff);
                        if (review) showReviewPanel('🔀 Diff Review', review);
                    }
                );
            } catch (err) { handleError(err, 'reviewDiffCode'); }
        }),

        vscode.commands.registerCommand('sarvis.reviewPR', async () => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;

                const prTitle = await vscode.window.showInputBox({
                    prompt: 'Enter PR title',
                    placeHolder: 'feat: add user authentication',
                    ignoreFocusOut: true
                });
                if (!prTitle) return;

                const prDescription = await vscode.window.showInputBox({
                    prompt: 'Enter PR description (optional)',
                    placeHolder: 'Adds JWT-based auth with refresh tokens...',
                    ignoreFocusOut: true
                }) ?? '';

                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Sarvis reviewing PR...', cancellable: false },
                    async () => {
                        const diff = await GitService.getDiff();
                        if (!diff) { vscode.window.showWarningMessage('No changes found.'); return; }
                        const review = await AiService.reviewPR(apiKey, diff, prTitle, prDescription);
                        if (review) showReviewPanel(`🔍 PR Review: ${prTitle}`, review);
                    }
                );
            } catch (err) { handleError(err, 'reviewPR'); }
        })
    );
}
