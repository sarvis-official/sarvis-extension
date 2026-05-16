import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function showStandupPanel(data: Record<string, unknown>, context: vscode.ExtensionContext): void {
    const panel = vscode.window.createWebviewPanel(
        'sarvisStandup',
        'Sarvis: Daily Standup',
        vscode.ViewColumn.Beside,
        { enableScripts: true }
    );

    const yesterday = data.yesterday as string[] ?? [];
    const today = data.today as string[] ?? [];
    const blockers = data.blockers as string[] ?? [];
    const highlights = data.highlights as string ?? '';
    const mood = data.mood as string ?? 'productive';
    const timeSpent = data.timeSpent as Record<string, number> ?? {};

    const moodEmoji: Record<string, string> = { productive: '🚀', focused: '🎯', blocked: '🚧', learning: '📚' };
    const moodColor: Record<string, string> = { productive: '#16a34a', focused: '#007acc', blocked: '#dc2626', learning: '#f59e0b' };

    const yesterdayHtml = yesterday.map(i => `<li><span class="check">✅</span> ${i}</li>`).join('');
    const todayHtml = today.map(i => `<li><span class="check">🔨</span> ${i}</li>`).join('');
    const blockersHtml = blockers.length > 0
        ? blockers.map(b => `<li><span class="check">🚧</span> ${b}</li>`).join('')
        : '<li><span class="check">✅</span> No blockers</li>';

    const timeColors: Record<string, string> = { features: '#16a34a', bugfixes: '#dc2626', reviews: '#007acc', other: '#6b7280' };
    const timeHtml = Object.entries(timeSpent).map(([key, val]) => `
        <div class="time-row">
            <span class="time-label">${key}</span>
            <div class="time-bar-bg"><div class="time-bar" style="width:${val}%;background:${timeColors[key] ?? '#888'}"></div></div>
            <span class="time-pct">${val}%</span>
        </div>`).join('');

    const plainText = `Daily Standup — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}

✅ Yesterday:
${yesterday.map(i => `• ${i}`).join('\n')}

🔨 Today:
${today.map(i => `• ${i}`).join('\n')}

🚧 Blockers:
${blockers.length > 0 ? blockers.map(b => `• ${b}`).join('\n') : '• None'}`;

    const slackText = `*Daily Standup* — ${new Date().toLocaleDateString()}
*✅ Yesterday:*
${yesterday.map(i => `> • ${i}`).join('\n')}
*🔨 Today:*
${today.map(i => `> • ${i}`).join('\n')}
*🚧 Blockers:* ${blockers.length > 0 ? blockers.join(', ') : 'None'}`;

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: var(--vscode-font-family); background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); min-height: 100vh; }
        .header { padding: 20px 24px; background: linear-gradient(135deg,rgba(0,120,200,0.15),rgba(124,58,237,0.15)); border-bottom: 1px solid #333; }
        .date { font-size: 12px; color: #888; margin-bottom: 6px; }
        .title { font-size: 20px; font-weight: bold; color: var(--vscode-textLink-foreground); }
        .highlight { font-size: 13px; color: #94a3b8; margin-top: 8px; font-style: italic; }
        .mood-badge { display: inline-flex; align-items: center; gap: 6px; padding: 3px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; margin-top: 10px; border: 1px solid ${moodColor[mood] ?? '#888'}; color: ${moodColor[mood] ?? '#888'}; background: ${moodColor[mood] ?? '#888'}20; }
        .content { padding: 20px 24px; display: flex; flex-direction: column; gap: 20px; }
        .section { background: rgba(255,255,255,0.03); border: 1px solid #333; border-radius: 10px; overflow: hidden; }
        .section-header { padding: 10px 16px; background: rgba(255,255,255,0.04); border-bottom: 1px solid #2a2a2a; font-size: 12px; font-weight: bold; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px; }
        .section-body { padding: 12px 16px; }
        ul { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 8px; }
        li { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; line-height: 1.5; }
        .check { flex-shrink: 0; font-size: 16px; }
        .time-row { display: flex; align-items: center; gap: 10px; margin: 6px 0; }
        .time-label { width: 80px; font-size: 12px; color: #888; text-transform: capitalize; }
        .time-bar-bg { flex: 1; height: 8px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; }
        .time-bar { height: 100%; border-radius: 4px; }
        .time-pct { width: 35px; font-size: 12px; color: #888; text-align: right; }
        .toolbar { padding: 16px 24px; border-top: 1px solid #333; display: flex; gap: 8px; flex-wrap: wrap; background: rgba(255,255,255,0.02); }
        button { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; }
        .btn-copy       { background: #444; color: white; }
        .btn-copy:hover { background: #555; }
        .btn-slack      { background: #4a154b; color: white; }
        .btn-slack:hover { background: #611f69; }
        .btn-save       { background: #007acc; color: white; }
        .btn-save:hover { background: #005f99; }
        .btn-regen      { background: #333; color: #aaa; border: 1px solid #444; }
        .btn-regen:hover { background: #3a3a3a; }
    </style>
</head>
<body>
    <div class="header">
        <div class="date">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        <div class="title">📋 Daily Standup</div>
        <div class="highlight">${highlights}</div>
        <div class="mood-badge">${moodEmoji[mood] ?? '🚀'} ${mood}</div>
    </div>
    <div class="content">
        <div class="section">
            <div class="section-header">✅ Yesterday — Completed</div>
            <div class="section-body"><ul>${yesterdayHtml}</ul></div>
        </div>
        <div class="section">
            <div class="section-header">🔨 Today — Planned</div>
            <div class="section-body"><ul>${todayHtml}</ul></div>
        </div>
        <div class="section">
            <div class="section-header">🚧 Blockers</div>
            <div class="section-body"><ul>${blockersHtml}</ul></div>
        </div>
        ${Object.keys(timeSpent).length > 0 ? `
        <div class="section">
            <div class="section-header">⏱️ Time Breakdown</div>
            <div class="section-body">${timeHtml}</div>
        </div>` : ''}
    </div>
    <div class="toolbar">
        <button class="btn-copy"  onclick="copyPlain()">📋 Copy Text</button>
        <button class="btn-slack" onclick="copySlack()">💬 Copy for Slack</button>
        <button class="btn-save"  onclick="saveFile()">💾 Save</button>
        <button class="btn-regen" onclick="regenerate()">🔄 Regenerate</button>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        const plainText = ${JSON.stringify(plainText)};
        const slackText = ${JSON.stringify(slackText)};
        function copyPlain() {
            navigator.clipboard.writeText(plainText).then(() => {
                const btn = document.querySelector('.btn-copy');
                btn.textContent = '✅ Copied!';
                setTimeout(() => btn.textContent = '📋 Copy Text', 2000);
            });
        }
        function copySlack() {
            navigator.clipboard.writeText(slackText).then(() => {
                const btn = document.querySelector('.btn-slack');
                btn.textContent = '✅ Copied!';
                setTimeout(() => btn.textContent = '💬 Copy for Slack', 2000);
            });
        }
        function saveFile()   { vscode.postMessage({ command: 'save',       content: plainText }); }
        function regenerate() { vscode.postMessage({ command: 'regenerate' }); }
    </script>
</body>
</html>`;

    panel.webview.onDidReceiveMessage(async (msg) => {
        if (msg.command === 'save') {
            const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!ws) return;
            const date = new Date().toISOString().split('T')[0];
            const filePath = path.join(ws, `standup-${date}.md`);
            fs.writeFileSync(filePath, msg.content);
            const doc = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(doc);
            vscode.window.showInformationMessage(`✅ Standup saved as standup-${date}.md`);
        }
        if (msg.command === 'regenerate') {
            panel.dispose();
            vscode.commands.executeCommand('sarvis.generateStandup');
        }
    });
}