import * as vscode from 'vscode';
import { AiService } from '../services/AiService';
import { LearningService } from '../services/LearningService';
import { SessionMemoryService } from '../services/SessionMemoryService';
import { handleError } from '../utils/errorHandler';
import { requireApiKey } from './requireApiKey';

export function registerSnippetCommands(
    context: vscode.ExtensionContext,
    learningService: LearningService,
    sessionMemory: SessionMemoryService
): void {

    context.subscriptions.push(

        // ─── Triggered by SmartSnippetProvider (completion item selected) ──────
        vscode.commands.registerCommand('sarvis.generateSmartSnippet',
            async (trigger: string, document: vscode.TextDocument, position: vscode.Position) => {
                try {
                    const editor = vscode.window.activeTextEditor;
                    if (!editor) return;

                    const apiKey = await requireApiKey(context);
                    if (!apiKey) return;

                    const language = document.languageId;
                    const description = getSnippetDescription(trigger, context);
                    const fileContext = document.getText().slice(0, 3000);

                    const statusMsg = vscode.window.setStatusBarMessage(`⚡ Sarvis generating ${trigger} snippet...`);

                    const snippet = await AiService.generateSmartSnippet(
                        apiKey, trigger, description, language, fileContext,
                        learningService.buildContextPrompt(),
                        sessionMemory.buildContextPrompt()
                    );

                    statusMsg.dispose();

                    if (!snippet) {
                        vscode.window.setStatusBarMessage('⚡ Sarvis: Could not generate snippet', 3000);
                        return;
                    }

                    // Replace the trigger word in the current line with the snippet
                    const currentLine = editor.document.lineAt(position.line).text;
                    const triggerStart = currentLine.lastIndexOf(trigger);

                    if (triggerStart >= 0) {
                        const replaceRange = new vscode.Range(
                            new vscode.Position(position.line, triggerStart),
                            position
                        );
                        const edit = new vscode.WorkspaceEdit();
                        edit.replace(document.uri, replaceRange, snippet);
                        await vscode.workspace.applyEdit(edit);
                    } else {
                        await editor.edit(editBuilder => editBuilder.insert(position, snippet));
                    }

                    vscode.window.setStatusBarMessage(`⚡ Sarvis: ${trigger} snippet inserted`, 3000);
                    learningService.analyzeAndLearn(snippet, language);
                } catch (err) { handleError(err, 'generateSmartSnippet'); }
            }
        ),

        // ─── Manual trigger via command palette ────────────────────────────────
        vscode.commands.registerCommand('sarvis.insertSmartSnippet', async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) { vscode.window.showWarningMessage('Open a file first.'); return; }

                const apiKey = await requireApiKey(context);
                if (!apiKey) return;

                const triggers = getSnippetTriggers(context);
                const triggerItems = Object.entries(triggers).map(([trigger, desc]) => ({
                    label: `⚡ ${trigger}`,
                    description: desc,
                    value: trigger
                }));

                const selected = await vscode.window.showQuickPick(triggerItems, {
                    placeHolder: 'Select a smart snippet to generate',
                    matchOnDescription: true
                });
                if (!selected) return;

                const language = editor.document.languageId;
                const fileContext = editor.document.getText().slice(0, 3000);
                let snippet: string | null = null;

                await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: `Sarvis generating ${selected.value} snippet...`,
                        cancellable: false
                    },
                    async () => {
                        snippet = await AiService.generateSmartSnippet(
                            apiKey, selected.value, selected.description ?? '',
                            language, fileContext,
                            learningService.buildContextPrompt(),
                            sessionMemory.buildContextPrompt()
                        );
                    }
                );

                if (!snippet) { vscode.window.showErrorMessage('Could not generate snippet. Try again.'); return; }

                await editor.edit(editBuilder => editBuilder.insert(editor.selection.active, snippet!));
                vscode.window.setStatusBarMessage(`⚡ Sarvis: ${selected.value} snippet inserted`, 3000);
                learningService.analyzeAndLearn(snippet, language);
            } catch (err) { handleError(err, 'insertSmartSnippet'); }
        }),

        // ─── Add custom snippet trigger ────────────────────────────────────────
        vscode.commands.registerCommand('sarvis.addSnippetTrigger', async () => {
            const trigger = await vscode.window.showInputBox({
                prompt: 'Enter trigger word (what you type to activate this snippet)',
                placeHolder: 'e.g. myApiCall, useMyAuth, myDbQuery',
                ignoreFocusOut: true
            });
            if (!trigger?.trim()) return;

            const description = await vscode.window.showInputBox({
                prompt: 'Describe what this snippet should generate',
                placeHolder: 'e.g. Generate my company\'s standard API call pattern',
                ignoreFocusOut: true
            });
            if (!description?.trim()) return;

            const config = vscode.workspace.getConfiguration('sarvis');
            const customTriggers = config.get<Record<string, string>>('customSnippetTriggers', {});
            customTriggers[trigger.trim()] = description.trim();
            await config.update('customSnippetTriggers', customTriggers, vscode.ConfigurationTarget.Workspace);

            vscode.window.showInformationMessage(
                `⚡ Snippet trigger "${trigger}" added! Type it in any file to activate.`
            );
        })
    );
}

