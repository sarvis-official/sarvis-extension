import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AiService } from '../services/AiService';
import { LearningService } from '../services/LearningService';
import { SessionMemoryService } from '../services/SessionMemoryService';
import { RootCauseService } from '../services/RootCauseService';
import { TestRunnerService, TestRunResult } from '../services/TestRunnerService';
import { DiffManager } from '../providers/DiffManager';
import { handleError } from '../utils/errorHandler';
import { showDebugPanel } from '../panels/debugPanel';
import { showRootCausePanel } from '../panels/rootCausePanel';
import { showTestResultPanel } from '../panels/testResultPanel';
import { requireApiKey } from '../helpers/requireApiKey';
import { SECRET_KEY } from '../types';

export function registerDebugCommands(
    context: vscode.ExtensionContext,
    learningService: LearningService,
    sessionMemory: SessionMemoryService,
    diffManager: DiffManager
): void {

    context.subscriptions.push(

        // ─── Debug Error ───────────────────────────────────────────────────────
        vscode.commands.registerCommand('sarvis.debugError', async () => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;
                const editor = vscode.window.activeTextEditor;
                let inputText = '';

                if (editor && !editor.selection.isEmpty) {
                    inputText = editor.document.getText(editor.selection);
                } else {
                    inputText = await vscode.env.clipboard.readText();
                }

                if (!inputText.trim()) { vscode.window.showWarningMessage('Select an error or copy a stack trace first.'); return; }

                const enrichedInput = sessionMemory.hasMemory ? `${inputText}\n\n${sessionMemory.buildContextPrompt()}` : inputText;

                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Sarvis analyzing error...', cancellable: false },
                    async () => {
                        const result = await AiService.debugError(apiKey, enrichedInput);
                        if (result) showDebugPanel(result, context, diffManager);
                    }
                );
            } catch (err) { handleError(err, 'debugError'); }
        }),

        // ─── Root Cause ────────────────────────────────────────────────────────
        vscode.commands.registerCommand('sarvis.findRootCause', async () => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;

                const editor = vscode.window.activeTextEditor;
                let errorText = '';
                if (editor && !editor.selection.isEmpty) {
                    errorText = editor.document.getText(editor.selection);
                } else {
                    errorText = await vscode.env.clipboard.readText();
                }
                if (!errorText.trim()) {
                    errorText = await vscode.window.showInputBox({ prompt: 'Paste your error or stack trace', placeHolder: 'TypeError: Cannot read property...', ignoreFocusOut: true }) ?? '';
                }
                if (!errorText.trim()) return;

                let result: string | null = null;
                let rootContext: import('../services/RootCauseService').RootCauseContext | null = null;

                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Sarvis analyzing root cause...', cancellable: false },
                    async (progress) => {
                        progress.report({ message: 'Collecting stack trace context...' });
                        rootContext = await RootCauseService.buildContext(errorText);
                        progress.report({ message: 'Analyzing git history...' });
                        result = await AiService.findRootCause(apiKey, rootContext, learningService.buildContextPrompt());
                    }
                );

                if (!result || !rootContext) { vscode.window.showErrorMessage('Sarvis could not analyze the error.'); return; }
                showRootCausePanel(result, rootContext, context, diffManager);
            } catch (err) { handleError(err, 'findRootCause'); }
        }),

        // ─── Fix Terminal Error ────────────────────────────────────────────────
        vscode.commands.registerCommand('sarvis.fixTerminalError', async () => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;
                const clipboardText = await vscode.env.clipboard.readText();
                if (!clipboardText.trim()) { vscode.window.showWarningMessage('Copy the terminal error first, then run Sarvis.'); return; }
                const terminal = vscode.window.activeTerminal;
                if (!terminal) { vscode.window.showWarningMessage('No active terminal found.'); return; }

                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Sarvis analyzing terminal error...', cancellable: false },
                    async () => {
                        const fixCommand = await AiService.analyzeTerminalError(apiKey, clipboardText, process.platform);
                        if (fixCommand) { terminal.sendText(fixCommand); vscode.window.setStatusBarMessage('⚡ Sarvis fix applied', 2000); }
                    }
                );
            } catch (err) { handleError(err, 'fixTerminalError'); }
        }),

        // ─── Generate Terminal Command ─────────────────────────────────────────
        vscode.commands.registerCommand('sarvis.generateTerminalCommand', async () => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;
                const input = await vscode.window.showInputBox({ prompt: 'Describe the terminal command you need', placeHolder: 'e.g. Install express and cors', ignoreFocusOut: true });
                if (!input) return;
                const terminal = vscode.window.activeTerminal ?? vscode.window.createTerminal('Sarvis Terminal');
                terminal.show();
                const command = await AiService.generateTerminalCommand(apiKey, input, process.platform);
                if (command) { terminal.sendText(command); vscode.window.setStatusBarMessage('⚡ Sarvis command generated', 2000); }
            } catch (err) { handleError(err, 'generateTerminalCommand'); }
        }),

        // ─── Run Tests ─────────────────────────────────────────────────────────
        vscode.commands.registerCommand('sarvis.runTests', async () => {
            try {
                const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (!ws) { vscode.window.showWarningMessage('No workspace open.'); return; }
                const framework = TestRunnerService.detectFramework(ws);
                if (framework === 'unknown') {
                    const choice = await vscode.window.showWarningMessage('Could not detect test framework. Run npm test anyway?', 'Run', 'Cancel');
                    if (choice !== 'Run') return;
                }
                let result: TestRunResult | null = null;
                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: `Sarvis running ${framework} tests...`, cancellable: false },
                    async () => { result = await TestRunnerService.runTests(ws, framework); }
                );
                if (!result) return;
                showTestResultPanel(result as TestRunResult, ws, context);
            } catch (err) { handleError(err, 'runTests'); }
        }),

        vscode.commands.registerCommand('sarvis.runTestsAndFix', async () => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;
                const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (!ws) { vscode.window.showWarningMessage('No workspace open.'); return; }

                const framework = TestRunnerService.detectFramework(ws);
                let result: TestRunResult | null = null;
                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Sarvis running tests...', cancellable: false },
                    async () => { result = await TestRunnerService.runTests(ws, framework); }
                );
                if (!result) return;
                const testResult = result as TestRunResult;

                if (testResult.failed === 0) {
                    vscode.window.showInformationMessage(`✅ All ${testResult.passed} tests passing! Nothing to fix.`);
                    return;
                }

                const fix = await vscode.window.showWarningMessage(
                    `⚠️ ${testResult.failed} test${testResult.failed > 1 ? 's' : ''} failing. Auto-fix with Sarvis?`,
                    { modal: false }, 'Fix Now', 'View Details', 'Cancel'
                );
                if (fix === 'View Details') { showTestResultPanel(testResult, ws, context); return; }
                if (fix !== 'Fix Now') return;
                await fixFailingTests(apiKey, testResult, ws, framework, context, learningService);
            } catch (err) { handleError(err, 'runTestsAndFix'); }
        }),

        // ─── Generate Tests ────────────────────────────────────────────────────
        vscode.commands.registerCommand('sarvis.generateTests', async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) return;
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;

                const { document } = editor;
                const selectedText = editor.selection.isEmpty ? document.getText() : document.getText(editor.selection);
                const filePath = document.uri.fsPath;
                const fileName = path.basename(filePath);

                const mode = await vscode.window.showQuickPick(['Generate Full Test File', 'Generate Missing Tests Only', 'Generate Skeleton Only'], { placeHolder: 'Select test generation mode' });
                if (!mode) return;

                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Sarvis generating tests...', cancellable: false },
                    async () => {
                        const testCode = await AiService.generateTests(apiKey, selectedText, document.languageId, mode);
                        if (testCode) await handleTestFileCreation(filePath, fileName, testCode);
                    }
                );
            } catch (err) { handleError(err, 'generateTests'); }
        })
    );
}

