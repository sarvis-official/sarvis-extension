import * as vscode from 'vscode';
import { ChatViewProvider } from './providers/ChatViewProvider';
import { InlineCompletionProvider } from './providers/InlineCompletionProvider';
import { CodeActionFixProvider } from './providers/CodeActionProvider';
import { DiffManager } from './providers/DiffManager';
import { SmartSnippetProvider } from './providers/SmartSnippetProvider';
import { ErrorExplainerProvider } from './providers/ErrorExplainerProvider';
import { SaveReviewProvider } from './providers/SaveReviewProvider';
import { setApiKeyCommand } from './commands/setApiKey';
import { IndexService } from './services/IndexService';
import { LearningService } from './services/LearningService';
import { SessionMemoryService } from './services/SessionMemoryService';

// Command groups
import { registerGitCommands } from './commands/gitCommands';
import { registerReviewCommands } from './commands/reviewCommands';
import { registerAnalysisCommands } from './commands/analysisCommands';
import { registerCodeCommands } from './commands/codeCommands';
import { registerDebugCommands } from './commands/debugCommands';
import { registerProjectCommands } from './commands/projectCommands';
import { registerMemoryCommands } from './commands/memoryCommands';
import { registerLearningCommands } from './commands/learningCommands';
import { registerSnippetCommands } from './commands/snippetCommands';
import { registerVoiceCommands } from './commands/voiceCommands';
import { registerTemplateCommands } from './commands/templateCommands';
import { registerSaveReviewHandlers } from './commands/saveReviewCommands';
import { registerPairProgrammerCommand } from './commands/pairProgrammerCommand';
import { registerInterviewCommand } from './commands/interviewCommand';


export function activate(context: vscode.ExtensionContext): void {
    console.log('[Sarvis] Extension activated');

    // ─── Core services ─────────────────────────────────────────────────────────
    const sessionMemory = new SessionMemoryService(context);
    sessionMemory.load();

    const learningService = new LearningService(context);
    learningService.load();

    const indexService = new IndexService(context);
    const diffManager = new DiffManager(context);
    const chatProvider = new ChatViewProvider(context, sessionMemory);

    registerInterviewCommand(context);

    // ─── Register all command groups ───────────────────────────────────────────
    registerGitCommands(context, learningService, sessionMemory);
    registerReviewCommands(context);
    registerAnalysisCommands(context, learningService);
    registerCodeCommands(context, learningService, sessionMemory);
    registerDebugCommands(context, learningService, sessionMemory, diffManager);
    registerProjectCommands(context, learningService, sessionMemory, indexService);
    registerMemoryCommands(context, sessionMemory);
    registerLearningCommands(context, learningService);
    registerSnippetCommands(context, learningService, sessionMemory);
    registerVoiceCommands(context, sessionMemory, learningService);
    registerTemplateCommands(context, learningService);
    registerSaveReviewHandlers(context, sessionMemory, learningService);
    registerPairProgrammerCommand(context, learningService, sessionMemory);

    // ─── Providers ─────────────────────────────────────────────────────────────
    context.subscriptions.push(
        // Sidebar chat
        vscode.window.registerWebviewViewProvider('sarvis.sidebar', chatProvider, {
            webviewOptions: { retainContextWhenHidden: true }
        }),

        // Inline completions
        vscode.languages.registerInlineCompletionItemProvider(
            { pattern: '**' },
            new InlineCompletionProvider(context, learningService)
        ),

        // Code actions (quick fix lightbulb)
        vscode.languages.registerCodeActionsProvider({ pattern: '**' }, new CodeActionFixProvider()),

        // Error explainer hover
        vscode.languages.registerHoverProvider(
            [{ language: 'javascript' }, { language: 'typescript' }, { language: 'javascriptreact' }, { language: 'typescriptreact' }, { language: 'python' }, { language: 'java' }, { language: 'go' }, { language: 'css' }, { language: 'json' }],
            new ErrorExplainerProvider(context)
        ),

        // Smart snippets
        vscode.languages.registerCompletionItemProvider(
            [{ language: 'javascript' }, { language: 'typescript' }, { language: 'javascriptreact' }, { language: 'typescriptreact' }, { language: 'python' }, { language: 'java' }, { language: 'go' }],
            new SmartSnippetProvider(context, learningService, sessionMemory),
            ...('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''))
        ),

        // API key command
        vscode.commands.registerCommand('sarvis.setApiKey', () => setApiKeyCommand(context)),

        vscode.commands.registerCommand('sarvis.inlineAccepted', () => {
            vscode.window.setStatusBarMessage('⚡ Sarvis Suggestion Applied', 2000);
        }),
    );

    // ─── Auto-learning on save / file open ────────────────────────────────────
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument((doc) => {
            sessionMemory.captureFileSave(doc);
            learningService.analyzeAndLearn(doc.getText(), doc.languageId);
        }),
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor) learningService.analyzeAndLearn(editor.document.getText(), editor.document.languageId);
        })
    );

    // ─── Watermark on empty files ──────────────────────────────────────────────
    const watermarkDecoration = vscode.window.createTextEditorDecorationType({
        after: { contentText: '  ⚡ Generate with Sarvis (Ctrl+Shift+G)', color: '#6b7280', margin: '0 0 0 20px' }
    });
    const showWatermark = (editor: vscode.TextEditor | undefined) => {
        if (!editor || editor.document.getText().trim().length > 0) return;
        editor.setDecorations(watermarkDecoration, [new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0))]);
    };
    showWatermark(vscode.window.activeTextEditor);
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(showWatermark),
        vscode.workspace.onDidChangeTextDocument(({ document }) => {
            const editor = vscode.window.activeTextEditor;
            if (editor?.document === document && document.getText().trim().length > 0) {
                editor.setDecorations(watermarkDecoration, []);
            }
        })
    );

    // ─── Terminal status bar ───────────────────────────────────────────────────
    const terminalStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    terminalStatusBar.text = '⚡ Sarvis Terminal';
    terminalStatusBar.command = 'sarvis.generateTerminalCommand';
    terminalStatusBar.tooltip = 'Generate terminal command with Sarvis (Ctrl+Shift+T)';
    terminalStatusBar.show();
    context.subscriptions.push(terminalStatusBar);

    vscode.window.setStatusBarMessage('⚡ Ctrl+Shift+T → Generate Terminal Command', 8000);
}

export function deactivate(): void {
    console.log('[Sarvis] Extension deactivated');
}
