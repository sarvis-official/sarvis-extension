import * as vscode from 'vscode';
import * as path from 'path';
import { LearningService } from '../services/LearningService';
import { handleError } from '../utils/errorHandler';

export function registerLearningCommands(
    context: vscode.ExtensionContext,
    learningService: LearningService
): void {

    context.subscriptions.push(

        vscode.commands.registerCommand('sarvis.viewProfile', async () => {
            const profile = learningService.currentProfile;
            const topPatterns = [...profile.patterns]
                .sort((a, b) => b.frequency - a.frequency)
                .slice(0, 10);

            const panel = vscode.window.createWebviewPanel(
                'sarvisProfile',
                'Sarvis: My Coding Profile',
                vscode.ViewColumn.Beside,
                { enableScripts: false }
            );

            const style = profile.stylePreferences;
            const naming = profile.namingConventions;

            panel.webview.html = `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); line-height: 1.6; }
        h1 { color: var(--vscode-textLink-foreground); }
        h2 { border-bottom: 1px solid #444; padding-bottom: 6px; margin-top: 24px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        td, th { padding: 8px 12px; border: 1px solid #444; text-align: left; }
        th { background: rgba(255,255,255,0.05); }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; background: #007acc; color: white; font-size: 12px; margin: 2px; }
        .freq { color: #888; font-size: 12px; }
    </style>
</head>
<body>
    <h1>🧠 My Coding Profile</h1>
    <p>Last updated: ${new Date(profile.lastUpdated).toLocaleString()}</p>

    <h2>🎨 Style Preferences</h2>
    <table>
        <tr><th>Setting</th><th>Detected Value</th></tr>
        <tr><td>Indentation</td><td>${style.indentation} (${style.indentSize} spaces)</td></tr>
        <tr><td>Quotes</td><td>${style.quotes}</td></tr>
        <tr><td>Semicolons</td><td>${style.semicolons ? 'Yes' : 'No'}</td></tr>
        <tr><td>Variable naming</td><td>${naming.variables}</td></tr>
        <tr><td>Function naming</td><td>${naming.functions}</td></tr>
        <tr><td>Class naming</td><td>${naming.classes}</td></tr>
    </table>

    <h2>💻 Preferred Languages</h2>
    ${profile.preferredLanguages.map((l: string) => `<span class="badge">${l}</span>`).join(' ')}

    <h2>🔁 Top Patterns Detected</h2>
    <table>
        <tr><th>Pattern</th><th>Type</th><th>Language</th><th>Frequency</th></tr>
        ${topPatterns.map((p: any) => `
        <tr>
            <td>${p.description}</td>
            <td>${p.type}</td>
            <td>${p.language}</td>
            <td><span class="freq">used ${p.frequency}x</span></td>
        </tr>`).join('')}
    </table>

    ${profile.architectureNotes.length > 0 ? `
    <h2>🏗️ Architecture Notes</h2>
    <ul>${profile.architectureNotes.map((n: string) => `<li>${n}</li>`).join('')}</ul>
    ` : ''}
</body>
</html>`;
        }),

        vscode.commands.registerCommand('sarvis.learnFromFile', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) { vscode.window.showWarningMessage('Open a file to learn from.'); return; }
            learningService.analyzeAndLearn(editor.document.getText(), editor.document.languageId);
            vscode.window.showInformationMessage(
                `🧠 Sarvis learned from ${path.basename(editor.document.fileName)}. ${learningService.currentProfile.patterns.length} patterns detected.`
            );
        }),

        vscode.commands.registerCommand('sarvis.addArchitectureNote', async () => {
            const note = await vscode.window.showInputBox({
                prompt: 'Add an architecture preference for Sarvis to remember',
                placeHolder: 'e.g. Always use repository pattern for data access',
                ignoreFocusOut: true
            });
            if (!note?.trim()) return;
            learningService.addArchitectureNote(note.trim());
            vscode.window.showInformationMessage('🧠 Sarvis noted your architecture preference!');
        }),

        vscode.commands.registerCommand('sarvis.resetProfile', async () => {
            const confirm = await vscode.window.showWarningMessage(
                'Reset Sarvis learning profile? All learned patterns will be lost.',
                { modal: true },
                'Reset'
            );
            if (confirm === 'Reset') {
                learningService.resetProfile();
                vscode.window.showInformationMessage('🧠 Sarvis profile reset.');
            }
        })
    );
}