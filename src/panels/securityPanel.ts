import * as vscode from 'vscode';
import { marked } from 'marked';
import { SecurityIssue, SecurityService } from '../services/SecurityService';

export function showSecurityPanel(title: string, markdown: string, issues: SecurityIssue[]): void {
    const panel = vscode.window.createWebviewPanel(
        'sarvisSecurity',
        `Sarvis: ${title}`,
        vscode.ViewColumn.Beside,
        { enableScripts: false }
    );

    const htmlContent = marked.parse(markdown);
    const score = SecurityService.calculateRiskScore(issues);
    const scoreColor = score >= 80 ? '#16a34a' : score >= 60 ? '#f59e0b' : '#dc2626';
    const scoreEmoji = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';

    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const highCount     = issues.filter(i => i.severity === 'high').length;
    const mediumCount   = issues.filter(i => i.severity === 'medium').length;

    const typeIcons: Record<string, string> = {
        'sql-injection': '🗄️', 'xss': '🌐', 'unsafe-eval': '⚠️',
        'weak-crypto': '🔓', 'hardcoded-secret': '🔑',
        'path-traversal': '📂', 'insecure-random': '🎲',
        'command-injection': '💻', 'open-redirect': '↪️', 'sensitive-data': '👁️'
    };

    const issueRows = issues.slice(0, 40).map(i => {
        const sevColor = i.severity === 'critical' ? '#dc2626' : i.severity === 'high' ? '#f97316' : i.severity === 'medium' ? '#f59e0b' : '#6b7280';
        const icon     = i.severity === 'critical' ? '🔴' : i.severity === 'high' ? '🟠' : i.severity === 'medium' ? '🟡' : '🟢';
        const typeIcon = typeIcons[i.type] ?? '🔒';
        const cweHtml  = i.cwe ? `<a href="https://cwe.mitre.org/data/definitions/${i.cwe.replace('CWE-', '')}.html" style="color:#888;font-size:11px">${i.cwe}</a>` : '';
        return `<tr>
            <td>${icon}</td>
            <td style="font-family:monospace;font-size:12px">${i.file}${i.line ? `:${i.line}` : ''}</td>
            <td>${typeIcon} <span style="background:${sevColor};color:white;padding:1px 6px;border-radius:3px;font-size:11px">${i.type}</span> ${cweHtml}</td>
            <td style="font-size:12px">${i.message}</td>
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
        .warning-banner { background: rgba(220,38,38,0.1); border: 1px solid #dc2626; border-radius: 6px; padding: 12px 16px; margin: 16px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 12px 0; }
        td, th { padding: 8px 10px; border-bottom: 1px solid #333; text-align: left; vertical-align: top; }
        th { background: rgba(255,255,255,0.04); font-weight: bold; color: #aaa; font-size: 12px; }
        pre { background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; }
        code { font-family: monospace; background: rgba(0,0,0,0.15); padding: 2px 4px; border-radius: 3px; }
        ul, ol { padding-left: 20px; }
        li { margin: 5px 0; }
        strong { color: var(--vscode-textLink-foreground); }
        a { color: #007acc; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    ${criticalCount > 0 ? `
    <div class="warning-banner">
        🚨 <strong>${criticalCount} critical vulnerability${criticalCount > 1 ? 'ies' : ''} found</strong> — fix before deploying to production
    </div>` : ''}
    <div class="stats">
        <div class="stat-card"><div class="stat-value" style="color:${scoreColor}">${scoreEmoji} ${score}</div><div class="stat-label">Security Score</div></div>
        <div class="stat-card"><div class="stat-value">${issues.length}</div><div class="stat-label">Total Issues</div></div>
        <div class="stat-card"><div class="stat-value" style="color:#dc2626">${criticalCount}</div><div class="stat-label">🔴 Critical</div></div>
        <div class="stat-card"><div class="stat-value" style="color:#f97316">${highCount}</div><div class="stat-label">🟠 High</div></div>
        <div class="stat-card"><div class="stat-value" style="color:#f59e0b">${mediumCount}</div><div class="stat-label">🟡 Medium</div></div>
    </div>
    ${issues.length > 0 ? `
    <h2>🔍 Detected Vulnerabilities</h2>
    <table>
        <tr><th></th><th>Location</th><th>Type</th><th>Issue</th></tr>
        ${issueRows}
    </table>` : '<p style="color:#16a34a">✅ No static vulnerabilities detected</p>'}
    <h2>🤖 AI Deep Security Audit</h2>
    ${htmlContent}
</body>
</html>`;
}