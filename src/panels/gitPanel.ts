import * as vscode from 'vscode';
import { marked } from 'marked';

export function showGitPanel(title: string, markdown: string, context: vscode.ExtensionContext): void {
    const panel = vscode.window.createWebviewPanel(
        'sarvisGit',
        `Sarvis: ${title}`,
        vscode.ViewColumn.Beside,
        { enableScripts: false }
    );

    const htmlContent = marked.parse(markdown);

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); line-height: 1.6; }
        h2 { color: var(--vscode-textLink-foreground); border-bottom: 1px solid #333; padding-bottom: 8px; }
        h3 { color: var(--vscode-textLink-foreground); margin-top: 20px; }
        pre { background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px; overflow-x: auto; }
        code { font-family: monospace; background: rgba(0,0,0,0.15); padding: 2px 4px; border-radius: 3px; }
        ul { padding-left: 20px; }
        li { margin: 6px 0; }
        hr { border-color: #333; margin: 16px 0; }
    </style>
</head>
<body>
    <h2>${title}</h2>
    ${htmlContent}
</body>
</html>`;
}