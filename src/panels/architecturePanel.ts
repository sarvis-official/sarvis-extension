import * as vscode from 'vscode';
import { ArchitecturePlan } from '../services/ArchitectureService';

export function showArchitecturePreviewPanel(
    plan: ArchitecturePlan,
    context: vscode.ExtensionContext,
    onDecision: (confirmed: boolean) => void
): void {
    const panel = vscode.window.createWebviewPanel(
        'sarvisArchitecture',
        `Sarvis: ${plan.name}`,
        vscode.ViewColumn.Beside,
        { enableScripts: true }
    );

    const extIcons: Record<string, string> = {
        ts: '📘', js: '📜', json: '📋', java: '☕', py: '🐍',
        go: '🐹', yaml: '⚙️', yml: '⚙️', xml: '📄', md: '📝',
        css: '🎨', html: '🌐', sh: '💻', sql: '🗄️', dockerfile: '🐳',
        prisma: '🔷', rs: '🦀', cs: '🔵', tsx: '⚛️', jsx: '⚛️'
    };

    const filesHtml = plan.files.map(f => {
        const ext = f.path.split('.').pop() ?? '';
        const icon = extIcons[ext.toLowerCase()] ?? '📄';
        const preview = f.content.slice(0, 400)
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        return `
        <div class="file-card">
            <div class="file-header">
                <span class="file-icon">${icon}</span>
                <span class="file-path">${f.path}</span>
                <span class="file-desc">${f.description}</span>
            </div>
            <pre><code>${preview}${f.content.length > 400 ? '\n...' : ''}</code></pre>
        </div>`;
    }).join('');

    const nextStepsHtml = plan.nextSteps
        .map((s, i) => `<li><span class="step-num">${i + 1}</span> ${s}</li>`)
        .join('');

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
    <style>
        * { box-sizing: border-box; }
        body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); line-height: 1.6; }
        h1 { color: var(--vscode-textLink-foreground); margin-bottom: 4px; }
        h2 { border-bottom: 1px solid #444; padding-bottom: 6px; margin-top: 28px; }
        .desc { color: #aaa; margin-bottom: 20px; }
        .summary-box { background: rgba(0,120,200,0.1); border-left: 3px solid #007acc; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px; }
        .count { color: #888; font-size: 13px; }
        .file-card { border: 1px solid #333; border-radius: 6px; margin: 10px 0; overflow: hidden; }
        .file-header { padding: 8px 14px; background: rgba(255,255,255,0.04); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .file-icon { font-size: 16px; }
        .file-path { font-family: monospace; font-size: 13px; font-weight: bold; flex: 1; }
        .file-desc { color: #888; font-size: 12px; }
        pre { margin: 0; padding: 12px; background: rgba(0,0,0,0.2); font-size: 12px; overflow-x: auto; max-height: 150px; overflow-y: auto; }
        code { font-family: monospace; }
        .next-steps { list-style: none; padding: 0; }
        .next-steps li { display: flex; align-items: flex-start; gap: 10px; margin: 8px 0; }
        .step-num { background: #007acc; color: white; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; flex-shrink: 0; }
        .buttons { position: sticky; bottom: 0; background: var(--vscode-editor-background); padding: 16px 0; display: flex; gap: 10px; border-top: 1px solid #444; margin-top: 24px; }
        .btn { padding: 10px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold; }
        .btn-apply   { background: #007acc; color: white; }
        .btn-apply:hover { background: #005f99; }
        .btn-discard { background: #555; color: white; }
        .btn-discard:hover { background: #444; }
    </style>
</head>
<body>
    <h1>🏗️ ${plan.name}</h1>
    <p class="desc">${plan.description}</p>
    <div class="summary-box">
        <strong>📁 Structure:</strong> ${plan.structure}<br/>
        <span class="count">${plan.files.length} files will be created</span>
    </div>
    <h2>📄 Files to Create</h2>
    ${filesHtml}
    <h2>🚀 Next Steps</h2>
    <ul class="next-steps">${nextStepsHtml}</ul>
    <div class="buttons">
        <button class="btn btn-apply"   onclick="apply()">✅ Scaffold Project</button>
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