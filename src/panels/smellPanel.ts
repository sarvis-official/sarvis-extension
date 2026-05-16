import * as vscode from 'vscode';
import { marked } from 'marked';
import { SmellReport } from '../services/CodeSmellService';

export function showSmellPanel(title: string, markdown: string, reports: SmellReport[]): void {
    const panel = vscode.window.createWebviewPanel(
        'sarvisSmells',
        `Sarvis: ${title}`,
        vscode.ViewColumn.Beside,
        { enableScripts: false }
    );

    const htmlContent = marked.parse(markdown);

    const totalSmells = reports.reduce((sum, r) => sum + r.smells.length, 0);
    const avgScore    = Math.round(reports.reduce((sum, r) => sum + r.score, 0) / (reports.length || 1));
    const highCount   = reports.reduce((sum, r) => sum + r.smells.filter(s => s.severity === 'high').length, 0);
    const medCount    = reports.reduce((sum, r) => sum + r.smells.filter(s => s.severity === 'medium').length, 0);
    const lowCount    = reports.reduce((sum, r) => sum + r.smells.filter(s => s.severity === 'low').length, 0);

    const scoreColor = avgScore >= 80 ? '#16a34a' : avgScore >= 60 ? '#f59e0b' : '#dc2626';
    const scoreEmoji = avgScore >= 80 ? '🟢' : avgScore >= 60 ? '🟡' : '🔴';

    const allSmells = reports.flatMap(r => r.smells);
    const smellRows = allSmells.slice(0, 30).map(s => {
        const sevColor = s.severity === 'high' ? '#dc2626' : s.severity === 'medium' ? '#f59e0b' : '#6b7280';
        const icon     = s.severity === 'high' ? '🔴' : s.severity === 'medium' ? '🟡' : '🟢';
        return `<tr>
            <td>${icon}</td>
            <td style="font-family:monospace;font-size:12px">${s.file}${s.line ? `:${s.line}` : ''}</td>
            <td><span style="background:${sevColor};color:white;padding:1px 6px;border-radius:3px;font-size:11px">${s.type}</span></td>
            <td style="font-size:13px">${s.message}</td>
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
        table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 12px 0; }
        td, th { padding: 8px 10px; border-bottom: 1px solid #333; text-align: left; vertical-align: top; }
        th { background: rgba(255,255,255,0.04); font-weight: bold; color: #aaa; font-size: 12px; }
        pre { background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; }
        code { font-family: monospace; background: rgba(0,0,0,0.15); padding: 2px 4px; border-radius: 3px; }
        ul, ol { padding-left: 20px; }
        li { margin: 5px 0; }
        strong { color: var(--vscode-textLink-foreground); }
    </style>
</head>
<body>
    <h1>🧪 ${title}</h1>
    <div class="stats">
        <div class="stat-card"><div class="stat-value" style="color:${scoreColor}">${scoreEmoji} ${avgScore}</div><div class="stat-label">Quality Score</div></div>
        <div class="stat-card"><div class="stat-value">${totalSmells}</div><div class="stat-label">Total Smells</div></div>
        <div class="stat-card"><div class="stat-value" style="color:#dc2626">${highCount}</div><div class="stat-label">🔴 High</div></div>
        <div class="stat-card"><div class="stat-value" style="color:#f59e0b">${medCount}</div><div class="stat-label">🟡 Medium</div></div>
        <div class="stat-card"><div class="stat-value" style="color:#6b7280">${lowCount}</div><div class="stat-label">🟢 Low</div></div>
    </div>
    ${allSmells.length > 0 ? `
    <h2>📋 Detected Smells</h2>
    <table>
        <tr><th></th><th>Location</th><th>Type</th><th>Issue</th></tr>
        ${smellRows}
    </table>` : ''}
    <h2>🤖 AI Deep Analysis</h2>
    ${htmlContent}
</body>
</html>`;
}