import * as vscode from 'vscode';
import * as path from 'path';
import { AiService } from '../services/AiService';
import { LearningService } from '../services/LearningService';
import { SessionMemoryService } from '../services/SessionMemoryService';
import { handleError } from '../utils/errorHandler';
import { requireApiKey } from './requireApiKey';

export function registerPairProgrammerCommand(
    context: vscode.ExtensionContext,
    learningService: LearningService,
    sessionMemory: SessionMemoryService
): void {

    let pairPanel: vscode.WebviewPanel | undefined;

    context.subscriptions.push(
        vscode.commands.registerCommand('sarvis.pairProgrammer', async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) { vscode.window.showWarningMessage('Open a file first.'); return; }
                if (editor.selection.isEmpty) {
                    vscode.window.showWarningMessage('Select code to get pair programming suggestions.');
                    return;
                }

                const apiKey = await requireApiKey(context);
                if (!apiKey) return;

                const selectedCode = editor.document.getText(editor.selection);
                const language = editor.document.languageId;
                const fileName = path.basename(editor.document.fileName);
                const startLine = editor.selection.start.line + 1;

                const actions = [
                    { label: '👁️ Review this code',      value: 'Review this code and suggest improvements' },
                    { label: '⚡ Optimize performance',   value: 'Optimize this code for performance' },
                    { label: '🛡️ Find bugs',              value: 'Find any bugs or issues in this code' },
                    { label: '🧹 Clean up',               value: 'Clean up and simplify this code' },
                    { label: '📝 Explain to me',          value: 'Explain what this code does step by step' },
                    { label: '🔒 Security check',         value: 'Check for security vulnerabilities' },
                    { label: '🧪 How to test this',       value: 'Suggest how to write tests for this code' },
                    { label: '✏️ Custom...',              value: 'custom' },
                ];

                const selected = await vscode.window.showQuickPick(actions, {
                    placeHolder: `Pair program on ${fileName}:${startLine}`
                });
                if (!selected) return;

                let instruction = selected.value;
                if (instruction === 'custom') {
                    const custom = await vscode.window.showInputBox({
                        prompt: 'What do you want your pair programmer to help with?',
                        placeHolder: 'e.g. This loop feels wrong, can you check it?',
                        ignoreFocusOut: true
                    });
                    if (!custom?.trim()) return;
                    instruction = custom.trim();
                }

                // Show panel immediately with loading state
                pairPanel?.dispose();
                pairPanel = vscode.window.createWebviewPanel(
                    'sarvisPairProgrammer',
                    `⚡ Pair: ${fileName}:${startLine}`,
                    { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
                    { enableScripts: true }
                );
                pairPanel.webview.html = getLoadingHtml(selectedCode, language, fileName, startLine, instruction);

                // Fetch AI suggestion
                const result = await AiService.pairProgrammer(
                    apiKey, selectedCode, language, instruction,
                    learningService.buildContextPrompt(),
                    sessionMemory.buildContextPrompt()
                );

                if (!result) {
                    pairPanel.webview.html = getErrorHtml();
                    return;
                }

                pairPanel.webview.html = getResultHtml(result, selectedCode, language, fileName, startLine, instruction);

                // Handle webview messages
                pairPanel.webview.onDidReceiveMessage(async (msg) => {
                    switch (msg.command) {
                        case 'accept': {
                            const edit = new vscode.WorkspaceEdit();
                            edit.replace(editor.document.uri, editor.selection, msg.code);
                            await vscode.workspace.applyEdit(edit);
                            vscode.window.setStatusBarMessage('⚡ Pair programmer suggestion applied', 3000);
                            pairPanel?.dispose();
                            break;
                        }
                        case 'reject': {
                            pairPanel?.dispose();
                            vscode.window.setStatusBarMessage('Suggestion rejected', 2000);
                            break;
                        }
                        case 'followup': {
                            if (!msg.text?.trim()) return;
                            pairPanel!.webview.html = getLoadingHtml(
                                msg.currentCode ?? selectedCode, language, fileName, startLine, msg.text
                            );
                            const followupResult = await AiService.pairProgrammer(
                                apiKey,
                                msg.currentCode ?? selectedCode,
                                language, msg.text,
                                learningService.buildContextPrompt(),
                                sessionMemory.buildContextPrompt()
                            );
                            if (!followupResult) {
                                pairPanel!.webview.html = getErrorHtml();
                                return;
                            }
                            pairPanel!.webview.html = getResultHtml(
                                followupResult, msg.currentCode ?? selectedCode,
                                language, fileName, startLine, msg.text
                            );
                            break;
                        }
                        case 'copyCode': {
                            await vscode.env.clipboard.writeText(msg.code);
                            vscode.window.setStatusBarMessage('📋 Code copied', 2000);
                            break;
                        }
                    }
                });

            } catch (err) { handleError(err, 'pairProgrammer'); }
        })
    );
}

// ─── HTML helpers ──────────────────────────────────────────────────────────────

