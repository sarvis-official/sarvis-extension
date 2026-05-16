import * as vscode from 'vscode';
import { marked } from 'marked';
import { DeadCodeItem, DeadCodeService } from '../services/DeadCodeService';

export function showDeadCodePanel(title: string, markdown: string, items: DeadCodeItem[]): void {
    const panel = vscode.window.createWebviewPanel(
        'sarvisDeadCode',
        `Sarvis: ${title}`,
        vscode.ViewColumn.Beside,
        { enableScripts: false }
    );

    const htmlContent = marked.parse(markdown);
    const score = DeadCodeService.calculateScore(items);
    const scoreColor = score >= 80 ? '#16a34a' : score >= 60 ? '#f59e0b' : '#dc2626';
    const scoreEmoji = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';

    const highItems = items.filter(i => i.severity === 'high');
    const medItems = items.filter(i => i.severity === 'medium');
    const lowItems = items.filter(i => i.severity === 'low');

    const typeIcons: Record<string, string> = {
        'unused-function': '⚙️', 'unused-import': '📦',
        'unused-variable': '📝', 'unused-component': '⚛️',
        'unused-file': '📁', 'unused-export': '📤', 'commented-code': '💬'
    };

    const byType = items.reduce((acc, i) => {
        acc[i.type] = (acc[i.type] ?? 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const typeBreakdownHtml = Object.entries(byType).map(([type, count]) => `
        <div class="type-card">
            <span>${typeIcons[type] ?? '📄'}</span>
            <span class="type-count">${count}</span>
            <span class="type-name">${type.replace(/-/g, ' ')}</span>
        </div>`
    ).join('');

    const itemRows = items.slice(0, 50).map(i => {
        const sevColor = i.severity === 'high' ? '#dc2626' : i.severity === 'medium' ? '#f59e0b' : '#6b7280';
        const icon = i.severity === 'high' ? '🔴' : i.severity === 'medium' ? '🟡' : '🟢';
        const typeIcon = typeIcons[i.type] ?? '📄';
        return `<tr>
            <td>${icon}</td>
            <td style="font-family:monospace;font-size:12px">${i.file}${i.line ? `:${i.line}` : ''}</td>
            <td>${typeIcon} <span style="background:${sevColor};color:white;padding:1px 6px;border-radius:3px;font-size:11px">${i.type}</span></td>
            <td style="font-family:monospace;font-weight:bold;font-size:12px">${i.name}</td>
            <td style="font-size:12px;color:#aaa">${i.message}</td>
        </tr>`;
    }).join('');

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); line-height: 1.6; }
        h1 { color: var(--vscode-textLink-foreground); }
        h2 { border-bottom: 1px solid #444; padding-bottom: 6px; margin-top: 28px; }
        .stats { display: grid; grid-template-columns: repeat(5,1fr); gap: 12px; margin: 20px 0; }
        .stat-card { background: rgba(255,255,255,0.04); border: 1px solid #444; border-radius: 8px; padding: 12px; text-align: center; }
        .stat-value { font-size: 28px; font-weight: bold; }
        .stat-label { font-size: 12px; color: #888; margin-top: 4px; }
        .type-breakdown { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
        .type-card { background: rgba(255,255,255,0.04); border: 1px solid #333; border-radius: 6px; padding: 8px 14px; display: flex; align-items: center; gap: 6px; font-size: 13px; }
        .type-count { font-weight: bold; color: var(--vscode-textLink-foreground); }
        .type-name { color: #aaa; text-transform: capitalize; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 12px 0; }
        td, th { padding: 7px 10px; border-bottom: 1px solid #333; text-align: left; vertical-align: top; }
        th { background: rgba(255,255,255,0.04); font-weight: bold; color: #aaa; font-size: 12px; }
        pre { background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; }
        code { font-family: monospace; background: rgba(0,0,0,0.15); padding: 2px 4px; border-radius: 3px; }
        ul, ol { padding-left: 20px; }
        li { margin: 5px 0; }
        strong { color: var(--vscode-textLink-foreground); }
    </style>
</head>
<body>
    <h1>${title}</h1>
    <div class="stats">
        <div class="stat-card"><div class="stat-value" style="color:${scoreColor}">${scoreEmoji} ${score}</div><div class="stat-label">Clean Score</div></div>
        <div class="stat-card"><div class="stat-value">${items.length}</div><div class="stat-label">Total Items</div></div>
        <div class="stat-card"><div class="stat-value" style="color:#dc2626">${highItems.length}</div><div class="stat-label">🔴 High</div></div>
        <div class="stat-card"><div class="stat-value" style="color:#f59e0b">${medItems.length}</div><div class="stat-label">🟡 Medium</div></div>
        <div class="stat-card"><div class="stat-value" style="color:#6b7280">${lowItems.length}</div><div class="stat-label">🟢 Low</div></div>
    </div>
    <h2>📊 By Type</h2>
    <div class="type-breakdown">${typeBreakdownHtml}</div>
    ${items.length > 0 ? `
    <h2>🗑️ Dead Code Items</h2>
    <table>
        <tr><th></th><th>Location</th><th>Type</th><th>Name</th><th>Reason</th></tr>
        ${itemRows}
    </table>` : '<p style="color:#16a34a">✅ No dead code detected</p>'}
    <h2>🤖 AI Deep Analysis</h2>
    ${htmlContent}
</body>
</html>`;
}