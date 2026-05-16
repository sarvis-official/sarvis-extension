import * as vscode from 'vscode';
import { RefactorPlan } from '../services/RefactorService';

export function showRefactorPreviewPanel(
    plan: RefactorPlan,
    context: vscode.ExtensionContext,
    onDecision: (confirmed: boolean) => void
): void {
    const panel = vscode.window.createWebviewPanel(
        'sarvisRefactor',
        'Sarvis: Refactor Plan',
        vscode.ViewColumn.Beside,
        { enableScripts: true }
    );

    const actionColors: Record<string, string> = {
        modify: '#1a6b9a',
        create: '#1a7a3a',
        delete: '#8b0000',
        rename: '#7a5c00'
    };

    const filesHtml = plan.files.map(f => {
        const color = actionColors[f.action] ?? '#555';
        const preview = f.action !== 'delete' && f.newContent
            ? `<pre><code>${f.newContent.slice(0, 500).replace(/</g, '&lt;').replace(/>/g, '&gt;')}${f.newContent.length > 500 ? '\n... (truncated)' : ''}</code></pre>`
            : '';
        return `
        <div class="file-card">
            <div class="file-header">
                <span class="action-badge" style="background:${color};color:white">${f.action.toUpperCase()}</span>
                <span class="file-path">${f.filePath}</span>
                ${f.newPath ? `<span class="arrow">→ ${f.newPath}</span>` : ''}
            </div>
            ${preview}
        </div>`;
    }).join('');

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
    <style>
        * { box-sizing: border-box; }
        body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); }
        h1 { color: var(--vscode-textLink-foreground); }
        .summary { background: rgba(0,120,200,0.1); border-left: 3px solid #007acc; padding: 12px; margin: 16px 0; border-radius: 4px; }
        .count { color: #888; font-size: 13px; }
        .file-card { border: 1px solid #444; border-radius: 6px; margin: 12px 0; overflow: hidden; }
        .file-header { padding: 10px 14px; background: rgba(255,255,255,0.04); display: flex; align-items: center; gap: 10px; }
        .file-path { font-family: monospace; font-size: 13px; flex: 1; }
        .arrow { color: #888; font-size: 12px; }
        .action-badge { padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: bold; }
        .reason { padding: 6px 14px; font-size: 12px; color: #888; background: rgba(0,0,0,0.1); border-bottom: 1px solid #333; }
        pre { margin: 0; padding: 12px; background: rgba(0,0,0,0.2); font-size: 12px; overflow-x: auto; max-height: 200px; overflow-y: auto; }
        code { font-family: monospace; }
        .buttons { position: sticky; bottom: 0; background: var(--vscode-editor-background); padding: 16px 0; display: flex; gap: 10px; border-top: 1px solid #444; margin-top: 20px; }
        .btn { padding: 10px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold; }
        .btn-apply   { background: #007acc; color: white; }
        .btn-apply:hover { background: #005f99; }
        .btn-discard { background: #555; color: white; }
        .btn-discard:hover { background: #444; }
    </style>
</head>
<body>
    <h1>⚡ Refactor Plan</h1>
    <div class="summary">
        <strong>📋 ${plan.description}</strong><br/>
        <span class="count">${plan.files.length} file(s) will be changed</span>
    </div>
    <p style="color:#aaa;margin-bottom:16px">${plan.summary}</p>
    ${filesHtml}
    <div class="buttons">
        <button class="btn btn-apply"   onclick="apply()">✅ Apply All Changes</button>
        <button class="btn btn-discard" onclick="discard()">❌ Discard</button>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        function apply()   { vscode.postMessage({ command: 'apply' }); }
        function discard() { vscode.postMessage({ command: 'discard' }); }
    </script>
</body>
</html>`;

    panel.webview.onDidReceiveMessage((msg) => {
        if (msg.command === 'apply') { onDecision(true); panel.dispose(); }
        if (msg.command === 'discard') { onDecision(false); panel.dispose(); }
    });
}