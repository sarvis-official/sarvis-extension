import * as vscode from 'vscode';
import { marked } from 'marked';
import { DiffManager } from '../providers/DiffManager';
import { extractConfidence, extractMultiFilePatches } from '../utils/patchUtils';

export function showDebugPanel(
    markdown: string,
    context: vscode.ExtensionContext,
    diffManager: DiffManager
): void {
    const confidence = extractConfidence(markdown);
    const patches = extractMultiFilePatches(markdown);
    const badgeColor = confidence >= 90 ? '#16a34a' : confidence >= 70 ? '#f59e0b' : '#dc2626';
    const htmlContent = marked.parse(markdown);

    const panel = vscode.window.createWebviewPanel(
        'sarvisDebug',
        'Sarvis Debug Assistant',
        vscode.ViewColumn.Beside,
        { enableScripts: true }
    );

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: var(--vscode-font-family); padding: 16px; background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); }
        .badge { display: inline-block; padding: 6px 12px; border-radius: 6px; background: ${badgeColor}; color: white; font-weight: bold; margin-bottom: 16px; }
        button { padding: 8px 12px; background: #007acc; border: none; color: white; border-radius: 4px; cursor: pointer; margin-right: 10px; }
        button:hover { background: #005f99; }
        pre { background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px; overflow-x: auto; }
        code { font-family: monospace; background: rgba(0,0,0,0.15); padding: 2px 4px; border-radius: 3px; }
        h2, h3 { color: var(--vscode-textLink-foreground); }
        ul, ol { padding-left: 20px; }
        li { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="badge">Confidence: ${confidence}%</div><br/>
    <button onclick="preview()">Preview Changes</button>
    <button onclick="apply()">Apply Now</button>
    <hr style="border-color:#333;margin:16px 0"/>
    ${htmlContent}
    <script>
        const vscode = acquireVsCodeApi();
        function preview() { vscode.postMessage({ command: 'preview' }); }
        function apply()   { vscode.postMessage({ command: 'apply' }); }
    </script>
</body>
</html>`;

    panel.webview.onDidReceiveMessage(async (message) => {
        if (!patches.length) {
            vscode.window.showErrorMessage('No valid patch found in the response.');
            return;
        }
        if (message.command === 'preview') {
            await diffManager.previewPatches(patches);
        }
        if (message.command === 'apply') {
            if (confidence >= 90) {
                await diffManager.applyPatches(patches);
                vscode.window.showInformationMessage('Sarvis auto-applied high confidence patch.');
            } else {
                const confirm = await vscode.window.showWarningMessage(
                    `Confidence is ${confidence}%. Apply anyway?`,
                    { modal: true }, 'Apply'
                );
                if (confirm === 'Apply') await diffManager.applyPatches(patches);
            }
        }
    });
}