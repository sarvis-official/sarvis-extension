import * as vscode from 'vscode';
import { marked } from 'marked';
import { PerformanceIssue, PerformanceService } from '../services/PerformanceService';

export function showPerformancePanel(title: string, markdown: string, issues: PerformanceIssue[]): void {
    const panel = vscode.window.createWebviewPanel(
        'sarvisPerformance',
        `Sarvis: ${title}`,
        vscode.ViewColumn.Beside,
        { enableScripts: false }
    );

    const htmlContent = marked.parse(markdown);
    const score = PerformanceService.calculateScore(issues);
    const scoreColor = score >= 80 ? '#16a34a' : score >= 60 ? '#f59e0b' : '#dc2626';
    const scoreEmoji = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';

    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const mediumCount   = issues.filter(i => i.severity === 'medium').length;
    const lowCount      = issues.filter(i => i.severity === 'low').length;

    const typeIcons: Record<string, string> = {
        'n-plus-1': '🗄️', 'inefficient-loop': '🔁',
        'blocking-code': '🚫', 'memory': '💾',
        'rerender': '⚛️', 'algorithm': '📐'
    };

    const issueRows = issues.slice(0, 30).map(i => {
        const sevColor = i.severity === 'critical' ? '#dc2626' : i.severity === 'medium' ? '#f59e0b' : '#6b7280';
        const icon     = i.severity === 'critical' ? '🔴' : i.severity === 'medium' ? '🟡' : '🟢';
        const typeIcon = typeIcons[i.type] ?? '⚠️';
        return `<tr>
            <td>${icon}</td>
            <td style="font-family:monospace;font-size:12px">${i.file}${i.line ? `:${i.line}` : ''}</td>
            <td>${typeIcon} <span style="background:${sevColor};color:white;padding:1px 6px;border-radius:3px;font-size:11px">${i.type}</span></td>
            <td style="font-size:13px">${i.message}</td>
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
    <h1>${title}</h1>
    <div class="stats">
        <div class="stat-card"><div class="stat-value" style="color:${scoreColor}">${scoreEmoji} ${score}</div><div class="stat-label">Perf Score</div></div>
        <div class="stat-card"><div class="stat-value">${issues.length}</div><div class="stat-label">Total Issues</div></div>
        <div class="stat-card"><div class="stat-value" style="color:#dc2626">${criticalCount}</div><div class="stat-label">🔴 Critical</div></div>
        <div class="stat-card"><div class="stat-value" style="color:#f59e0b">${mediumCount}</div><div class="stat-label">🟡 Medium</div></div>
        <div class="stat-card"><div class="stat-value" style="color:#6b7280">${lowCount}</div><div class="stat-label">🟢 Low</div></div>
    </div>
    ${issues.length > 0 ? `
    <h2>📋 Static Analysis Results</h2>
    <table>
        <tr><th></th><th>Location</th><th>Type</th><th>Issue</th></tr>
        ${issueRows}
    </table>` : '<p style="color:#888">✅ No static issues detected</p>'}
    <h2>🤖 AI Deep Analysis</h2>
    ${htmlContent}
</body>
</html>`;
}