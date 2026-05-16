import * as vscode from 'vscode';
import * as path from 'path';
import { SessionMemoryService, SessionMemory } from '../services/SessionMemoryService';
import { handleError } from '../utils/errorHandler';

export function registerMemoryCommands(
    context: vscode.ExtensionContext,
    sessionMemory: SessionMemoryService
): void {

    context.subscriptions.push(

        vscode.commands.registerCommand('sarvis.memorySetBug', async () => {
            const bug = await vscode.window.showInputBox({
                prompt: 'What bug are you currently working on?',
                placeHolder: 'e.g. Login fails when email has special characters',
                value: sessionMemory.currentMemory.currentBug,
                ignoreFocusOut: true
            });
            if (!bug?.trim()) return;
            sessionMemory.setCurrentBug(bug.trim());
            vscode.window.showInformationMessage(`🧠 Sarvis remembers: Bug — "${bug.trim()}"`);
        }),

        vscode.commands.registerCommand('sarvis.memorySetFeature', async () => {
            const feature = await vscode.window.showInputBox({
                prompt: 'What feature are you currently building?',
                placeHolder: 'e.g. User authentication with JWT and refresh tokens',
                value: sessionMemory.currentMemory.currentFeature,
                ignoreFocusOut: true
            });
            if (!feature?.trim()) return;
            sessionMemory.setCurrentFeature(feature.trim());
            vscode.window.showInformationMessage(`🧠 Sarvis remembers: Feature — "${feature.trim()}"`);
        }),

        vscode.commands.registerCommand('sarvis.memorySetGoal', async () => {
            const goal = await vscode.window.showInputBox({
                prompt: 'What is the overall goal of this project/session?',
                placeHolder: 'e.g. Build a multi-tenant SaaS billing system',
                value: sessionMemory.currentMemory.projectGoal,
                ignoreFocusOut: true
            });
            if (!goal?.trim()) return;
            sessionMemory.setProjectGoal(goal.trim());
            vscode.window.showInformationMessage(`🧠 Sarvis remembers: Goal — "${goal.trim()}"`);
        }),

        vscode.commands.registerCommand('sarvis.memoryAddNote', async () => {
            const note = await vscode.window.showInputBox({
                prompt: 'Add a note for Sarvis to remember this session',
                placeHolder: 'e.g. Using Redis for caching, avoid breaking the auth middleware',
                ignoreFocusOut: true
            });
            if (!note?.trim()) return;
            const editor = vscode.window.activeTextEditor;
            sessionMemory.addEntry('note', note.trim(), editor?.document.fileName);
            vscode.window.showInformationMessage(`🧠 Sarvis noted: "${note.trim()}"`);
        }),

        vscode.commands.registerCommand('sarvis.memoryView', async () => {
            showMemoryPanel(sessionMemory.currentMemory, context);
        }),

        vscode.commands.registerCommand('sarvis.memoryClear', async () => {
            const confirm = await vscode.window.showWarningMessage(
                'Clear all session memory? Sarvis will forget current bug, feature and recent changes.',
                { modal: true },
                'Clear'
            );
            if (confirm !== 'Clear') return;
            sessionMemory.clearMemory();
            vscode.window.showInformationMessage('🧠 Sarvis session memory cleared.');
        })
    );
}

