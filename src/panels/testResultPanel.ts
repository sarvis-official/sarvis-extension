import * as vscode from 'vscode';
import { TestRunResult } from '../services/TestRunnerService';
import { fixFailingTests } from '../commands/debugCommands';
import { LearningService } from '../services/LearningService';
import { SECRET_KEY } from '../types';

export function showTestResultPanel(
    result: TestRunResult,
    ws: string,
    context: vscode.ExtensionContext
): void {
    const panel = vscode.window.createWebviewPanel(
        'sarvisTests',
        'Sarvis: Test Results',
        vscode.ViewColumn.Beside,
        { enableScripts: true }
    );

    const passRate   = result.total > 0 ? Math.round((result.passed / result.total) * 100) : 0;
    const scoreColor = passRate === 100 ? '#16a34a' : passRate >= 70 ? '#f59e0b' : '#dc2626';

    const testRows = result.results.map(t => {
        const icon  = t.status === 'passed' ? '✅' : t.status === 'failed' ? '❌' : '⏭️';
        return `
        <div class="test-row ${t.status}">
            <span class="test-icon">${icon}</span>
            <span class="test-name">${t.name}</span>
            ${t.file     ? `<span class="test-file">${t.file}</span>` : ''}
            ${t.duration ? `<span class="test-duration">${t.duration}ms</span>` : ''}
            ${t.error    ? `<div class="test-error">${t.error.slice(0, 200)}</div>` : ''}
        </div>`;
    }).join('');

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: var(--vscode-font-family); background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); }
        .header { padding: 20px 24px; border-bottom: 1px solid #333; background: rgba(255,255,255,0.02); }
        .title { font-size: 18px; font-weight: bold; color: var(--vscode-textLink-foreground); margin-bottom: 12px; }
        .stats { display: flex; gap: 12px; flex-wrap: wrap; }
        .stat { padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: bold; border: 1px solid; }
        .stat-pass { border-color: #16a34a; color: #16a34a; background: #16a34a15; }
        .stat-fail { border-color: #dc2626; color: #dc2626; background: #dc262615; }
        .stat-skip { border-color: #888;    color: #888;    background: #88888815; }
        .stat-time { border-color: #007acc; color: #007acc; background: #007acc15; }
        .progress-bar { height: 6px; background: #333; border-radius: 3px; margin: 14px 0 0; overflow: hidden; }
        .progress-fill { height: 100%; background: ${scoreColor}; border-radius: 3px; width: ${passRate}%; }
        .pass-rate { font-size: 12px; color: #888; margin-top: 4px; }
        .content { padding: 16px 24px; }
        .section-title { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
        .test-row { padding: 10px 12px; border-radius: 6px; margin-bottom: 6px; background: rgba(255,255,255,0.02); border: 1px solid #2a2a2a; }
        .test-row.failed  { border-left: 3px solid #dc2626; }
        .test-row.passed  { border-left: 3px solid #16a34a; }
        .test-row.skipped { border-left: 3px solid #888; }
        .test-row > * { display: inline; }
        .test-icon     { margin-right: 8px; }
        .test-name     { font-size: 13px; font-weight: 500; }
        .test-file     { font-size: 11px; color: #888; font-family: monospace; margin-left: 8px; }
        .test-duration { font-size: 11px; color: #666; margin-left: 8px; }
        .test-error    { font-size: 12px; color: #f87171; margin-top: 6px; font-family: monospace; background: rgba(220,38,38,0.08); padding: 6px 8px; border-radius: 4px; white-space: pre-wrap; display: block; }
        .empty { text-align: center; padding: 40px; color: #888; }
        .empty-icon { font-size: 32px; margin-bottom: 12px; }
        .toolbar { padding: 14px 24px; border-top: 1px solid #333; display: flex; gap: 8px; flex-wrap: wrap; }
        button { padding: 8px 18px; border: none; border-radius: 5px; cursor: pointer; font-size: 13px; font-weight: bold; }
        .btn-fix   { background: #007acc; color: white; }
        .btn-fix:hover { background: #005f99; }
        .btn-rerun { background: #16a34a; color: white; }
        .btn-rerun:hover { background: #15803d; }
        .btn-copy  { background: #333; color: #aaa; border: 1px solid #444; }
        .btn-copy:hover { background: #3a3a3a; }
        pre { background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px; font-size: 11px; overflow: auto; max-height: 200px; margin-top: 16px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">🧪 Test Results — ${result.framework}</div>
        <div class="stats">
            <span class="stat stat-pass">✅ ${result.passed} passed</span>
            ${result.failed  > 0 ? `<span class="stat stat-fail">❌ ${result.failed} failed</span>` : ''}
            ${result.skipped > 0 ? `<span class="stat stat-skip">⏭️ ${result.skipped} skipped</span>` : ''}
            <span class="stat stat-time">⏱️ ${(result.duration / 1000).toFixed(1)}s</span>
        </div>
        <div class="progress-bar"><div class="progress-fill"></div></div>
        <div class="pass-rate">${passRate}% passing (${result.passed}/${result.total})</div>
    </div>
    <div class="content">
        ${result.results.length > 0 ? `
        <div class="section-title">${result.total} test${result.total !== 1 ? 's' : ''}</div>
        ${testRows}` : `
        <div class="empty">
            <div class="empty-icon">🧪</div>
            <div>No test results to display</div>
            <pre>${result.rawOutput.slice(0, 1000).replace(/</g, '&lt;')}</pre>
        </div>`}
    </div>
    <div class="toolbar">
        ${result.failed > 0 ? `<button class="btn-fix"   onclick="autoFix()">⚡ Auto-Fix ${result.failed} Failing</button>` : ''}
        <button class="btn-rerun" onclick="rerun()">▶ Re-run Tests</button>
        <button class="btn-copy"  onclick="copyOutput()">📋 Copy Output</button>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        const rawOutput = ${JSON.stringify(result.rawOutput)};
        function autoFix()     { vscode.postMessage({ command: 'autoFix' }); }
        function rerun()       { vscode.postMessage({ command: 'rerun' }); }
        function copyOutput()  {
            navigator.clipboard.writeText(rawOutput).then(() => {
                const btn = document.querySelector('.btn-copy');
                btn.textContent = '✅ Copied!';
                setTimeout(() => btn.textContent = '📋 Copy Output', 2000);
            });
        }
    </script>
</body>
</html>`;

    panel.webview.onDidReceiveMessage(async (msg) => {
        if (msg.command === 'autoFix') {
            const apiKey = await context.secrets.get(SECRET_KEY);
            if (!apiKey) { vscode.window.showErrorMessage('Set API key first.'); return; }
            panel.dispose();
            const learningService = new LearningService(context);
            await fixFailingTests(apiKey, result, ws, result.framework, context, learningService);
        }
        if (msg.command === 'rerun') {
            panel.dispose();
            vscode.commands.executeCommand('sarvis.runTests');
        }
    });
}