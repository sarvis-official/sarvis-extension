import * as vscode from 'vscode';
import { MigrationTemplate } from '../services/MigrationService';

export function showMigrationPreviewPanel(
    migration: MigrationTemplate,
    migratedCode: string,
    context: vscode.ExtensionContext,
    onDecision: (confirmed: boolean) => void
): void {
    const panel = vscode.window.createWebviewPanel(
        'sarvisMigration',
        `Migration: ${migration.from} → ${migration.to}`,
        vscode.ViewColumn.Two,
        { enableScripts: true }
    );

    const installHtml   = migration.installCommands?.map(cmd => `<div class="cmd-line"><code>${cmd}</code></div>`).join('') ?? '';
    const uninstallHtml = migration.uninstallCommands?.map(cmd => `<div class="cmd-line uninstall"><code>${cmd}</code></div>`).join('') ?? '';
    const codePreview   = migratedCode.slice(0, 800).replace(/</g, '&lt;').replace(/>/g, '&gt;');

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
    <style>
        * { box-sizing: border-box; }
        body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); line-height: 1.6; }
        h1 { color: var(--vscode-textLink-foreground); margin-bottom: 4px; }
        h2 { border-bottom: 1px solid #444; padding-bottom: 6px; margin-top: 24px; }
        .migration-arrow { display: flex; align-items: center; gap: 12px; margin: 16px 0; font-size: 16px; }
        .from-badge { background: rgba(220,38,38,0.15); border: 1px solid #dc2626; padding: 4px 14px; border-radius: 6px; font-weight: bold; color: #f87171; }
        .to-badge   { background: rgba(22,163,74,0.15);  border: 1px solid #16a34a; padding: 4px 14px; border-radius: 6px; font-weight: bold; color: #4ade80; }
        .arrow-icon { font-size: 20px; color: #888; }
        .info-box { background: rgba(0,120,200,0.08); border-left: 3px solid #007acc; padding: 10px 14px; border-radius: 4px; margin: 12px 0; font-size: 13px; }
        pre { background: rgba(0,0,0,0.2); padding: 14px; border-radius: 6px; overflow-x: auto; font-size: 12px; max-height: 300px; overflow-y: auto; }
        code { font-family: monospace; font-size: 13px; }
        .cmd-section { background: rgba(0,0,0,0.15); border: 1px solid #333; border-radius: 6px; padding: 12px 16px; margin: 8px 0; }
        .cmd-line { margin: 4px 0; }
        .cmd-line code { background: rgba(0,120,200,0.1); border: 1px solid #007acc; padding: 3px 8px; border-radius: 4px; color: #7cc5f4; }
        .cmd-line.uninstall code { background: rgba(220,38,38,0.1); border-color: #dc2626; color: #f87171; }
        .buttons { position: sticky; bottom: 0; background: var(--vscode-editor-background); padding: 16px 0; display: flex; gap: 10px; border-top: 1px solid #444; margin-top: 20px; }
        .btn { padding: 10px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold; }
        .btn-apply   { background: #007acc; color: white; }
        .btn-apply:hover { background: #005f99; }
        .btn-discard { background: #555; color: white; }
        .btn-discard:hover { background: #444; }
    </style>
</head>
<body>
    <h1>${migration.icon} Migration Preview</h1>
    <div class="migration-arrow">
        <span class="from-badge">❌ ${migration.from}</span>
        <span class="arrow-icon">→</span>
        <span class="to-badge">✅ ${migration.to}</span>
    </div>
    <div class="info-box">
        ${migration.description}
        ${migration.fileExtensionChange
            ? `<br/>📄 File will be renamed: <code>${migration.fileExtensionChange.from}</code> → <code>${migration.fileExtensionChange.to}</code>`
            : ''}
    </div>
    <h2>📄 Migrated Code Preview</h2>
    <pre><code>${codePreview}${migratedCode.length > 800 ? '\n\n... (truncated — full code will be applied)' : ''}</code></pre>
    ${installHtml ? `
    <h2>📦 Run After Applying</h2>
    <div class="cmd-section">${installHtml}</div>` : ''}
    ${uninstallHtml ? `
    <h2>🗑️ Remove Old Packages</h2>
    <div class="cmd-section">${uninstallHtml}</div>` : ''}
    <div class="buttons">
        <button class="btn btn-apply"   onclick="apply()">✅ Apply Migration</button>
        <button class="btn btn-discard" onclick="discard()">❌ Cancel</button>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        function apply()   { vscode.postMessage({ command: 'apply' }); }
        function discard() { vscode.postMessage({ command: 'discard' }); }
    </script>
</body>
</html>`;

    panel.webview.onDidReceiveMessage((msg) => {
        if (msg.command === 'apply')   { onDecision(true);  panel.dispose(); }
        if (msg.command === 'discard') { onDecision(false); panel.dispose(); }
    });
}