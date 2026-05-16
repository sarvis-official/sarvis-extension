import * as vscode from 'vscode';
import { marked } from 'marked';

export function showReviewPanel(title: string, markdown: string): void {
    const panel = vscode.window.createWebviewPanel(
        'sarvisReview',
        `Sarvis: ${title}`,
        vscode.ViewColumn.Beside,
        { enableScripts: false }
    );

    const htmlContent = marked.parse(markdown);

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); line-height: 1.6; max-width: 900px; }
        h1 { color: var(--vscode-textLink-foreground); }
        h2 { border-bottom: 1px solid #444; padding-bottom: 8px; margin-top: 24px; }
        h2:first-child { margin-top: 0; }
        pre { background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px; overflow-x: auto; }
        code { font-family: monospace; background: rgba(0,0,0,0.15); padding: 2px 4px; border-radius: 3px; }
        ul { padding-left: 20px; }
        li { margin: 6px 0; }
        hr { border-color: #444; margin: 20px 0; }
        strong { color: var(--vscode-textLink-foreground); }
    </style>
</head>
<body>
    <h1>${title}</h1>
    <hr/>
    ${htmlContent}
</body>
</html>`;
}