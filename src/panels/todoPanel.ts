import * as vscode from 'vscode';
import * as path from 'path';
import { marked } from 'marked';
import { TodoItem, TodoService } from '../services/TodoService';

export function showTodoPanel(items: TodoItem[], aiAnalysis: string): void {
    const panel = vscode.window.createWebviewPanel(
        'sarvisTodos',
        'Sarvis: TODO Manager',
        vscode.ViewColumn.Beside,
        { enableScripts: true }
    );

    const htmlContent = marked.parse(aiAnalysis);
    const stats = TodoService.getStats(items);

    const typeColors: Record<string, string> = {
        BUG: '#dc2626', FIXME: '#dc2626', XXX: '#dc2626',
        HACK: '#f97316', DEPRECATED: '#f97316', OPTIMIZE: '#f59e0b',
        TODO: '#3b82f6', NOTE: '#6b7280'
    };
    const priorityIcon: Record<string, string> = { high: '🔴', medium: '🟡', low: '🔵' };

    const grouped = TodoService.groupByFile(items);
    const groupedHtml = [...grouped.entries()].map(([file, fileItems]) => `
        <div class="file-group">
            <div class="file-header">📄 ${file} <span class="count">${fileItems.length}</span></div>
            ${fileItems.map(item => `
            <div class="todo-item" data-file="${item.file}" data-line="${item.line}">
                <span class="todo-type" style="background:${typeColors[item.type] ?? '#666'}20;border-color:${typeColors[item.type] ?? '#666'};color:${typeColors[item.type] ?? '#aaa'}">${item.type}</span>
                <span class="priority-icon">${priorityIcon[item.priority]}</span>
                <span class="todo-location">:${item.line}</span>
                <span class="todo-message">${item.message}</span>
            </div>`).join('')}
        </div>`
    ).join('');

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); line-height: 1.6; }
        h1 { color: var(--vscode-textLink-foreground); }
        h2 { border-bottom: 1px solid #444; padding-bottom: 6px; margin-top: 28px; }
        .stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin: 20px 0; }
        .stat-card { background: rgba(255,255,255,0.04); border: 1px solid #444; border-radius: 8px; padding: 12px; text-align: center; }
        .stat-value { font-size: 28px; font-weight: bold; }
        .stat-label { font-size: 12px; color: #888; margin-top: 4px; }
        .type-badges { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
        .type-badge { padding: 4px 12px; border-radius: 12px; border: 1px solid; font-size: 12px; font-weight: bold; }
        .file-group { margin: 12px 0; border: 1px solid #333; border-radius: 6px; overflow: hidden; }
        .file-header { padding: 8px 14px; background: rgba(255,255,255,0.04); font-family: monospace; font-size: 13px; display: flex; align-items: center; gap: 8px; }
        .count { background: #007acc; color: white; padding: 1px 6px; border-radius: 10px; font-size: 11px; }
        .todo-item { padding: 8px 14px; border-top: 1px solid #2a2a2a; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: background 0.1s; }
        .todo-item:hover { background: rgba(255,255,255,0.04); }
        .todo-type { padding: 1px 7px; border-radius: 10px; border: 1px solid; font-size: 11px; font-weight: bold; white-space: nowrap; }
        .todo-location { font-family: monospace; color: #888; font-size: 12px; white-space: nowrap; }
        .todo-message { font-size: 13px; color: #ccc; flex: 1; }
        .priority-icon { font-size: 12px; }
        pre { background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; }
        code { font-family: monospace; background: rgba(0,0,0,0.15); padding: 2px 4px; border-radius: 3px; }
        ul, ol { padding-left: 20px; }
        li { margin: 5px 0; }
        strong { color: var(--vscode-textLink-foreground); }
    </style>
</head>
<body>
    <h1>📋 TODO Manager</h1>
    <div class="stats">
        <div class="stat-card"><div class="stat-value">${stats.total}</div><div class="stat-label">Total Items</div></div>
        <div class="stat-card"><div class="stat-value" style="color:#dc2626">${stats.high}</div><div class="stat-label">🔴 High Priority</div></div>
        <div class="stat-card"><div class="stat-value" style="color:#f59e0b">${stats.medium}</div><div class="stat-label">🟡 Medium</div></div>
        <div class="stat-card"><div class="stat-value" style="color:#3b82f6">${stats.low}</div><div class="stat-label">🔵 Low</div></div>
    </div>
    <div class="type-badges">
        ${Object.entries(typeColors).map(([type, color]) => {
        const count = items.filter(i => i.type === type).length;
        return count > 0
            ? `<span class="type-badge" style="background:${color}20;border-color:${color};color:${color}">${type} ${count}</span>`
            : '';
    }).join('')}
    </div>
    <h2>📁 By File</h2>
    ${groupedHtml}
    <h2>🤖 AI Analysis</h2>
    ${htmlContent}
    <script>
        const vscode = acquireVsCodeApi();
        document.querySelectorAll('.todo-item').forEach(el => {
            el.addEventListener('click', () => {
                vscode.postMessage({ command: 'jumpToTodo', file: el.dataset.file, line: parseInt(el.dataset.line) });
            });
        });
    </script>
</body>
</html>`;

    panel.webview.onDidReceiveMessage(async (msg) => {
        if (msg.command === 'jumpToTodo') {
            const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
            const fullPath = path.isAbsolute(msg.file) ? msg.file : path.join(ws, msg.file);
            try {
                const doc = await vscode.workspace.openTextDocument(fullPath);
                const editor = await vscode.window.showTextDocument(doc);
                const position = new vscode.Position(msg.line - 1, 0);
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
            } catch { /* skip */ }
        }
    });
}