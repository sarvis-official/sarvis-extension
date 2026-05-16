import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function showChangelogPanel(
    data: Record<string, unknown>,
    ws: string,
    commits: string
): void {
    const panel = vscode.window.createWebviewPanel(
        'sarvisChangelog',
        `Sarvis: Changelog v${data.version}`,
        vscode.ViewColumn.Beside,
        { enableScripts: true }
    );

    const sections = data.sections as Record<string, string[]> ?? {};
    const version = data.version as string ?? '1.0.0';
    const date = data.date as string ?? new Date().toISOString().split('T')[0];
    const summary = data.summary as string ?? '';
    const highlight = data.highlight as string ?? '';

    const sectionConfig: Record<string, { icon: string; title: string; color: string }> = {
        features: { icon: '✨', title: 'Features', color: '#16a34a' },
        bugfixes: { icon: '🐛', title: 'Bug Fixes', color: '#dc2626' },
        performance: { icon: '⚡', title: 'Performance', color: '#f59e0b' },
        breaking: { icon: '💥', title: 'Breaking Changes', color: '#dc2626' },
        security: { icon: '🔒', title: 'Security', color: '#7c3aed' },
        chore: { icon: '🔧', title: 'Maintenance', color: '#6b7280' },
        docs: { icon: '📝', title: 'Documentation', color: '#0891b2' },
    };

    const hasBreaking = (sections.breaking?.length ?? 0) > 0;
    const hasFeatures = (sections.features?.length ?? 0) > 0;
    const versionType = hasBreaking ? 'MAJOR' : hasFeatures ? 'MINOR' : 'PATCH';
    const versionColor = hasBreaking ? '#dc2626' : hasFeatures ? '#16a34a' : '#007acc';

    const sectionsHtml = Object.entries(sections)
        .filter(([, items]) => items?.length > 0)
        .map(([key, items]) => {
            const cfg = sectionConfig[key] ?? { icon: '📌', title: key, color: '#888' };
            const itemsHtml = items.map(item =>
                `<li><span class="bullet" style="color:${cfg.color}">→</span> ${item}</li>`
            ).join('');
            return `<div class="section">
                <div class="section-title" style="color:${cfg.color}">
                    ${cfg.icon} ${cfg.title} <span class="section-count">${items.length}</span>
                </div>
                <ul class="section-items">${itemsHtml}</ul>
            </div>`;
        }).join('');

    const markdownSections = Object.entries(sections)
        .filter(([, items]) => items?.length > 0)
        .map(([key, items]) => {
            const cfg = sectionConfig[key] ?? { icon: '📌', title: key, color: '#888' };
            return `### ${cfg.icon} ${cfg.title}\n${items.map(i => `- ${i}`).join('\n')}`;
        }).join('\n\n');

    const markdown = `## v${version} (${date})\n\n> ${summary}\n\n${markdownSections}\n\n---`;

    const commitLines = commits.split('\n').slice(0, 20);
    const commitsHtml = commitLines.map(c => {
        const parts = c.match(/^([a-f0-9]+)\s(.+)\s\((.+)\)$/);
        if (!parts) return `<div class="commit-row"><span class="commit-msg">${c}</span></div>`;
        return `<div class="commit-row">
            <code class="commit-hash">${parts[1]}</code>
            <span class="commit-msg">${parts[2]}</span>
            <span class="commit-author">${parts[3]}</span>
        </div>`;
    }).join('');

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: var(--vscode-font-family); background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); }
        .header { padding: 20px 24px; border-bottom: 1px solid #333; background: linear-gradient(135deg,rgba(0,120,200,0.1),rgba(22,163,74,0.1)); }
        .version-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
        .version-badge { font-size: 22px; font-weight: bold; color: var(--vscode-textLink-foreground); }
        .date-badge    { font-size: 13px; color: #888; }
        .version-type  { padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: bold; border: 1px solid ${versionColor}; color: ${versionColor}; background: ${versionColor}15; }
        .summary   { font-size: 13px; color: #94a3b8; margin-bottom: 8px; }
        .highlight { background: rgba(22,163,74,0.1); border-left: 3px solid #16a34a; padding: 8px 12px; border-radius: 4px; font-size: 13px; color: #4ade80; }
        .content { padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }
        .section { background: rgba(255,255,255,0.02); border: 1px solid #333; border-radius: 8px; padding: 14px; }
        .section-title { font-size: 13px; font-weight: bold; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
        .section-count { background: rgba(255,255,255,0.08); padding: 1px 7px; border-radius: 10px; font-size: 11px; color: #888; margin-left: auto; }
        .section-items { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 6px; }
        .section-items li { font-size: 13px; display: flex; gap: 8px; align-items: flex-start; line-height: 1.5; }
        .bullet { flex-shrink: 0; font-weight: bold; }
        .commits-section { background: rgba(255,255,255,0.02); border: 1px solid #333; border-radius: 8px; padding: 14px; }
        .commits-title { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
        .commit-row { display: flex; align-items: center; gap: 10px; padding: 5px 0; border-bottom: 1px solid #2a2a2a; font-size: 12px; }
        .commit-row:last-child { border-bottom: none; }
        .commit-hash { background: rgba(0,120,200,0.15); color: #7cc5f4; padding: 1px 6px; border-radius: 4px; font-size: 11px; flex-shrink: 0; }
        .commit-msg { flex: 1; color: #ccc; }
        .commit-author { color: #666; font-size: 11px; flex-shrink: 0; }
        .toolbar { padding: 14px 24px; border-top: 1px solid #333; display: flex; gap: 8px; flex-wrap: wrap; }
        button { padding: 8px 16px; border: none; border-radius: 5px; cursor: pointer; font-size: 12px; font-weight: bold; }
        .btn-copy   { background: #444; color: white; }
        .btn-save   { background: #007acc; color: white; }
        .btn-append { background: #16a34a; color: white; }
        .btn-tag    { background: #7c3aed; color: white; }
    </style>
</head>
<body>
    <div class="header">
        <div class="version-row">
            <span class="version-badge">v${version}</span>
            <span class="date-badge">📅 ${date}</span>
            <span class="version-type">${versionType}</span>
        </div>
        <div class="summary">${summary}</div>
        ${highlight ? `<div class="highlight">⭐ ${highlight}</div>` : ''}
    </div>
    <div class="content">
        ${sectionsHtml}
        <div class="commits-section">
            <div class="commits-title">📌 ${commitLines.length} commits included</div>
            ${commitsHtml}
        </div>
    </div>
    <div class="toolbar">
        <button class="btn-copy"   onclick="copyMd()">📋 Copy Markdown</button>
        <button class="btn-save"   onclick="saveFile()">💾 Save to CHANGELOG.md</button>
        <button class="btn-append" onclick="appendFile()">➕ Append to CHANGELOG.md</button>
        <button class="btn-tag"    onclick="createTag()">🏷️ Create Git Tag v${version}</button>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        const markdown = ${JSON.stringify(markdown)};
        const version  = ${JSON.stringify(version)};
        function copyMd() {
            navigator.clipboard.writeText(markdown).then(() => {
                const btn = document.querySelector('.btn-copy');
                btn.textContent = '✅ Copied!';
                setTimeout(() => btn.textContent = '📋 Copy Markdown', 2000);
            });
        }
        function saveFile()   { vscode.postMessage({ command: 'save',   content: markdown }); }
        function appendFile() { vscode.postMessage({ command: 'append', content: markdown }); }
        function createTag()  { vscode.postMessage({ command: 'createTag', version }); }
    </script>
</body>
</html>`;

    panel.webview.onDidReceiveMessage(async (msg) => {
        if (msg.command === 'save') {
            const changelogPath = path.join(ws, 'CHANGELOG.md');
            const header = `# Changelog\n\nAll notable changes to this project will be documented here.\n\n`;
            const existing = fs.existsSync(changelogPath) ? fs.readFileSync(changelogPath, 'utf-8') : header;
            fs.writeFileSync(changelogPath, msg.content + '\n\n' + existing.replace(header, ''));
            const doc = await vscode.workspace.openTextDocument(changelogPath);
            await vscode.window.showTextDocument(doc);
            vscode.window.showInformationMessage('✅ CHANGELOG.md saved!');
        }
        if (msg.command === 'append') {
            const changelogPath = path.join(ws, 'CHANGELOG.md');
            if (fs.existsSync(changelogPath)) {
                const lines = fs.readFileSync(changelogPath, 'utf-8').split('\n');
                const insertIdx = lines.findIndex(l => l.startsWith('## '));
                if (insertIdx >= 0) lines.splice(insertIdx, 0, msg.content + '\n');
                else lines.push(msg.content);
                fs.writeFileSync(changelogPath, lines.join('\n'));
            } else {
                fs.writeFileSync(changelogPath, `# Changelog\n\n${msg.content}\n`);
            }
            const doc = await vscode.workspace.openTextDocument(changelogPath);
            await vscode.window.showTextDocument(doc);
            vscode.window.showInformationMessage('✅ Appended to CHANGELOG.md!');
        }
        if (msg.command === 'createTag') {
            const terminal = vscode.window.activeTerminal ?? vscode.window.createTerminal('Sarvis');
            terminal.show();
            terminal.sendText(`git tag -a v${msg.version} -m "Release v${msg.version}"`);
            vscode.window.showInformationMessage(`🏷️ Tag v${msg.version} created!`);
        }
    });
}