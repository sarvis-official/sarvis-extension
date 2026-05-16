import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function showDiagramPanel(mermaidCode: string, diagramTitle: string, context: vscode.ExtensionContext): void {
    const panel = vscode.window.createWebviewPanel(
        'sarvisDiagram',
        `Sarvis: ${diagramTitle}`,
        vscode.ViewColumn.Beside,
        { enableScripts: true }
    );

    const escapedCode = mermaidCode
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$/g, '\\$');

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: var(--vscode-font-family); background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); height: 100vh; display: flex; flex-direction: column; }
        .toolbar { padding: 10px 16px; border-bottom: 1px solid #444; display: flex; align-items: center; justify-content: space-between; gap: 10px; background: rgba(255,255,255,0.03); flex-shrink: 0; }
        .title { font-weight: bold; color: var(--vscode-textLink-foreground); font-size: 14px; }
        .toolbar-right { display: flex; gap: 8px; }
        button { padding: 5px 14px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; }
        .btn-copy { background: #555; color: white; }
        .btn-copy:hover { background: #444; }
        .btn-save { background: #007acc; color: white; }
        .btn-save:hover { background: #005f99; }
        .diagram-area { flex: 1; overflow: auto; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .mermaid { background: white; border-radius: 8px; padding: 24px; max-width: 100%; }
        .code-section { border-top: 1px solid #444; padding: 12px 16px; flex-shrink: 0; }
        .code-header { font-size: 12px; color: #888; margin-bottom: 6px; }
        pre { background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; font-size: 12px; overflow-x: auto; max-height: 150px; }
        code { font-family: monospace; color: #7cc5f4; }
        .zoom-controls { display: flex; gap: 4px; align-items: center; font-size: 12px; color: #888; }
        .zoom-btn { background: #333; color: white; padding: 3px 10px; border-radius: 3px; cursor: pointer; border: none; font-size: 13px; }
        .error-box { background: rgba(220,38,38,0.1); border: 1px solid #dc2626; border-radius: 6px; padding: 14px; margin: 20px; }
    </style>
</head>
<body>
    <div class="toolbar">
        <span class="title">🏗️ ${diagramTitle}</span>
        <div class="toolbar-right">
            <div class="zoom-controls">
                <button class="zoom-btn" onclick="zoom(-0.1)">−</button>
                <span id="zoom-level">100%</span>
                <button class="zoom-btn" onclick="zoom(0.1)">+</button>
                <button class="zoom-btn" onclick="resetZoom()">↺</button>
            </div>
            <button class="btn-copy" onclick="copyCode()">📋 Copy Mermaid</button>
            <button class="btn-save" onclick="saveSvg()">💾 Save SVG</button>
        </div>
    </div>
    <div class="diagram-area" id="diagramArea">
        <div class="mermaid" id="diagram">${mermaidCode}</div>
    </div>
    <div class="code-section">
        <div class="code-header">Mermaid Source</div>
        <pre><code>${mermaidCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
    </div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.6.1/mermaid.min.js"></script>
    <script>
        const vscode = acquireVsCodeApi();
        let currentZoom = 1;

        mermaid.initialize({
            startOnLoad: true,
            theme: 'dark',
            themeVariables: {
                primaryColor: '#1e3a5f', primaryTextColor: '#e2e8f0',
                primaryBorderColor: '#3b82f6', lineColor: '#64748b',
                secondaryColor: '#1e293b', tertiaryColor: '#0f172a',
                background: '#1e293b', mainBkg: '#1e3a5f',
                nodeBorder: '#3b82f6', clusterBkg: '#1e293b',
                titleColor: '#e2e8f0', edgeLabelBackground: '#1e293b',
            },
            securityLevel: 'loose', fontFamily: 'monospace'
        });

        setTimeout(async () => {
            try {
                const { svg } = await mermaid.render('mermaid-svg', \`${escapedCode}\`);
                document.getElementById('diagram').innerHTML = svg;
            } catch (err) {
                document.getElementById('diagram').innerHTML = \`
                    <div class="error-box">
                        <strong>⚠️ Diagram render error</strong><br/>
                        <small>\${err.message}</small><br/><br/>
                        Copy the Mermaid source and paste it into
                        <a href="https://mermaid.live" style="color:#7cc5f4">mermaid.live</a> to view it.
                    </div>\`;
            }
        }, 100);

        function zoom(delta) {
            currentZoom = Math.max(0.3, Math.min(3, currentZoom + delta));
            document.getElementById('diagram').style.transform = \`scale(\${currentZoom})\`;
            document.getElementById('diagram').style.transformOrigin = 'center top';
            document.getElementById('zoom-level').textContent = Math.round(currentZoom * 100) + '%';
        }
        function resetZoom() {
            currentZoom = 1;
            document.getElementById('diagram').style.transform = 'scale(1)';
            document.getElementById('zoom-level').textContent = '100%';
        }
        function copyCode() {
            navigator.clipboard.writeText(\`${escapedCode}\`).then(() => {
                const btn = document.querySelector('.btn-copy');
                btn.textContent = '✅ Copied!';
                setTimeout(() => btn.textContent = '📋 Copy Mermaid', 2000);
            });
        }
        function saveSvg() {
            const svg = document.getElementById('diagram').querySelector('svg');
            if (!svg) { alert('Diagram not rendered yet'); return; }
            vscode.postMessage({ command: 'saveSvg', content: svg.outerHTML });
        }
    </script>
</body>
</html>`;

    panel.webview.onDidReceiveMessage(async (msg) => {
        if (msg.command === 'saveSvg') {
            const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!ws) return;
            const svgPath = path.join(ws, 'architecture-diagram.svg');
            fs.writeFileSync(svgPath, msg.content);
            const doc = await vscode.workspace.openTextDocument(svgPath);
            await vscode.window.showTextDocument(doc);
            vscode.window.showInformationMessage('✅ Diagram saved as architecture-diagram.svg');
        }
    });
}