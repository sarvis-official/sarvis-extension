import * as vscode from 'vscode';
import * as path from 'path';
import { marked } from 'marked';
import { FileComplexity } from '../services/ComplexityService';

export function showComplexityPanel(
    files: FileComplexity[],
    aiAnalysis: string,
    context: vscode.ExtensionContext
): void {
    const panel = vscode.window.createWebviewPanel(
        'sarvisComplexity',
        'Sarvis: Complexity Map',
        vscode.ViewColumn.Beside,
        { enableScripts: true }
    );

    const htmlContent = marked.parse(aiAnalysis);

    const gradeColors: Record<string, string> = {
        A: '#16a34a', B: '#84cc16', C: '#f59e0b', D: '#f97316', F: '#dc2626'
    };

    const heatmapFiles = files.slice(0, 20);
    const maxScore = Math.max(...heatmapFiles.map(f => f.score), 1);

    const heatmapHtml = heatmapFiles.map(f => {
        const intensity = f.score / maxScore;
        const r = Math.round(220 * intensity);
        const g = Math.round(220 * (1 - intensity));
        const bg = `rgb(${r},${g},30)`;
        const fileName = path.basename(f.relativePath);
        return `<div class="heatmap-cell" style="background:${bg}"
            title="${f.relativePath}\nScore: ${f.score}/100\nGrade: ${f.grade}\nLines: ${f.totalLines}"
            data-file="${f.relativePath}">
            <div class="hm-name">${fileName}</div>
            <div class="hm-score">${f.score}</div>
            <div class="hm-grade">${f.grade}</div>
        </div>`;
    }).join('');

    const allFunctions = files.flatMap(f =>
        f.functions.map(fn => ({ ...fn, file: f.relativePath }))
    ).sort((a, b) => b.score - a.score).slice(0, 20);

    const fnRows = allFunctions.map(fn => {
        const scoreColor = fn.score >= 70 ? '#dc2626' : fn.score >= 40 ? '#f59e0b' : '#16a34a';
        const bar = `<div style="width:${fn.score}%;height:6px;background:${scoreColor};border-radius:3px"></div>`;
        return `<tr>
            <td style="font-family:monospace;font-weight:bold">${fn.name}()</td>
            <td style="font-family:monospace;font-size:11px;color:#888">${fn.file}:${fn.line}</td>
            <td>${fn.lines}</td>
            <td>${fn.cyclomaticComplexity}</td>
            <td>${fn.nestingDepth}</td>
            <td>${fn.paramCount}</td>
            <td style="width:80px">${bar}<span style="font-size:11px;color:${scoreColor}">${fn.score}</span></td>
        </tr>`;
    }).join('');

    const gradeCounts = { A: 0, B: 0, C: 0, D: 0, F: 0 } as Record<string, number>;
    files.forEach(f => { gradeCounts[f.grade] = (gradeCounts[f.grade] ?? 0) + 1; });

    const totalFiles = files.length;
    const avgScore = Math.round(files.reduce((s, f) => s + f.score, 0) / (totalFiles || 1));
    const highComplexity = files.filter(f => f.score >= 60).length;

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
    <style>
        * { box-sizing: border-box; }
        body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); line-height: 1.6; }
        h1 { color: var(--vscode-textLink-foreground); }
        h2 { border-bottom: 1px solid #444; padding-bottom: 6px; margin-top: 28px; }
        .stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin: 20px 0; }
        .stat-card { background: rgba(255,255,255,0.04); border: 1px solid #444; border-radius: 8px; padding: 12px; text-align: center; }
        .stat-value { font-size: 28px; font-weight: bold; }
        .stat-label { font-size: 12px; color: #888; margin-top: 4px; }
        .grade-bar { display: flex; gap: 8px; margin: 12px 0; flex-wrap: wrap; }
        .grade-pill { padding: 4px 14px; border-radius: 12px; font-weight: bold; font-size: 13px; }
        .heatmap { display: grid; grid-template-columns: repeat(auto-fill,minmax(100px,1fr)); gap: 6px; margin: 12px 0; }
        .heatmap-cell { border-radius: 6px; padding: 8px 6px; text-align: center; cursor: pointer; transition: transform 0.1s; min-height: 70px; display: flex; flex-direction: column; justify-content: center; }
        .heatmap-cell:hover { transform: scale(1.05); }
        .hm-name  { font-size: 11px; font-weight: bold; color: white; word-break: break-all; text-shadow: 0 1px 2px rgba(0,0,0,0.8); }
        .hm-score { font-size: 18px; font-weight: bold; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.8); }
        .hm-grade { font-size: 11px; color: rgba(255,255,255,0.8); text-shadow: 0 1px 2px rgba(0,0,0,0.8); }
        table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 12px 0; }
        td, th { padding: 8px 10px; border-bottom: 1px solid #333; text-align: left; vertical-align: middle; }
        th { background: rgba(255,255,255,0.04); font-weight: bold; color: #aaa; font-size: 12px; }
        pre { background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; }
        code { font-family: monospace; background: rgba(0,0,0,0.15); padding: 2px 4px; border-radius: 3px; }
        ul, ol { padding-left: 20px; }
        li { margin: 5px 0; }
        strong { color: var(--vscode-textLink-foreground); }
        .legend { display: flex; gap: 16px; font-size: 12px; color: #888; margin: 8px 0; flex-wrap: wrap; }
        .legend-item { display: flex; align-items: center; gap: 4px; }
        .legend-dot { width: 12px; height: 12px; border-radius: 50%; }
    </style>
</head>
<body>
    <h1>🗺️ Code Complexity Map</h1>
    <div class="stats">
        <div class="stat-card"><div class="stat-value">${totalFiles}</div><div class="stat-label">Files Analyzed</div></div>
        <div class="stat-card"><div class="stat-value" style="color:${avgScore >= 60 ? '#dc2626' : avgScore >= 40 ? '#f59e0b' : '#16a34a'}">${avgScore}</div><div class="stat-label">Avg Complexity</div></div>
        <div class="stat-card"><div class="stat-value" style="color:#dc2626">${highComplexity}</div><div class="stat-label">High Complexity Files</div></div>
        <div class="stat-card"><div class="stat-value">${allFunctions.length}</div><div class="stat-label">Functions Analyzed</div></div>
    </div>
    <div class="grade-bar">
        ${Object.entries(gradeCounts).filter(([, count]) => count > 0).map(([grade, count]) =>
        `<span class="grade-pill" style="background:${gradeColors[grade]}20;border:1px solid ${gradeColors[grade]};color:${gradeColors[grade]}">
                ${grade}: ${count} file${count > 1 ? 's' : ''}
            </span>`
    ).join('')}
    </div>
    <h2>🔥 Complexity Heatmap</h2>
    <div class="legend">
        <span class="legend-item"><span class="legend-dot" style="background:rgb(20,220,30)"></span> Low</span>
        <span class="legend-item"><span class="legend-dot" style="background:rgb(110,110,30)"></span> Medium</span>
        <span class="legend-item"><span class="legend-dot" style="background:rgb(220,20,30)"></span> High</span>
    </div>
    <div class="heatmap">${heatmapHtml}</div>
    <h2>⚙️ Most Complex Functions (Top 20)</h2>
    <table>
        <tr><th>Function</th><th>Location</th><th>Lines</th><th>Cyclomatic</th><th>Nesting</th><th>Params</th><th>Score</th></tr>
        ${fnRows}
    </table>
    <h2>🤖 AI Analysis</h2>
    ${htmlContent}
    <script>
        const vscode = acquireVsCodeApi();
        document.querySelectorAll('.heatmap-cell').forEach(el => {
            el.addEventListener('click', () => {
                vscode.postMessage({ command: 'openFile', file: el.dataset.file });
            });
        });
    </script>
</body>
</html>`;

    panel.webview.onDidReceiveMessage(async (msg) => {
        if (msg.command === 'openFile') {
            const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
            const fullPath = path.isAbsolute(msg.file) ? msg.file : path.join(ws, msg.file);
            try {
                const doc = await vscode.workspace.openTextDocument(fullPath);
                await vscode.window.showTextDocument(doc);
            } catch { /* skip */ }
        }
    });
}