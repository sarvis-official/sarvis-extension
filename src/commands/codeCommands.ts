import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AiService } from '../services/AiService';
import { LearningService } from '../services/LearningService';
import { SessionMemoryService } from '../services/SessionMemoryService';
import { DiagnosticService } from '../services/DiagnosticService';
import { DiagnosticCodeActionProvider } from '../providers/DiagnosticCodeActionProvider';
import { handleError } from '../utils/errorHandler';
import { showExplanationPanel } from '../panels/explanationPanel';
import { requireApiKey } from '../helpers/requireApiKey';
import { applyFixToDocument } from '../helpers/applyFix';

export function registerCodeCommands(
    context: vscode.ExtensionContext,
    learningService: LearningService,
    sessionMemory: SessionMemoryService
): void {

    context.subscriptions.push(

        // ─── Generate Code ─────────────────────────────────────────────────────
        vscode.commands.registerCommand('sarvis.generateCode', async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) return;
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;

                const prompt = await vscode.window.showInputBox({
                    prompt: 'Describe what you want to generate',
                    placeHolder: 'e.g. Create a REST API controller for user login',
                    ignoreFocusOut: true
                });
                if (!prompt) return;

                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Sarvis generating code...', cancellable: false },
                    async () => {
                        const generated = await AiService.generateFromPrompt(apiKey, prompt, editor.document.languageId, learningService.buildContextPrompt() + '\n' + sessionMemory.buildContextPrompt());
                        if (generated) {
                            await editor.edit(edit => edit.insert(editor.selection.active, generated));
                            vscode.window.setStatusBarMessage('⚡ Sarvis code generated', 2000);
                        }
                    }
                );
            } catch (err) { handleError(err, 'generateCode'); }
        }),

        // ─── Edit Code with Prompt ─────────────────────────────────────────────
        vscode.commands.registerCommand('sarvis.editCodeWithPrompt', async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) { vscode.window.showWarningMessage('Open a file first.'); return; }
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;

                const hasSelection = !editor.selection.isEmpty;
                const code = hasSelection ? editor.document.getText(editor.selection) : editor.document.getText();
                const scopeLabel = hasSelection ? 'selection' : 'entire file';

                const suggestions = [
                    '✏️ Custom instruction...',
                    '🔷 Convert to TypeScript', '⚡ Add async/await', '🛡️ Add error handling',
                    '🗃️ Add caching to this function', '🔄 Replace fetch with axios',
                    '🔄 Replace axios with fetch', '📝 Add JSDoc comments', '🧹 Clean up and simplify',
                    '🔒 Add input validation', '🪵 Add logging', '⚙️ Extract into smaller functions',
                    '🧪 Make this testable', '🌐 Convert to React component', '🏗️ Apply repository pattern',
                    '📦 Convert CommonJS to ESM', '📦 Convert ESM to CommonJS',
                    '🔁 Convert callbacks to Promises', '🔁 Convert Promises to async/await',
                    '💾 Add database transaction', '🔍 Add search/filter functionality', '📄 Add pagination',
                ];

                const selected = await vscode.window.showQuickPick(suggestions, { placeHolder: `What do you want to do with the ${scopeLabel}?`, matchOnDescription: true });
                if (!selected) return;

                let instruction = selected;
                if (selected === '✏️ Custom instruction...') {
                    const custom = await vscode.window.showInputBox({ prompt: `Describe how to edit the ${scopeLabel}`, placeHolder: 'e.g. Add retry logic with exponential backoff', ignoreFocusOut: true });
                    if (!custom?.trim()) return;
                    instruction = custom.trim();
                } else {
                    instruction = selected.replace(/^[^\w]+/, '').trim();
                }

                let edited: string | null = null;

                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: `Sarvis: "${instruction}"...`, cancellable: false },
                    async () => {
                        edited = await AiService.editCodeWithPrompt(apiKey, instruction, code, editor.document.languageId, hasSelection, learningService.buildContextPrompt());
                    }
                );
                if (!edited) { vscode.window.showErrorMessage('Sarvis could not edit the code. Try again.'); return; }

                const originalUri = editor.document.uri;
                const modifiedUri = vscode.Uri.parse(`sarvis-edit:${originalUri.path}.edited`);
                const provider = { provideTextDocumentContent: () => edited! };
                context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('sarvis-edit', provider));
                await vscode.commands.executeCommand('vscode.diff', originalUri, modifiedUri, `Sarvis Edit: ${path.basename(editor.document.fileName)} ← "${instruction}"`);

                const action = await vscode.window.showInformationMessage(`Apply edit: "${instruction}"?`, { modal: false }, 'Apply', 'Discard');
                if (action === 'Apply') {
                    const editOp = new vscode.WorkspaceEdit();
                    if (hasSelection) {
                        editOp.replace(originalUri, editor.selection, edited);
                    } else {
                        editOp.replace(originalUri, new vscode.Range(editor.document.positionAt(0), editor.document.positionAt(code.length)), edited);
                    }
                    await vscode.workspace.applyEdit(editOp);
                    vscode.window.setStatusBarMessage(`⚡ Sarvis applied: "${instruction}"`, 4000);

                    const isToTS = /typescript|\.ts/i.test(instruction);
                    const currentExt = path.extname(editor.document.fileName);
                    if (isToTS && currentExt === '.js') {
                        const newPath = editor.document.fileName.replace(/\.js$/, '.ts');
                        const newUri = vscode.Uri.file(newPath);
                        const createEdit = new vscode.WorkspaceEdit();
                        createEdit.createFile(newUri, { overwrite: true });
                        await vscode.workspace.applyEdit(createEdit);
                        const writeEdit = new vscode.WorkspaceEdit();
                        writeEdit.insert(newUri, new vscode.Position(0, 0), edited);
                        await vscode.workspace.applyEdit(writeEdit);
                        const deleteEdit = new vscode.WorkspaceEdit();
                        deleteEdit.deleteFile(originalUri, { ignoreIfNotExists: true });
                        await vscode.workspace.applyEdit(deleteEdit);
                        const newDoc = await vscode.workspace.openTextDocument(newUri);
                        await vscode.window.showTextDocument(newDoc);
                        vscode.window.showInformationMessage(`✅ Converted to TypeScript → ${path.basename(newPath)}`);
                    }
                }
            } catch (err) { handleError(err, 'editCodeWithPrompt'); }
        }),

        // ─── Fix Selection ─────────────────────────────────────────────────────
        vscode.commands.registerCommand('sarvis.fixSelection', async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) return;
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;

                const { document } = editor;
                const range = editor.selection.isEmpty
                    ? new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length))
                    : editor.selection;
                const originalCode = document.getText(range);
                if (!originalCode.trim()) { vscode.window.showWarningMessage('No code to fix.'); return; }

                const improved = await AiService.improveCode(apiKey, originalCode);
                if (!improved || improved.trim() === originalCode.trim()) { vscode.window.showInformationMessage('No improvements suggested.'); return; }

                const edit = new vscode.WorkspaceEdit();
                edit.replace(document.uri, range, improved);
                await vscode.workspace.applyEdit(edit);
                vscode.window.setStatusBarMessage('⚡ Sarvis fix applied', 2000);
            } catch (err) { handleError(err, 'fixSelection'); }
        }),

        // ─── Explain Code ──────────────────────────────────────────────────────
        vscode.commands.registerCommand('sarvis.explainCode', async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) return;
                if (editor.selection.isEmpty) { vscode.window.showWarningMessage('Select code to explain.'); return; }
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;

                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Sarvis analyzing code...', cancellable: false },
                    async () => {
                        const explanation = await AiService.explainCode(apiKey, editor.document.getText(editor.selection), editor.document.languageId);
                        if (explanation) showExplanationPanel(explanation);
                    }
                );
            } catch (err) { handleError(err, 'explainCode'); }
        }),

        // ─── Refactor File ─────────────────────────────────────────────────────
        vscode.commands.registerCommand('sarvis.refactorFile', async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) { vscode.window.showWarningMessage('Open a file to refactor.'); return; }
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;

                const instruction = await vscode.window.showInputBox({
                    prompt: 'Describe how to refactor this file',
                    placeHolder: 'e.g. Convert to TypeScript, Extract functions into separate methods, Add error handling',
                    ignoreFocusOut: true
                });
                if (!instruction) return;

                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Sarvis refactoring file...', cancellable: false },
                    async () => {
                        const code = editor.document.getText();
                        const language = editor.document.languageId;
                        const refactored = await AiService.refactorSingleFile(apiKey, instruction, code, language, learningService.buildContextPrompt());
                        if (!refactored) return;

                        const originalUri = editor.document.uri;
                        const modifiedUri = vscode.Uri.parse(`sarvis-diff:${originalUri.path}.refactored`);
                        context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('sarvis-diff', { provideTextDocumentContent: () => refactored }));
                        await vscode.commands.executeCommand('vscode.diff', originalUri, modifiedUri, `Sarvis Refactor: ${path.basename(editor.document.fileName)}`);

                        const apply = await vscode.window.showInformationMessage('Apply this refactoring?', { modal: false }, 'Apply', 'Discard');
                        if (apply !== 'Apply') return;

                        const isToTS = /typescript|\.ts/i.test(instruction);
                        const isToJS = /javascript|\.js/i.test(instruction);
                        const currentExt = path.extname(editor.document.fileName);
                        const extMap: Record<string, string> = { '.js': '.ts', '.jsx': '.tsx', '.ts': '.js', '.tsx': '.jsx' };
                        const shouldRename = (isToTS && ['.js', '.jsx'].includes(currentExt)) || (isToJS && ['.ts', '.tsx'].includes(currentExt));

                        if (shouldRename) {
                            const newExt = extMap[currentExt] ?? currentExt;
                            const newFilePath = editor.document.fileName.replace(new RegExp(`\\${currentExt}$`), newExt);
                            const newUri = vscode.Uri.file(newFilePath);
                            const createEdit = new vscode.WorkspaceEdit();
                            createEdit.createFile(newUri, { overwrite: true, ignoreIfExists: false });
                            await vscode.workspace.applyEdit(createEdit);
                            const writeEdit = new vscode.WorkspaceEdit();
                            writeEdit.insert(newUri, new vscode.Position(0, 0), refactored);
                            await vscode.workspace.applyEdit(writeEdit);
                            const deleteEdit = new vscode.WorkspaceEdit();
                            deleteEdit.deleteFile(originalUri, { ignoreIfNotExists: true });
                            await vscode.workspace.applyEdit(deleteEdit);
                            const newDoc = await vscode.workspace.openTextDocument(newUri);
                            await vscode.window.showTextDocument(newDoc);
                            vscode.window.showInformationMessage(`✅ Converted ${path.basename(editor.document.fileName)} → ${path.basename(newFilePath)}`);
                        } else {
                            const edit = new vscode.WorkspaceEdit();
                            edit.replace(originalUri, new vscode.Range(editor.document.positionAt(0), editor.document.positionAt(code.length)), refactored);
                            await vscode.workspace.applyEdit(edit);
                            vscode.window.setStatusBarMessage('⚡ Sarvis refactoring applied', 3000);
                        }
                    }
                );
            } catch (err) { handleError(err, 'refactorFile'); }
        }),

        // ─── Add JSDocs ────────────────────────────────────────────────────────
        vscode.commands.registerCommand('sarvis.addJsDocs', async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) { vscode.window.showWarningMessage('Open a file first.'); return; }
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;

                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Sarvis adding JSDoc comments...', cancellable: false },
                    async () => {
                        const code = editor.document.getText();
                        const commented = await AiService.addJsDocComments(apiKey, code, editor.document.languageId, learningService.buildContextPrompt());
                        if (!commented) return;
                        const edit = new vscode.WorkspaceEdit();
                        edit.replace(editor.document.uri, new vscode.Range(editor.document.positionAt(0), editor.document.positionAt(code.length)), commented);
                        await vscode.workspace.applyEdit(edit);
                        vscode.window.setStatusBarMessage('⚡ Sarvis added JSDoc comments', 3000);
                    }
                );
            } catch (err) { handleError(err, 'addJsDocs'); }
        }),

        // ─── Fix Diagnostics ───────────────────────────────────────────────────
        vscode.languages.registerCodeActionsProvider({ pattern: '**' }, new DiagnosticCodeActionProvider(), { providedCodeActionKinds: DiagnosticCodeActionProvider.providedCodeActionKinds }),

        vscode.commands.registerCommand('sarvis.fixDiagnostic', async (uri: vscode.Uri, diagnostic: vscode.Diagnostic) => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;
                const document = await vscode.workspace.openTextDocument(uri);
                const code = document.getText();
                const diagText = `❌ ${diagnostic.message} at line ${diagnostic.range.start.line + 1}`;
                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Sarvis fixing issue...', cancellable: false },
                    async () => {
                        const fixed = await AiService.fixDiagnostics(apiKey, code, document.languageId, diagText, learningService.buildContextPrompt());
                        if (!fixed) return;
                        await applyFixToDocument(uri, code, fixed);
                        vscode.window.setStatusBarMessage('⚡ Sarvis fixed the issue', 3000);
                    }
                );
            } catch (err) { handleError(err, 'fixDiagnostic'); }
        }),

        vscode.commands.registerCommand('sarvis.fixAllInFile', async (uri?: vscode.Uri) => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;
                const targetUri = uri ?? vscode.window.activeTextEditor?.document.uri;
                if (!targetUri) { vscode.window.showWarningMessage('Open a file first.'); return; }
                const document = await vscode.workspace.openTextDocument(targetUri);
                const fixes = DiagnosticService.getFileDiagnostics(targetUri);
                if (fixes.length === 0) { vscode.window.showInformationMessage('✅ No problems found in this file.'); return; }

                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: `Sarvis fixing ${fixes.length} issue(s)...`, cancellable: false },
                    async () => {
                        const fixed = await AiService.fixDiagnostics(apiKey, document.getText(), document.languageId, DiagnosticService.formatDiagnosticsForAI(fixes), learningService.buildContextPrompt());
                        if (!fixed) return;
                        await applyFixToDocument(targetUri, document.getText(), fixed);
                        vscode.window.showInformationMessage(`✅ Sarvis fixed ${fixes.length} issue(s) in ${path.basename(targetUri.fsPath)}`);
                    }
                );
            } catch (err) { handleError(err, 'fixAllInFile'); }
        }),

        vscode.commands.registerCommand('sarvis.fixAllInWorkspace', async () => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;
                const allFixes = DiagnosticService.getWorkspaceDiagnostics();
                if (allFixes.length === 0) { vscode.window.showInformationMessage('✅ No problems found in workspace.'); return; }
                const grouped = DiagnosticService.groupByFile(allFixes);
                const fileCount = grouped.size;
                const confirm = await vscode.window.showWarningMessage(`Sarvis will fix ${allFixes.length} issue(s) across ${fileCount} file(s). Proceed?`, { modal: true }, 'Fix All');
                if (confirm !== 'Fix All') return;

                let fixedFiles = 0, totalFixed = 0;
                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Sarvis fixing workspace issues...', cancellable: false },
                    async (progress) => {
                        for (const [filePath, fixes] of grouped) {
                            progress.report({ message: `${path.basename(filePath)} (${fixedFiles + 1}/${fileCount})`, increment: 100 / fileCount });
                            const document = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
                            const fixed = await AiService.fixDiagnostics(apiKey, document.getText(), document.languageId, DiagnosticService.formatDiagnosticsForAI(fixes), learningService.buildContextPrompt());
                            if (fixed) { await applyFixToDocument(vscode.Uri.file(filePath), document.getText(), fixed); fixedFiles++; totalFixed += fixes.length; }
                        }
                    }
                );
                vscode.window.showInformationMessage(`✅ Sarvis fixed ${totalFixed} issue(s) across ${fixedFiles} file(s)`);
            } catch (err) { handleError(err, 'fixAllInWorkspace'); }
        })
    );
}