export async function fixFailingTests(
    apiKey: string,
    result: TestRunResult,
    ws: string,
    framework: string,
    context: vscode.ExtensionContext,
    learningService: LearningService
): Promise<void> {
    const failingTests = result.results.filter(r => r.status === 'failed');
    if (failingTests.length === 0) return;

    const testFiles = TestRunnerService.getFailingTestFiles(result, ws);
    const errorSummary = failingTests.slice(0, 5).map(t => `Test: ${t.name}\nError: ${t.error ?? 'Unknown error'}`).join('\n\n');

    let sourceCode = '', testCode = '', sourceFile = '', testFile = '';
    const testPatterns = ['__tests__', '.test.', '.spec.'];

    const walkForTests = (dir: string): string[] => {
        const found: string[] = [];
        try {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                if (['node_modules', '.git', 'dist'].includes(entry.name)) continue;
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) found.push(...walkForTests(full));
                else if (testPatterns.some(p => entry.name.includes(p))) found.push(full);
            }
        } catch { /* skip */ }
        return found;
    };

    const allTestFiles = testFiles.length > 0 ? testFiles : walkForTests(ws).slice(0, 3);
    if (allTestFiles.length > 0) { testFile = allTestFiles[0]; testCode = fs.readFileSync(testFile, 'utf-8'); }

    if (testFile) {
        const baseName = path.basename(testFile).replace('.test.', '.').replace('.spec.', '.');
        const srcPath = path.join(ws, 'src', baseName);
        const rootPath = path.join(ws, baseName);
        if (fs.existsSync(srcPath)) { sourceFile = srcPath; sourceCode = fs.readFileSync(srcPath, 'utf-8'); }
        else if (fs.existsSync(rootPath)) { sourceFile = rootPath; sourceCode = fs.readFileSync(rootPath, 'utf-8'); }
    }
    if (!sourceCode && vscode.window.activeTextEditor) {
        sourceFile = vscode.window.activeTextEditor.document.uri.fsPath;
        sourceCode = vscode.window.activeTextEditor.document.getText();
    }

    let fixResult: { fixedSource?: string; fixedTests?: string; explanation: string } | null = null;
    await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'Sarvis fixing failing tests...', cancellable: false },
        async () => {
            fixResult = await AiService.fixFailingTests(apiKey, errorSummary, sourceCode, testCode, vscode.window.activeTextEditor?.document.languageId ?? 'javascript', learningService.buildContextPrompt());
        }
    );
    if (!fixResult) { vscode.window.showErrorMessage('Sarvis could not fix the tests. Try again.'); return; }

    const fix = fixResult as { fixedSource?: string; fixedTests?: string; explanation: string };
    const edit = new vscode.WorkspaceEdit();
    let fixedCount = 0;

    if (fix.fixedSource && sourceFile) {
        const sourceUri = vscode.Uri.file(sourceFile);
        const sourceDoc = await vscode.workspace.openTextDocument(sourceUri);
        edit.replace(sourceUri, new vscode.Range(sourceDoc.positionAt(0), sourceDoc.positionAt(sourceDoc.getText().length)), fix.fixedSource);
        fixedCount++;
    }
    if (fix.fixedTests && testFile) {
        const testUri = vscode.Uri.file(testFile);
        const testDoc = await vscode.workspace.openTextDocument(testUri);
        edit.replace(testUri, new vscode.Range(testDoc.positionAt(0), testDoc.positionAt(testDoc.getText().length)), fix.fixedTests);
        fixedCount++;
    }
    if (fixedCount > 0) await vscode.workspace.applyEdit(edit);

    const rerun = await vscode.window.showInformationMessage(`⚡ Sarvis fixed ${fixedCount} file(s): ${fix.explanation}`, 'Re-run Tests', 'Dismiss');
    if (rerun === 'Re-run Tests') vscode.commands.executeCommand('sarvis.runTestsAndFix');
}

async function handleTestFileCreation(originalFilePath: string, fileName: string, testCode: string): Promise<void> {
    const dir = path.dirname(originalFilePath);
    const testDir = path.join(dir, '__tests__');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);
    const testFilePath = path.join(testDir, `${baseName}.test${ext}`);
    if (fs.existsSync(testFilePath)) {
        const existing = fs.readFileSync(testFilePath, 'utf-8');
        fs.writeFileSync(testFilePath, `${existing}\n\n// --- Sarvis Added Tests ---\n\n${testCode}`);
    } else {
        fs.writeFileSync(testFilePath, testCode);
    }
    const doc = await vscode.workspace.openTextDocument(testFilePath);
    await vscode.window.showTextDocument(doc);
}