function showMemoryPanel(memory: SessionMemory, context: vscode.ExtensionContext): void {
    const panel = vscode.window.createWebviewPanel(
        'sarvisMemory',
        'Sarvis: Session Memory',
        vscode.ViewColumn.Beside,
        { enableScripts: false }
    );

    const timeAgo = (ts: number) => {
        const diff = Date.now() - ts;
        if (diff < 60000) return 'just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return `${Math.floor(diff / 86400000)}d ago`;
    };

    const typeColors: Record<string, string> = {
        bug: '#dc2626', feature: '#16a34a',
        change: '#007acc', note: '#f59e0b', context: '#8b5cf6'
    };
    const typeIcons: Record<string, string> = {
        bug: '🐛', feature: '✨', change: '📝', note: '💡', context: '🔍'
    };

    const entriesHtml = memory.entries.slice(0, 20).map(e => `
        <div class="entry">
            <div class="entry-header">
                <span class="entry-type" style="background:${typeColors[e.type] ?? '#888'}20;border-color:${typeColors[e.type] ?? '#888'};color:${typeColors[e.type] ?? '#888'}">
                    ${typeIcons[e.type] ?? '📌'} ${e.type}
                </span>
                <span class="entry-time">${timeAgo(e.timestamp)}</span>
                ${e.file ? `<span class="entry-file">📄 ${path.basename(e.file)}</span>` : ''}
            </div>
            <div class="entry-content">${e.content}</div>
        </div>`
    ).join('');

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); line-height: 1.6; }
        h1 { color: var(--vscode-textLink-foreground); margin-bottom: 4px; }
        h2 { border-bottom: 1px solid #444; padding-bottom: 6px; margin-top: 24px; }
        .status-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
        .status-card { background: rgba(255,255,255,0.04); border: 1px solid #444; border-radius: 8px; padding: 14px; }
        .status-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
        .status-value { font-size: 14px; font-weight: 500; }
        .status-empty { color: #555; font-style: italic; }
        .entry { border: 1px solid #333; border-radius: 6px; padding: 10px 14px; margin: 8px 0; }
        .entry-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
        .entry-type { padding: 1px 8px; border-radius: 10px; border: 1px solid; font-size: 11px; font-weight: bold; }
        .entry-time { color: #666; font-size: 11px; margin-left: auto; }
        .entry-file { color: #888; font-size: 11px; font-family: monospace; }
        .entry-content { font-size: 13px; color: #ccc; }
        .changes-list { list-style: none; padding: 0; }
        .changes-list li { padding: 6px 0; border-bottom: 1px solid #333; font-size: 13px; color: #ccc; display: flex; gap: 8px; }
        .changes-list li::before { content: "📝"; }
        .updated { color: #555; font-size: 12px; margin-top: 8px; }
        .empty-state { color: #555; font-style: italic; text-align: center; padding: 30px; }
        code { font-family: monospace; background: rgba(0,0,0,0.15); padding: 1px 5px; border-radius: 3px; font-size: 12px; }
        ul { padding-left: 20px; }
        li { margin: 5px 0; }
    </style>
</head>
<body>
    <h1>🧠 Session Memory</h1>
    <p class="updated">Last updated: ${new Date(memory.lastUpdated).toLocaleString()} · ${memory.entries.length} entries</p>

    <div class="status-grid">
        <div class="status-card">
            <div class="status-label">🎯 Project Goal</div>
            <div class="status-value ${!memory.projectGoal ? 'status-empty' : ''}">${memory.projectGoal || 'Not set'}</div>
        </div>
        <div class="status-card">
            <div class="status-label">🐛 Current Bug</div>
            <div class="status-value ${!memory.currentBug ? 'status-empty' : ''}">${memory.currentBug || 'Not set'}</div>
        </div>
        <div class="status-card">
            <div class="status-label">✨ Current Feature</div>
            <div class="status-value ${!memory.currentFeature ? 'status-empty' : ''}">${memory.currentFeature || 'Not set'}</div>
        </div>
        <div class="status-card">
            <div class="status-label">📝 Recent Changes</div>
            <div class="status-value">${memory.recentChanges.length} file saves tracked</div>
        </div>
    </div>

    ${memory.recentChanges.length > 0 ? `
    <h2>📝 Recent Changes</h2>
    <ul class="changes-list">
        ${memory.recentChanges.slice(0, 8).map((c: string) => `<li>${c}</li>`).join('')}
    </ul>` : ''}

    <h2>🗂️ Memory Entries (${memory.entries.length})</h2>
    ${memory.entries.length > 0 ? entriesHtml : '<div class="empty-state">No entries yet. Use the commands below to add context.</div>'}

    <h2>⌨️ Commands</h2>
    <ul>
        <li><code>Sarvis: Set Current Bug</code> — Tell Sarvis what bug you're fixing</li>
        <li><code>Sarvis: Set Current Feature</code> — Tell Sarvis what feature you're building</li>
        <li><code>Sarvis: Set Project Goal</code> — Set high-level session goal</li>
        <li><code>Sarvis: Add Memory Note</code> — Add any context note</li>
        <li><code>Sarvis: Clear Session Memory</code> — Reset all memory</li>
    </ul>
</body>
</html>`;
}