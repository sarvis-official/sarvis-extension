import * as vscode from 'vscode';
import { marked } from 'marked';
import { DependencyReport } from '../services/DependencyService';

export function showDependencyPanel(title: string, markdown: string, report: DependencyReport): void {
    const panel = vscode.window.createWebviewPanel(
        'sarvisDependencies',
        `Sarvis: ${title}`,
        vscode.ViewColumn.Beside,
        { enableScripts: false }
    );

    const htmlContent = marked.parse(markdown);

    const outdatedCount = report.outdated?.length ?? 0;
    const vulnerableCount = report.vulnerable?.length ?? 0;
    const unusedCount = report.unused?.length ?? 0;
    const heavyCount = report.heaviest?.length ?? 0;

    const pmIcons: Record<string, string> = {
        npm: '📦', yarn: '🧶', pnpm: '⚡', pip: '🐍', maven: '☕', gradle: '🐘', unknown: '📦'
    };
    const pmIcon = pmIcons[report.packageManager ?? 'unknown'] ?? '📦';

    const outdatedRows = (report.outdated ?? []).map(d => `
        <tr>
            <td style="font-family:monospace;font-weight:bold">${d.name}</td>
            <td style="color:#f59e0b">${d.currentVersion}</td>
            <td style="color:#16a34a">${d.latestVersion ?? '?'}</td>
            <td><span style="background:#f59e0b;color:black;padding:1px 6px;border-radius:3px;font-size:11px">OUTDATED</span></td>
        </tr>`).join('');

    const vulnerableRows = (report.vulnerable ?? []).map(d => `
        <tr>
            <td style="font-family:monospace;font-weight:bold">${d.name}</td>
            <td colspan="2" style="color:#dc2626">Vulnerability detected</td>
            <td><span style="background:#dc2626;color:white;padding:1px 6px;border-radius:3px;font-size:11px">VULNERABLE</span></td>
        </tr>`).join('');

    const unusedRows = (report.unused ?? []).map(d => `
        <tr>
            <td style="font-family:monospace;font-weight:bold">${d.name}</td>
            <td colspan="2" style="color:#888">Not imported anywhere</td>
            <td><span style="background:#6b7280;color:white;padding:1px 6px;border-radius:3px;font-size:11px">UNUSED</span></td>
        </tr>`).join('');

    const heavyRows = (report.heaviest ?? []).map(d => `
        <tr>
            <td style="font-family:monospace;font-weight:bold">${d.name}</td>
            <td colspan="2" style="color:#f97316;font-size:12px">${d.size}</td>
            <td><span style="background:#f97316;color:white;padding:1px 6px;border-radius:3px;font-size:11px">HEAVY</span></td>
        </tr>`).join('');

    const commandsHtml = (report.updateCommands ?? []).map(cmd =>
        cmd.startsWith('#')
            ? `<div style="color:#888;margin-top:10px;font-size:12px">${cmd}</div>`
            : `<div class="cmd-line"><code>${cmd}</code></div>`
    ).join('');

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
        .pm-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(0,120,200,0.15); border: 1px solid #007acc; padding: 4px 12px; border-radius: 12px; font-size: 13px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 12px 0; }
        td, th { padding: 8px 10px; border-bottom: 1px solid #333; text-align: left; }
        th { background: rgba(255,255,255,0.04); font-weight: bold; color: #aaa; font-size: 12px; }
        pre { background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; }
        code { font-family: monospace; background: rgba(0,0,0,0.15); padding: 2px 6px; border-radius: 3px; font-size: 13px; }
        .cmd-line { margin: 4px 0; }
        .commands-box { background: rgba(0,0,0,0.2); border: 1px solid #333; border-radius: 6px; padding: 14px; margin: 12px 0; }
        ul, ol { padding-left: 20px; }
        li { margin: 5px 0; }
        strong { color: var(--vscode-textLink-foreground); }
        .empty { color: #16a34a; font-size: 13px; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    <div class="pm-badge">${pmIcon} ${report.packageManager} · ${report.totalDeps ?? 0} total dependencies</div>
    <div class="stats">
        <div class="stat-card"><div class="stat-value">${report.totalDeps ?? 0}</div><div class="stat-label">Total Deps</div></div>
        <div class="stat-card"><div class="stat-value" style="color:${vulnerableCount > 0 ? '#dc2626' : '#16a34a'}">${vulnerableCount}</div><div class="stat-label">🔴 Vulnerable</div></div>
        <div class="stat-card"><div class="stat-value" style="color:${outdatedCount > 0 ? '#f59e0b' : '#16a34a'}">${outdatedCount}</div><div class="stat-label">🟡 Outdated</div></div>
        <div class="stat-card"><div class="stat-value" style="color:#6b7280">${unusedCount}</div><div class="stat-label">⚪ Unused</div></div>
        <div class="stat-card"><div class="stat-value" style="color:#f97316">${heavyCount}</div><div class="stat-label">🟠 Heavy</div></div>
    </div>
    ${(outdatedRows || vulnerableRows || unusedRows || heavyRows) ? `
    <h2>📋 Package Details</h2>
    <table>
        <tr><th>Package</th><th>Current</th><th>Latest</th><th>Status</th></tr>
        ${vulnerableRows}${outdatedRows}${unusedRows}${heavyRows}
    </table>` : '<p class="empty">✅ All packages are up to date and secure</p>'}
    ${report.duplicates?.length ? `
    <h2>🔁 Duplicate Dependencies</h2>
    <p>${report.duplicates.map((d: string) => `<code>${d}</code>`).join(' ')}</p>` : ''}
    ${commandsHtml ? `
    <h2>⚡ Suggested Commands</h2>
    <div class="commands-box">${commandsHtml}</div>` : ''}
    <h2>🤖 AI Analysis</h2>
    ${htmlContent}
</body>
</html>`;
}