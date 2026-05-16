import * as vscode from 'vscode';
import { marked } from 'marked';
import { FileComplexity } from '../services/ComplexityService';
import { DependencyReport } from '../services/DependencyService';

interface HealthData {
    securityScore: number;
    performanceScore: number;
    qualityScore: number;
    securityIssues: number;
    perfIssues: number;
    qualityIssues: number;
    todoItems: number;
    deadCodeItems: number;
    complexityFiles: FileComplexity[];
    depReport: Partial<DependencyReport>;
    aiSummary: string;
    ws: string;
}

export function showHealthDashboard(data: HealthData): void {
    const panel = vscode.window.createWebviewPanel(
        'sarvisHealth',
        'Sarvis: Workspace Health',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    const { securityScore, performanceScore, qualityScore, securityIssues, perfIssues,
        todoItems, deadCodeItems, complexityFiles, depReport, aiSummary } = data;

    const overallScore = Math.round((securityScore + performanceScore + qualityScore) / 3);

    const getColor = (s: number) => s >= 80 ? '#16a34a' : s >= 60 ? '#f59e0b' : '#dc2626';
    const getGrade = (s: number) => s >= 90 ? 'A' : s >= 80 ? 'B' : s >= 70 ? 'C' : s >= 60 ? 'D' : 'F';
    const getEmoji = (s: number) => s >= 80 ? '🟢' : s >= 60 ? '🟡' : '🔴';

    const makeBar = (score: number) => {
        const pct = Math.round(score);
        return `<div class="bar-wrap"><div class="bar-fill" style="width:${pct}%;background:${getColor(score)}"></div></div>`;
    };

    const topComplexFiles = [...complexityFiles].sort((a, b) => b.score - a.score).slice(0, 5);

    const complexRows = topComplexFiles.map(f => `
        <div class="complex-row">
            <span class="grade-badge" style="background:${getColor(100 - f.score)}20;border-color:${getColor(100 - f.score)};color:${getColor(100 - f.score)}">${f.grade}</span>
            <span class="complex-file">${f.relativePath}</span>
            <span class="complex-score">${f.score}/100</span>
        </div>`
    ).join('');

    const aiHtml = marked.parse(aiSummary);

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: var(--vscode-font-family); background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); min-height: 100vh; }
        .header { padding: 24px 32px; background: linear-gradient(135deg,rgba(0,120,200,0.12),rgba(124,58,237,0.12)); border-bottom: 1px solid #333; display: flex; align-items: center; gap: 20px; }
        .header-left { flex: 1; }
        .header-title { font-size: 22px; font-weight: bold; color: var(--vscode-textLink-foreground); }
        .header-sub { font-size: 13px; color: #888; margin-top: 4px; }
        .overall-score { text-align: center; }
        .score-circle { width: 90px; height: 90px; border-radius: 50%; border: 4px solid ${getColor(overallScore)}; display: flex; flex-direction: column; align-items: center; justify-content: center; background: ${getColor(overallScore)}10; }
        .score-num { font-size: 26px; font-weight: bold; color: ${getColor(overallScore)}; }
        .score-label { font-size: 10px; color: #888; }
        .score-grade { font-size: 12px; color: ${getColor(overallScore)}; font-weight: bold; margin-top: 6px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 24px 32px; }
        .card { background: rgba(255,255,255,0.03); border: 1px solid #333; border-radius: 10px; padding: 18px; }
        .card-title { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px; }
        .card-full { grid-column: span 2; }
        .score-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
        .score-row:last-child { margin-bottom: 0; }
        .score-icon { font-size: 18px; width: 24px; text-align: center; }
        .score-info { flex: 1; }
        .score-name { font-size: 13px; font-weight: 500; margin-bottom: 4px; display: flex; justify-content: space-between; }
        .score-val { font-weight: bold; }
        .bar-wrap { height: 8px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; }
        .bar-fill { height: 100%; border-radius: 4px; }
        .score-issues { font-size: 11px; color: #888; margin-top: 3px; }
        .metrics { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
        .metric { background: rgba(255,255,255,0.03); border: 1px solid #333; border-radius: 8px; padding: 12px; text-align: center; }
        .metric-val { font-size: 26px; font-weight: bold; }
        .metric-label { font-size: 11px; color: #888; margin-top: 4px; }
        .dep-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-top: 14px; }
        .dep-stat { text-align: center; padding: 10px; background: rgba(255,255,255,0.03); border-radius: 6px; border: 1px solid #333; }
        .dep-val { font-size: 22px; font-weight: bold; }
        .dep-label { font-size: 11px; color: #888; margin-top: 3px; }
        .complex-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #2a2a2a; }
        .complex-row:last-child { border-bottom: none; }
        .grade-badge { padding: 2px 8px; border-radius: 6px; border: 1px solid; font-size: 11px; font-weight: bold; flex-shrink: 0; }
        .complex-file { flex: 1; font-size: 12px; font-family: monospace; color: #ccc; }
        .complex-score { font-size: 12px; color: #888; }
        .ai-section { padding: 0 32px 24px; }
        .ai-card { background: rgba(0,120,200,0.06); border: 1px solid rgba(0,120,200,0.3); border-radius: 10px; padding: 20px; }
        .ai-card h2 { color: var(--vscode-textLink-foreground); border-bottom: 1px solid rgba(0,120,200,0.2); padding-bottom: 8px; margin-bottom: 14px; font-size: 15px; }
        .ai-card h3 { margin-top: 14px; margin-bottom: 6px; font-size: 13px; }
        .ai-card ul { padding-left: 18px; }
        .ai-card li { margin: 4px 0; font-size: 13px; }
        pre { background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px; font-size: 12px; overflow-x: auto; }
        code { font-family: monospace; background: rgba(0,0,0,0.15); padding: 1px 4px; border-radius: 3px; font-size: 12px; }
        .toolbar { padding: 14px 32px; border-top: 1px solid #333; display: flex; gap: 8px; flex-wrap: wrap; background: rgba(255,255,255,0.01); }
        button { padding: 7px 16px; border: none; border-radius: 5px; cursor: pointer; font-size: 12px; font-weight: bold; }
        .btn-sec  { background: #dc262620; border: 1px solid #dc2626; color: #f87171; }
        .btn-perf { background: #f59e0b20; border: 1px solid #f59e0b; color: #fbbf24; }
        .btn-qual { background: #007acc20; border: 1px solid #007acc; color: #7cc5f4; }
        .btn-ref  { background: #16a34a20; border: 1px solid #16a34a; color: #4ade80; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <div class="header-title">📊 Workspace Health Dashboard</div>
            <div class="header-sub">Generated ${new Date().toLocaleString()} · ${complexityFiles.length} files analyzed</div>
        </div>
        <div class="overall-score">
            <div class="score-circle">
                <div class="score-num">${overallScore}</div>
                <div class="score-label">Overall</div>
            </div>
            <div class="score-grade">${getEmoji(overallScore)} Grade ${getGrade(overallScore)}</div>
        </div>
    </div>
    <div class="grid">
        <div class="card">
            <div class="card-title">📈 Health Scores</div>
            <div class="score-row">
                <span class="score-icon">🔒</span>
                <div class="score-info">
                    <div class="score-name">Security <span class="score-val" style="color:${getColor(securityScore)}">${securityScore}/100</span></div>
                    ${makeBar(securityScore)}
                    <div class="score-issues">${securityIssues} issues found</div>
                </div>
            </div>
            <div class="score-row">
                <span class="score-icon">⚡</span>
                <div class="score-info">
                    <div class="score-name">Performance <span class="score-val" style="color:${getColor(performanceScore)}">${performanceScore}/100</span></div>
                    ${makeBar(performanceScore)}
                    <div class="score-issues">${perfIssues} issues found</div>
                </div>
            </div>
            <div class="score-row">
                <span class="score-icon">🧹</span>
                <div class="score-info">
                    <div class="score-name">Code Quality <span class="score-val" style="color:${getColor(qualityScore)}">${qualityScore}/100</span></div>
                    ${makeBar(qualityScore)}
                    <div class="score-issues">${complexityFiles.filter(f => f.score > 60).length} complex files</div>
                </div>
            </div>
        </div>
        <div class="card">
            <div class="card-title">📋 Quick Metrics</div>
            <div class="metrics">
                <div class="metric"><div class="metric-val" style="color:${todoItems > 20 ? '#f59e0b' : '#16a34a'}">${todoItems}</div><div class="metric-label">TODOs</div></div>
                <div class="metric"><div class="metric-val" style="color:${deadCodeItems > 10 ? '#f59e0b' : '#16a34a'}">${deadCodeItems}</div><div class="metric-label">Dead Code</div></div>
                <div class="metric"><div class="metric-val" style="color:${(depReport.vulnerable?.length ?? 0) > 0 ? '#dc2626' : '#16a34a'}">${depReport.vulnerable?.length ?? 0}</div><div class="metric-label">Vuln Deps</div></div>
                <div class="metric"><div class="metric-val" style="color:${(depReport.outdated?.length ?? 0) > 5 ? '#f59e0b' : '#16a34a'}">${depReport.outdated?.length ?? 0}</div><div class="metric-label">Outdated</div></div>
            </div>
            <div class="card-title" style="margin-top:14px;margin-bottom:8px">📦 Dependencies</div>
            <div class="dep-grid">
                <div class="dep-stat"><div class="dep-val">${depReport.totalDeps ?? 0}</div><div class="dep-label">Total</div></div>
                <div class="dep-stat"><div class="dep-val" style="color:${(depReport.outdated?.length ?? 0) > 0 ? '#f59e0b' : '#888'}">${depReport.outdated?.length ?? 0}</div><div class="dep-label">Outdated</div></div>
                <div class="dep-stat"><div class="dep-val" style="color:${(depReport.vulnerable?.length ?? 0) > 0 ? '#dc2626' : '#888'}">${depReport.vulnerable?.length ?? 0}</div><div class="dep-label">Vulnerable</div></div>
            </div>
        </div>
        <div class="card card-full">
            <div class="card-title">🔥 Most Complex Files</div>
            ${topComplexFiles.length > 0 ? complexRows : '<div style="color:#888;font-size:13px">No complex files detected ✅</div>'}
        </div>
    </div>
    <div class="ai-section">
        <div class="ai-card">
            <h2>🤖 AI Health Analysis</h2>
            ${aiHtml}
        </div>
    </div>
    <div class="toolbar">
        <button class="btn-sec"  onclick="cmd('sarvis.scanSecurityProject')">🔒 Full Security Scan</button>
        <button class="btn-perf" onclick="cmd('sarvis.analyzePerformanceProject')">⚡ Performance Report</button>
        <button class="btn-qual" onclick="cmd('sarvis.complexityMap')">🗺️ Complexity Map</button>
        <button class="btn-qual" onclick="cmd('sarvis.scanTodos')">📋 TODO Report</button>
        <button class="btn-qual" onclick="cmd('sarvis.analyzeDependencies')">📦 Dependency Report</button>
        <button class="btn-ref"  onclick="cmd('sarvis.healthDashboard')">🔄 Refresh</button>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        function cmd(command) { vscode.postMessage({ command }); }
    </script>
</body>
</html>`;

    panel.webview.onDidReceiveMessage(async (msg) => {
        if (msg.command) await vscode.commands.executeCommand(msg.command);
    });
}