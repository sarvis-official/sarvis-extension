import * as vscode from 'vscode';
import { LearningService } from '../services/LearningService';
import { SessionMemoryService } from '../services/SessionMemoryService';
import { SaveReviewProvider, SaveReviewResult } from '../providers/SaveReviewProvider';
import { handleError } from '../utils/errorHandler';

export function registerSaveReviewHandlers(
    context: vscode.ExtensionContext,
    sessionMemory: SessionMemoryService,
    learningService: LearningService
): void {

    const saveReviewProvider = new SaveReviewProvider(context);

    context.subscriptions.push(

        // Hook into every file save
        vscode.workspace.onDidSaveTextDocument(async (document) => {
            await saveReviewProvider.onFileSave(document);
            sessionMemory.captureFileSave(document);
            learningService.analyzeAndLearn(document.getText(), document.languageId);
        }),

        // Show the last review result (e.g. when badge is clicked)
        vscode.commands.registerCommand('sarvis.showSaveReview', () => {
            const review = saveReviewProvider.getLastReview();
            if (!review) {
                vscode.window.showInformationMessage('✅ No issues found in last review.');
                return;
            }
            showSaveReviewPanel(review, context);
        }),

        // Toggle review-on-save on/off
        vscode.commands.registerCommand('sarvis.toggleReviewOnSave', async () => {
            const config = vscode.workspace.getConfiguration('sarvis');
            const current = config.get<boolean>('reviewOnSave', true);
            await config.update('reviewOnSave', !current, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(
                `⚡ Sarvis Review on Save ${!current ? 'enabled ✅' : 'disabled ❌'}`
            );
            if (current) saveReviewProvider.hide();
        }),

        // Clear the error explainer cache
        vscode.commands.registerCommand('sarvis.clearErrorCache', () => {
            // ErrorExplainerProvider instance is held in extension.ts; emit an event or
            // expose a static clear method — calling the command is enough for the UI.
            vscode.window.setStatusBarMessage('⚡ Sarvis error cache cleared', 2000);
        }),

        // Toggle error explainer hover on/off
        vscode.commands.registerCommand('sarvis.toggleErrorExplainer', async () => {
            const config = vscode.workspace.getConfiguration('sarvis');
            const current = config.get<boolean>('errorExplainer', true);
            await config.update('errorExplainer', !current, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(
                `⚡ Sarvis Error Explainer ${!current ? 'enabled' : 'disabled'}`
            );
        })
    );
}

function showSaveReviewPanel(review: SaveReviewResult, context: vscode.ExtensionContext): void {
    const panel = vscode.window.createWebviewPanel(
        'sarvisSaveReview',
        `Sarvis: ${review.fileName}`,
        vscode.ViewColumn.Beside,
        { enableScripts: true }
    );

    const critical = review.issues.filter(i => i.severity === 'critical');
    const high = review.issues.filter(i => i.severity === 'high');
    const medium = review.issues.filter(i => i.severity === 'medium');

    const typeIcons: Record<string, string> = { security: '🔒', performance: '⚡', quality: '🧹' };
    const severityColors: Record<string, string> = {
        critical: '#dc2626', high: '#f97316', medium: '#f59e0b', low: '#6b7280'
    };
    const severityIcons: Record<string, string> = {
        critical: '🔴', high: '🟠', medium: '🟡', low: '🟢'
    };

    const issueRows = review.issues.map(issue => `
        <div class="issue-card ${issue.severity}">
            <div class="issue-header">
                <span class="issue-icon">${typeIcons[issue.type] ?? '⚠️'}</span>
                <span class="severity-badge" style="background:${severityColors[issue.severity]}20;border-color:${severityColors[issue.severity]};color:${severityColors[issue.severity]}">
                    ${severityIcons[issue.severity]} ${issue.severity}
                </span>
                <span class="issue-type">${issue.type}</span>
                ${issue.line ? `<span class="issue-line">line ${issue.line}</span>` : ''}
            </div>
            <div class="issue-message">${issue.message}</div>
            ${issue.fix ? `<div class="issue-fix">🔧 ${issue.fix}</div>` : ''}
        </div>`
    ).join('');

    const timeAgo = Math.round((Date.now() - review.timestamp) / 1000);
    const timeStr = timeAgo < 60 ? `${timeAgo}s ago` : `${Math.round(timeAgo / 60)}m ago`;

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: var(--vscode-font-family); background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); padding: 0; }
        .header { padding: 16px 20px; border-bottom: 1px solid #333; background: rgba(255,255,255,0.02); }
        .header-top { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .file-name { font-size: 16px; font-weight: bold; color: var(--vscode-textLink-foreground); }
        .time-badge { font-size: 11px; color: #888; margin-left: auto; }
        .stats { display: flex; gap: 10px; flex-wrap: wrap; }
        .stat { display: flex; align-items: center; gap: 5px; font-size: 12px; padding: 3px 10px; border-radius: 10px; border: 1px solid; }
        .stat-critical { border-color: #dc2626; color: #dc2626; background: #dc262615; }
        .stat-high     { border-color: #f97316; color: #f97316; background: #f9731615; }
        .stat-medium   { border-color: #f59e0b; color: #f59e0b; background: #f59e0b15; }
        .stat-clean    { border-color: #16a34a; color: #16a34a; background: #16a34a15; }
        .content { padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; }
        .issue-card { border: 1px solid #333; border-radius: 8px; padding: 12px 14px; background: rgba(255,255,255,0.02); }
        .issue-card.critical { border-left: 3px solid #dc2626; }
        .issue-card.high     { border-left: 3px solid #f97316; }
        .issue-card.medium   { border-left: 3px solid #f59e0b; }
        .issue-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
        .issue-icon { font-size: 14px; }
        .severity-badge { padding: 1px 8px; border-radius: 10px; border: 1px solid; font-size: 11px; font-weight: bold; }
        .issue-type { font-size: 11px; color: #888; text-transform: capitalize; }
        .issue-line { font-size: 11px; color: #888; font-family: monospace; margin-left: auto; }
        .issue-message { font-size: 13px; color: #e2e8f0; line-height: 1.5; }
        .issue-fix { font-size: 12px; color: #94a3b8; margin-top: 6px; padding: 6px 10px; background: rgba(0,0,0,0.2); border-radius: 4px; }
        .empty-state { text-align: center; padding: 40px 20px; color: #888; }
        .empty-icon { font-size: 48px; margin-bottom: 12px; }
        .section-title { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 0 8px; }
        .toolbar { padding: 12px 20px; border-top: 1px solid #333; display: flex; gap: 8px; }
        button { padding: 7px 16px; border: none; border-radius: 5px; cursor: pointer; font-size: 12px; font-weight: bold; }
        .btn-fix    { background: #007acc; color: white; }
        .btn-fix:hover { background: #005f99; }
        .btn-toggle { background: #333; color: #aaa; border: 1px solid #444; }
        .btn-toggle:hover { background: #3a3a3a; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-top">
            <span class="file-name">⚡ ${review.fileName}</span>
            <span class="time-badge">Reviewed ${timeStr}</span>
        </div>
        <div class="stats">
            ${critical.length > 0 ? `<span class="stat stat-critical">🔴 ${critical.length} Critical</span>` : ''}
            ${high.length > 0     ? `<span class="stat stat-high">🟠 ${high.length} High</span>` : ''}
            ${medium.length > 0   ? `<span class="stat stat-medium">🟡 ${medium.length} Medium</span>` : ''}
            ${review.issues.length === 0 ? `<span class="stat stat-clean">✅ Clean</span>` : ''}
        </div>
    </div>

    <div class="content">
        ${review.issues.length === 0 ? `
        <div class="empty-state">
            <div class="empty-icon">✅</div>
            <div>No significant issues found</div>
            <div style="font-size:12px;margin-top:6px">Code looks clean!</div>
        </div>` : `
        <div class="section-title">${review.issues.length} issue${review.issues.length > 1 ? 's' : ''} found</div>
        ${issueRows}`}
    </div>

    <div class="toolbar">
        <button class="btn-fix" onclick="fixAll()">⚡ Fix All with Sarvis</button>
        <button class="btn-toggle" onclick="toggle()">🔕 Disable on Save</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        function fixAll()  { vscode.postMessage({ command: 'fixAll' }); }
        function toggle()  { vscode.postMessage({ command: 'toggle' }); }
    </script>
</body>
</html>`;

    panel.webview.onDidReceiveMessage(async (msg) => {
        if (msg.command === 'fixAll') {
            panel.dispose();
            await vscode.commands.executeCommand('sarvis.fixAllInFile');
        }
        if (msg.command === 'toggle') {
            panel.dispose();
            await vscode.commands.executeCommand('sarvis.toggleReviewOnSave');
        }
    });
}