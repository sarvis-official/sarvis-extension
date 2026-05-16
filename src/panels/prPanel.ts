import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function showPRPanel(
    pr: Record<string, unknown>,
    branch: string,
    diff: string,
    context: vscode.ExtensionContext
): void {
    const panel = vscode.window.createWebviewPanel(
        'sarvisPR',
        'Sarvis: Pull Request',
        vscode.ViewColumn.Beside,
        { enableScripts: true }
    );

    const typeColors: Record<string, string> = {
        feature: '#16a34a', bugfix: '#dc2626', hotfix: '#dc2626',
        refactor: '#7c3aed', docs: '#0891b2', test: '#d97706', chore: '#6b7280'
    };
    const typeColor = typeColors[pr.type as string] ?? '#007acc';

    const changesHtml = (pr.changes as string[] ?? []).map(c => `<li>${c}</li>`).join('');
    const testingHtml = (pr.testing as string[] ?? []).map((t, i) => `<li><span class="step-num">${i + 1}</span> ${t}</li>`).join('');
    const checklistHtml = (pr.checklist as string[] ?? []).map(c => `<label class="check-item"><input type="checkbox"> ${c}</label>`).join('');

    const markdown = `## ${pr.title}

### Type
${pr.type}

### Description
${pr.description}

### Changes
${(pr.changes as string[] ?? []).map((c: string) => `- ${c}`).join('\n')}

### Testing Instructions
${(pr.testing as string[] ?? []).map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}

### Screenshots
${pr.screenshots}

### Breaking Changes
${pr.breakingChanges}

### Related Issues
${pr.relatedIssues}

### Checklist
${(pr.checklist as string[] ?? []).map((c: string) => `- [ ] ${c}`).join('\n')}`;

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
    <style>
        * { box-sizing: border-box; }
        body { font-family: var(--vscode-font-family); padding: 0; color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); line-height: 1.6; }
        .header { padding: 20px 24px; border-bottom: 1px solid #444; background: rgba(255,255,255,0.02); }
        .pr-title { font-size: 20px; font-weight: bold; color: var(--vscode-textLink-foreground); margin-bottom: 10px; word-break: break-word; }
        .meta { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        .type-badge   { padding: 3px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; background: ${typeColor}20; border: 1px solid ${typeColor}; color: ${typeColor}; }
        .branch-badge { padding: 3px 12px; border-radius: 12px; font-size: 12px; background: rgba(255,255,255,0.06); border: 1px solid #555; font-family: monospace; }
        .content { padding: 20px 24px; }
        .section { margin-bottom: 24px; }
        .section-title { font-size: 13px; font-weight: bold; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
        .description { font-size: 14px; color: #ccc; line-height: 1.7; background: rgba(255,255,255,0.03); padding: 14px; border-radius: 6px; border-left: 3px solid #007acc; }
        .changes-list { list-style: none; padding: 0; }
        .changes-list li { padding: 6px 0; border-bottom: 1px solid #2a2a2a; font-size: 13px; display: flex; gap: 8px; }
        .changes-list li::before { content: "→"; color: #007acc; font-weight: bold; }
        .testing-list { list-style: none; padding: 0; }
        .testing-list li { padding: 8px 0; border-bottom: 1px solid #2a2a2a; font-size: 13px; display: flex; gap: 10px; align-items: flex-start; }
        .step-num { background: #007acc; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; flex-shrink: 0; margin-top: 2px; }
        .checklist { display: flex; flex-direction: column; gap: 8px; }
        .check-item { display: flex; align-items: center; gap: 10px; font-size: 13px; cursor: pointer; padding: 6px; border-radius: 4px; }
        .check-item:hover { background: rgba(255,255,255,0.04); }
        .check-item input { width: 16px; height: 16px; cursor: pointer; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .info-card { background: rgba(255,255,255,0.03); border: 1px solid #333; border-radius: 6px; padding: 12px; }
        .info-label { font-size: 11px; color: #888; margin-bottom: 4px; }
        .info-value { font-size: 13px; }
        .breaking { color: #dc2626; }
        .toolbar { position: sticky; bottom: 0; background: var(--vscode-editor-background); border-top: 1px solid #444; padding: 14px 24px; display: flex; gap: 10px; flex-wrap: wrap; }
        button { padding: 8px 18px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold; }
        .btn-copy-title  { background: #333; color: white; }
        .btn-copy-md     { background: #555; color: white; }
        .btn-save        { background: #007acc; color: white; }
        .btn-github      { background: #238636; color: white; }
    </style>
</head>
<body>
    <div class="header">
        <div class="pr-title">🔀 ${pr.title}</div>
        <div class="meta">
            <span class="type-badge">${pr.type}</span>
            <span class="branch-badge">🌿 ${branch}</span>
        </div>
    </div>
    <div class="content">
        <div class="section">
            <div class="section-title">📝 Description</div>
            <div class="description">${pr.description}</div>
        </div>
        <div class="section">
            <div class="section-title">📋 Changes (${(pr.changes as string[]).length})</div>
            <ul class="changes-list">${changesHtml}</ul>
        </div>
        <div class="section">
            <div class="section-title">🧪 Testing Instructions</div>
            <ul class="testing-list">${testingHtml}</ul>
        </div>
        <div class="section">
            <div class="section-title">ℹ️ Additional Info</div>
            <div class="info-grid">
                <div class="info-card"><div class="info-label">📸 Screenshots</div><div class="info-value">${pr.screenshots}</div></div>
                <div class="info-card"><div class="info-label">🔗 Related Issues</div><div class="info-value">${pr.relatedIssues}</div></div>
                <div class="info-card" style="grid-column:span 2">
                    <div class="info-label">⚠️ Breaking Changes</div>
                    <div class="info-value ${pr.breakingChanges !== 'None' ? 'breaking' : ''}">${pr.breakingChanges}</div>
                </div>
            </div>
        </div>
        <div class="section">
            <div class="section-title">✅ PR Checklist</div>
            <div class="checklist">${checklistHtml}</div>
        </div>
    </div>
    <div class="toolbar">
        <button class="btn-copy-title" onclick="copyTitle()">📋 Copy Title</button>
        <button class="btn-copy-md"    onclick="copyMarkdown()">📄 Copy as Markdown</button>
        <button class="btn-save"       onclick="saveToFile()">💾 Save PR.md</button>
        <button class="btn-github"     onclick="openGitHub()">🐙 Open GitHub</button>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        const markdown = ${JSON.stringify(markdown)};
        const title    = ${JSON.stringify(pr.title)};
        function copyTitle() {
            navigator.clipboard.writeText(title).then(() => {
                const btn = document.querySelector('.btn-copy-title');
                btn.textContent = '✅ Copied!';
                setTimeout(() => btn.textContent = '📋 Copy Title', 2000);
            });
        }
        function copyMarkdown() {
            navigator.clipboard.writeText(markdown).then(() => {
                const btn = document.querySelector('.btn-copy-md');
                btn.textContent = '✅ Copied!';
                setTimeout(() => btn.textContent = '📄 Copy as Markdown', 2000);
            });
        }
        function saveToFile() { vscode.postMessage({ command: 'saveFile', content: markdown }); }
        function openGitHub() { vscode.postMessage({ command: 'openGitHub' }); }
    </script>
</body>
</html>`;

    panel.webview.onDidReceiveMessage(async (msg) => {
        if (msg.command === 'saveFile') {
            const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!ws) return;
            const prPath = path.join(ws, 'PR.md');
            fs.writeFileSync(prPath, msg.content);
            const doc = await vscode.workspace.openTextDocument(prPath);
            await vscode.window.showTextDocument(doc);
            vscode.window.showInformationMessage('✅ PR saved as PR.md');
        }
        if (msg.command === 'openGitHub') {
            vscode.env.openExternal(vscode.Uri.parse('https://github.com/pulls/new'));
        }
    });
}