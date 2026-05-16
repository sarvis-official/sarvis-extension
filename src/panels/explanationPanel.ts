import * as vscode from 'vscode';
import { marked } from 'marked';

export function showExplanationPanel(explanation: string): void {
    const panel = vscode.window.createWebviewPanel(
        'sarvisExplain',
        'Sarvis Code Explanation',
        vscode.ViewColumn.Beside,
        { enableScripts: false }
    );

    const htmlContent = marked.parse(explanation);

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: var(--vscode-font-family); padding: 16px; color: var(--vscode-editor-foreground); background-color: var(--vscode-editor-background); }
        pre { background: rgba(0,0,0,0.1); padding: 10px; border-radius: 6px; overflow-x: auto; }
        code { font-family: monospace; }
    </style>
</head>
<body>
    <h2>⚡ Sarvis Explanation</h2>
    ${htmlContent}
</body>
</html>`;
}