function getLoadingHtml(code: string, language: string, fileName: string, line: number, instruction: string): string {
    return `<!DOCTYPE html>
<html>
<head>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: var(--vscode-font-family); background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); height: 100vh; display: flex; flex-direction: column; }
        .header { padding: 14px 18px; border-bottom: 1px solid #333; background: rgba(255,255,255,0.02); display: flex; align-items: center; gap: 10px; }
        .avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #007acc, #7c3aed); display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
        .header-info { flex: 1; }
        .header-title { font-weight: bold; font-size: 13px; color: var(--vscode-textLink-foreground); }
        .header-sub { font-size: 11px; color: #888; margin-top: 2px; }
        .code-section { padding: 14px 18px; border-bottom: 1px solid #2a2a2a; background: rgba(0,0,0,0.15); }
        .code-label { font-size: 11px; color: #888; margin-bottom: 6px; font-family: monospace; }
        pre { background: rgba(0,0,0,0.3); padding: 10px 12px; border-radius: 6px; font-size: 12px; overflow-x: auto; border-left: 3px solid #007acc; max-height: 150px; overflow-y: auto; }
        code { font-family: monospace; color: #9cdcfe; }
        .loading { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; }
        .loading-dots { display: flex; gap: 6px; }
        .dot { width: 8px; height: 8px; border-radius: 50%; background: #007acc; animation: bounce 1.2s infinite; }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-10px); } }
        .loading-text { color: #888; font-size: 13px; }
        .instruction-pill { background: rgba(0,120,200,0.15); border: 1px solid #007acc; padding: 4px 12px; border-radius: 12px; font-size: 12px; color: #7cc5f4; }
    </style>
</head>
<body>
    <div class="header">
        <div class="avatar">⚡</div>
        <div class="header-info">
            <div class="header-title">Sarvis Pair Programmer</div>
            <div class="header-sub">${fileName}:${line} · ${language}</div>
        </div>
        <span class="instruction-pill">${instruction.slice(0, 40)}${instruction.length > 40 ? '...' : ''}</span>
    </div>
    <div class="code-section">
        <div class="code-label">📌 Selected code</div>
        <pre><code>${code.slice(0, 300).replace(/</g, '&lt;').replace(/>/g, '&gt;')}${code.length > 300 ? '\n...' : ''}</code></pre>
    </div>
    <div class="loading">
        <div class="loading-dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
        <div class="loading-text">Your pair programmer is thinking...</div>
    </div>
</body>
</html>`;
}

function getErrorHtml(): string {
    return `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: var(--vscode-font-family); background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); display: flex; align-items: center; justify-content: center; height: 100vh; }
        .error { text-align: center; }
        .error-icon { font-size: 48px; margin-bottom: 16px; }
        .error-text { color: #dc2626; font-size: 14px; }
        .error-sub { color: #888; font-size: 12px; margin-top: 8px; }
    </style>
</head>
<body>
    <div class="error">
        <div class="error-icon">⚠️</div>
        <div class="error-text">Could not get a suggestion</div>
        <div class="error-sub">Check your API key and try again</div>
    </div>
</body>
</html>`;
}

