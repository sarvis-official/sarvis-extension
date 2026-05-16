import * as vscode from 'vscode';
import { marked } from 'marked';
import { DiffManager } from '../providers/DiffManager';
import { extractMultiFilePatches, extractConfidence } from '../utils/patchUtils';
import { RootCauseContext } from '../services/RootCauseService';

export function showRootCausePanel(
    markdown: string,
    rootContext: RootCauseContext,
    context: vscode.ExtensionContext,
    diffManager: DiffManager
): void {
    const panel = vscode.window.createWebviewPanel(
        'sarvisRootCause',
        'Sarvis: Root Cause Analysis',
        vscode.ViewColumn.Beside,
        { enableScripts: true }
    );

    const htmlContent = marked.parse(markdown);
    const patches = extractMultiFilePatches(markdown);
    const confidence = extractConfidence(markdown);
    const badgeColor = confidence >= 90 ? '#16a34a' : confidence >= 70 ? '#f59e0b' : '#dc2626';

    const filesHtml = rootContext.relatedFiles
        .map(f => `<span class="file-badge">📄 ${f.path}</span>`)
        .join('');

    const locationHtml = rootContext.errorLocation
        ? `<span class="location-badge">📍 ${rootContext.errorLocation.file}:${rootContext.errorLocation.line}</span>`
        : '';

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); line-height: 1.6; max-width: 960px; }
        h1 { color: var(--vscode-textLink-foreground); margin-bottom: 8px; }
        h2 { border-bottom: 1px solid #444; padding-bottom: 6px; margin-top: 28px; }
        pre { background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px; overflow-x: auto; }
        code { font-family: monospace; background: rgba(0,0,0,0.15); padding: 2px 4px; border-radius: 3px; }
        ul, ol { padding-left: 20px; }
        li { margin: 6px 0; }
        .meta { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 20px; }
        .file-badge { background: rgba(0,120,200,0.15); border: 1px solid #007acc; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-family: monospace; }
        .location-badge { background: rgba(220,80,80,0.15); border: 1px solid #dc5050; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-family: monospace; color: #ff8080; }
        .buttons { display: flex; gap: 10px; margin: 20px 0; flex-wrap: wrap; }
        button { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold; }
        .btn-preview { background: #555; color: white; }
        .btn-apply   { background: #007acc; color: white; }
        .btn-preview:hover { background: #444; }
        .btn-apply:hover   { background: #005f99; }
        hr { border-color: #444; margin: 20px 0; }
        strong { color: var(--vscode-textLink-foreground); }
    </style>
</head>
<body>
    <h1>🔍 Root Cause Analysis</h1>
    <div class="meta">
        ${locationHtml}
        ${filesHtml}
    </div>
    ${patches.length > 0 ? `
    <div class="buttons">
        <button class="btn-preview" onclick="preview()">👁 Preview Fix</button>
        <button class="btn-apply"   onclick="apply()">⚡ Apply Fix</button>
    </div>` : ''}
    <hr/>
    ${htmlContent}
    <script>
        const vscode = acquireVsCodeApi();
        function preview() { vscode.postMessage({ command: 'preview' }); }
        function apply()   { vscode.postMessage({ command: 'apply' }); }
    </script>
</body>
</html>`;

    panel.webview.onDidReceiveMessage(async (msg) => {
        if (msg.command === 'preview' && patches.length > 0) await diffManager.previewPatches(patches);
        if (msg.command === 'apply'   && patches.length > 0) {
            await diffManager.applyPatches(patches);
            vscode.window.showInformationMessage('⚡ Sarvis applied the fix.');
        }
    });
}