export function getSnippetDescription(trigger: string, context?: vscode.ExtensionContext): string {
    const builtIn: Record<string, string> = {
        'useAuth': 'Generate an authentication hook/function using the project\'s auth pattern',
        'authMiddleware': 'Generate authentication middleware for this project',
        'jwtVerify': 'Generate JWT verification logic',
        'apiCall': 'Generate an API call function using the project\'s fetch/axios pattern',
        'apiGet': 'Generate a GET API request function',
        'apiPost': 'Generate a POST API request function',
        'useApi': 'Generate a custom hook for API calls with loading and error states',
        'reactComp': 'Generate a React functional component with the project\'s style',
        'useStore': 'Generate a state management hook using the project\'s store pattern',
        'useForm': 'Generate a form handler with validation',
        'tryCatch': 'Generate a try/catch block with proper error handling for this project',
        'errorHandler': 'Generate an error handler following the project\'s error pattern',
        'dbQuery': 'Generate a database query following the project\'s ORM pattern',
        'dbModel': 'Generate a database model for this project',
        'findById': 'Generate a findById database function',
        'testCase': 'Generate a test case using the project\'s testing pattern',
        'mockApi': 'Generate an API mock for testing',
        'logger': 'Generate a logger utility matching the project\'s logging style',
        'validator': 'Generate input validation following the project\'s validation pattern',
        'paginate': 'Generate pagination logic for this project',
        'cacheFunc': 'Generate a caching wrapper function',
        'debounce': 'Generate a debounce function',
        'throttle': 'Generate a throttle function',
        'formatDate': 'Generate a date formatting utility',
        'envConfig': 'Generate environment configuration setup',
    };

    const config = vscode.workspace.getConfiguration('sarvis');
    const customTriggers = config.get<Record<string, string>>('customSnippetTriggers', {});
    return builtIn[trigger] ?? customTriggers[trigger] ?? `Generate ${trigger} code snippet`;
}

export function getSnippetTriggers(context?: vscode.ExtensionContext): Record<string, string> {
    const builtIn: Record<string, string> = {
        'useAuth': 'Auth hook/function using your project pattern',
        'authMiddleware': 'Auth middleware for your framework',
        'jwtVerify': 'JWT verification logic',
        'apiCall': 'API call using your fetch/axios pattern',
        'apiGet': 'GET request function',
        'apiPost': 'POST request function',
        'useApi': 'Custom hook for API calls',
        'reactComp': 'React functional component',
        'useStore': 'State management hook',
        'useForm': 'Form handler with validation',
        'tryCatch': 'Try/catch with your error pattern',
        'errorHandler': 'Error handler function',
        'dbQuery': 'Database query with your ORM',
        'dbModel': 'Database model',
        'findById': 'FindById database function',
        'testCase': 'Test case with your framework',
        'mockApi': 'API mock for testing',
        'logger': 'Logger utility',
        'validator': 'Input validator',
        'paginate': 'Pagination logic',
        'cacheFunc': 'Caching wrapper',
        'debounce': 'Debounce function',
        'throttle': 'Throttle function',
        'formatDate': 'Date formatting utility',
        'envConfig': 'Environment config setup',
    };

    const config = vscode.workspace.getConfiguration('sarvis');
    const custom = config.get<Record<string, string>>('customSnippetTriggers', {});
    return { ...builtIn, ...custom };
}