function getResultHtml(
    result: { suggestion: string; explanation: string; improvedCode: string },
    originalCode: string,
    language: string,
    fileName: string,
    line: number,
    instruction: string
): string {
    const escapedCode = result.improvedCode
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$/g, '\\$');

    const hasChanges = result.improvedCode.trim() !== originalCode.trim();

    return `<!DOCTYPE html>
<html>
<head>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: var(--vscode-font-family); background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
        .header { padding: 12px 18px; border-bottom: 1px solid #333; background: rgba(255,255,255,0.02); display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #007acc, #7c3aed); display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
        .header-info { flex: 1; }
        .header-title { font-weight: bold; font-size: 13px; color: var(--vscode-textLink-foreground); }
        .header-sub { font-size: 11px; color: #888; margin-top: 2px; }
        .content { flex: 1; overflow-y: auto; padding: 16px 18px; display: flex; flex-direction: column; gap: 14px; }
        .suggestion-bubble { background: rgba(0,120,200,0.1); border: 1px solid #007acc; border-radius: 12px 12px 12px 4px; padding: 12px 16px; }
        .bubble-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .bubble-title { font-size: 12px; color: #7cc5f4; font-weight: bold; }
        .suggestion-text { font-size: 14px; font-weight: 500; color: #e2e8f0; line-height: 1.5; }
        .explanation { font-size: 13px; color: #94a3b8; line-height: 1.6; margin-top: 8px; }
        .code-block { background: rgba(0,0,0,0.25); border-radius: 8px; overflow: hidden; border: 1px solid #333; }
        .code-header-bar { padding: 8px 14px; background: rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #333; }
        .code-label { font-size: 11px; color: #888; font-family: monospace; }
        .copy-btn { background: none; border: 1px solid #555; color: #aaa; padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; }
        .copy-btn:hover { background: rgba(255,255,255,0.06); }
        pre { padding: 12px 14px; font-size: 12px; overflow-x: auto; max-height: 250px; overflow-y: auto; }
        code { font-family: monospace; color: #9cdcfe; }
        .no-changes { text-align: center; padding: 12px; color: #888; font-size: 13px; }
        .action-bar { padding: 12px 18px; border-top: 1px solid #333; display: flex; gap: 8px; flex-shrink: 0; background: var(--vscode-editor-background); }
        .btn { padding: 8px 18px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; flex: 1; }
        .btn-accept { background: #16a34a; color: white; }
        .btn-accept:hover { background: #15803d; }
        .btn-accept:disabled { background: #2a4a2a; color: #666; cursor: not-allowed; }
        .btn-reject { background: #444; color: #ccc; }
        .btn-reject:hover { background: #555; }
        .followup-bar { padding: 10px 18px; border-top: 1px solid #2a2a2a; display: flex; gap: 8px; flex-shrink: 0; }
        .followup-input { flex: 1; background: rgba(255,255,255,0.06); border: 1px solid #444; border-radius: 6px; padding: 7px 12px; color: var(--vscode-editor-foreground); font-size: 13px; font-family: var(--vscode-font-family); }
        .followup-input:focus { outline: none; border-color: #007acc; }
        .followup-input::placeholder { color: #555; }
        .btn-ask { background: #007acc; color: white; border: none; border-radius: 6px; padding: 7px 14px; cursor: pointer; font-size: 13px; font-weight: bold; white-space: nowrap; }
        .btn-ask:hover { background: #005f99; }
        .quick-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: -4px; padding: 0 18px 10px; }
        .quick-btn { background: rgba(255,255,255,0.04); border: 1px solid #333; border-radius: 12px; padding: 3px 10px; font-size: 11px; color: #aaa; cursor: pointer; white-space: nowrap; }
        .quick-btn:hover { background: rgba(255,255,255,0.08); border-color: #007acc; color: #7cc5f4; }
    </style>
</head>
<body>
    <div class="header">
        <div class="avatar">⚡</div>
        <div class="header-info">
            <div class="header-title">Sarvis Pair Programmer</div>
            <div class="header-sub">${fileName}:${line} · ${language}</div>
        </div>
    </div>

    <div class="content">
        <div class="suggestion-bubble">
            <div class="bubble-header">
                <span style="font-size:16px">💡</span>
                <span class="bubble-title">SUGGESTION</span>
            </div>
            <div class="suggestion-text">${result.suggestion}</div>
            <div class="explanation">${result.explanation}</div>
        </div>

        ${hasChanges ? `
        <div class="code-block">
            <div class="code-header-bar">
                <span class="code-label">✨ Improved code</span>
                <button class="copy-btn" onclick="copyCode()">📋 Copy</button>
            </div>
            <pre><code>${result.improvedCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
        </div>` : `
        <div class="no-changes">✅ Code looks good as-is — no changes needed</div>`}
    </div>

    <div class="quick-actions">
        <button class="quick-btn" onclick="askFollowup('Why is this better?')">Why is this better?</button>
        <button class="quick-btn" onclick="askFollowup('Show me an alternative approach')">Alternative?</button>
        <button class="quick-btn" onclick="askFollowup('What are the tradeoffs?')">Tradeoffs?</button>
        <button class="quick-btn" onclick="askFollowup('How do I test this?')">How to test?</button>
    </div>

    <div class="followup-bar">
        <input class="followup-input" id="followupInput" placeholder="Ask a follow-up question..."
            onkeydown="if(event.key==='Enter') sendFollowup()"/>
        <button class="btn-ask" onclick="sendFollowup()">Ask</button>
    </div>

    <div class="action-bar">
        ${hasChanges ? `
        <button class="btn btn-accept" onclick="accept()">✅ Apply</button>` : `
        <button class="btn btn-accept" disabled>✅ No changes</button>`}
        <button class="btn btn-reject" onclick="reject()">✗ Dismiss</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const improvedCode = \`${escapedCode}\`;

        function accept() { vscode.postMessage({ command: 'accept', code: improvedCode }); }
        function reject() { vscode.postMessage({ command: 'reject' }); }
        function copyCode() {
            navigator.clipboard.writeText(improvedCode).then(() => {
                document.querySelector('.copy-btn').textContent = '✅';
                setTimeout(() => document.querySelector('.copy-btn').textContent = '📋 Copy', 2000);
            });
            vscode.postMessage({ command: 'copyCode', code: improvedCode });
        }
        function sendFollowup() {
            const input = document.getElementById('followupInput');
            const text = input.value.trim();
            if (!text) return;
            input.value = '';
            vscode.postMessage({ command: 'followup', text, currentCode: improvedCode });
        }
        function askFollowup(text) {
            vscode.postMessage({ command: 'followup', text, currentCode: improvedCode });
        }
        document.getElementById('followupInput').focus();
    </script>
</body>
</html>`;
}