import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as http from 'http';
import { AiService } from '../services/AiService';
import { SessionMemoryService } from '../services/SessionMemoryService';
import { LearningService } from '../services/LearningService';
import { handleError } from '../utils/errorHandler';
import { requireApiKey } from './requireApiKey';

const VOICE_SERVER_PORT = 27834;

export function registerVoiceCommands(
    context: vscode.ExtensionContext,
    sessionMemory: SessionMemoryService,
    learningService: LearningService
): void {

    context.subscriptions.push(
        vscode.commands.registerCommand('sarvis.voiceCommand', async () => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;

                showVoiceCommandPanel(context, async (transcript: string) => {
                    await handleVoiceCommand(transcript, context, apiKey, learningService);
                });
            } catch (err) { handleError(err, 'voiceCommand'); }
        })
    );
}

// ─── Voice panel ───────────────────────────────────────────────────────────────

function showVoiceCommandPanel(
    context: vscode.ExtensionContext,
    onCommand: (transcript: string) => Promise<void>
): void {
    const htmlPath = path.join(os.tmpdir(), 'sarvis-voice.html');

    let server: http.Server | null = null;

    server = http.createServer((req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

        if (req.method === 'POST' && req.url === '/command') {
            let body = '';
            req.on('data', (chunk: Buffer) => body += chunk.toString());
            req.on('end', () => {
                try {
                    const { transcript } = JSON.parse(body);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: true }));
                    server?.close();
                    if (transcript?.trim()) onCommand(transcript.trim());
                } catch {
                    res.writeHead(400); res.end('Bad Request');
                }
            });
            return;
        }

        if (req.method === 'GET' && req.url === '/ping') { res.writeHead(200); res.end('ok'); return; }
        res.writeHead(404); res.end();
    });

    server.listen(VOICE_SERVER_PORT, '127.0.0.1', () => {
        const html = buildVoiceHtml(VOICE_SERVER_PORT);
        fs.writeFileSync(htmlPath, html);

        const open = (url: string) => {
            const cmd = process.platform === 'win32' ? `start "" "${url}"` :
                process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
            require('child_process').exec(cmd);
        };

        open(htmlPath);
        vscode.window.setStatusBarMessage('🎙️ Sarvis Voice: Browser opened — speak your command', 6000);
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
            vscode.window.showErrorMessage('Port 27834 in use. Close other Sarvis voice windows and try again.');
        }
    });

    // Auto-close server after 60 seconds
    setTimeout(() => { try { server?.close(); } catch { /* already closed */ } }, 60000);
}

// ─── Command dispatch ──────────────────────────────────────────────────────────

const COMMAND_MAP: Array<{ keywords: string[]; command: string; label: string }> = [
    { keywords: ['fix bug', 'fix this bug', 'debug', 'fix error'],           command: 'sarvis.debugError',              label: 'Debug Error' },
    { keywords: ['explain', 'explain code', 'explain this', 'what does this do'], command: 'sarvis.explainCode',         label: 'Explain Code' },
    { keywords: ['generate test', 'write test', 'create test', 'add test'],   command: 'sarvis.generateTests',           label: 'Generate Tests' },
    { keywords: ['review file', 'review code', 'review this'],                command: 'sarvis.reviewFile',              label: 'Review File' },
    { keywords: ['security scan', 'security check', 'find vulnerability'],    command: 'sarvis.scanSecurityFile',        label: 'Security Scan' },
    { keywords: ['performance', 'optimize', 'analyze performance'],           command: 'sarvis.analyzePerformanceFile',  label: 'Performance Analysis' },
    { keywords: ['dead code', 'unused code', 'find dead'],                    command: 'sarvis.findDeadCodeFile',        label: 'Find Dead Code' },
    { keywords: ['todo', 'show todos', 'find todos', 'scan todos'],           command: 'sarvis.scanTodosFile',           label: 'Scan TODOs' },
    { keywords: ['commit message', 'generate commit', 'write commit'],        command: 'sarvis.gitCommitMessage',        label: 'Generate Commit' },
    { keywords: ['run test', 'run tests', 'test'],                            command: 'sarvis.runTests',                label: 'Run Tests' },
    { keywords: ['complexity', 'complexity map', 'code map'],                 command: 'sarvis.complexityMap',           label: 'Complexity Map' },
    { keywords: ['health', 'dashboard', 'health dashboard', 'workspace health'], command: 'sarvis.healthDashboard',      label: 'Health Dashboard' },
    { keywords: ['standup', 'generate standup', 'daily standup'],             command: 'sarvis.generateStandup',         label: 'Generate Standup' },
    { keywords: ['refactor', 'refactor file', 'improve code'],                command: 'sarvis.refactorFile',            label: 'Refactor File' },
    { keywords: ['jsdoc', 'add comments', 'document code'],                   command: 'sarvis.addJsDocs',               label: 'Add JSDoc' },
    { keywords: ['readme', 'generate readme', 'create readme'],               command: 'sarvis.generateReadme',          label: 'Generate README' },
    { keywords: ['changelog', 'generate changelog'],                          command: 'sarvis.generateChangelog',       label: 'Generate Changelog' },
    { keywords: ['smart snippet', 'insert snippet', 'snippet'],               command: 'sarvis.insertSmartSnippet',      label: 'Smart Snippet' },
    { keywords: ['pull request', 'create pr', 'generate pr'],                 command: 'sarvis.createPR',                label: 'Create PR' },
    { keywords: ['migrate', 'migration'],                                     command: 'sarvis.migrateCode',             label: 'Migrate Code' },
    { keywords: ['diagram', 'architecture diagram', 'generate diagram'],      command: 'sarvis.generateDiagram',         label: 'Generate Diagram' },
    { keywords: ['code smell', 'smell', 'detect smells'],                     command: 'sarvis.detectSmellsFile',        label: 'Detect Code Smells' },
    { keywords: ['pair program', 'pair programmer', 'pair'],                  command: 'sarvis.pairProgrammer',          label: 'Pair Programmer' },
    { keywords: ['fix all', 'fix problems', 'auto fix'],                      command: 'sarvis.fixAllInFile',            label: 'Fix All Problems' },
    { keywords: ['generate code', 'write code', 'create code'],               command: 'sarvis.generateCode',            label: 'Generate Code' },
    { keywords: ['add error handling', 'error handling', 'add try catch'],    command: 'sarvis.editCodeWithPrompt',      label: 'Edit Code' },
];

// Commands that work best when the full file is selected
const NEEDS_SELECTION = new Set([
    'sarvis.explainCode', 'sarvis.debugError', 'sarvis.reviewFile',
    'sarvis.scanSecurityFile', 'sarvis.analyzePerformanceFile',
    'sarvis.findDeadCodeFile', 'sarvis.scanTodosFile',
    'sarvis.detectSmellsFile', 'sarvis.pairProgrammer',
]);

async function handleVoiceCommand(
    transcript: string,
    context: vscode.ExtensionContext,
    apiKey: string,
    learningService: LearningService
): Promise<void> {
    const text = transcript.toLowerCase().trim();
    vscode.window.setStatusBarMessage(`🎙️ "${transcript}"`, 3000);

    // Find best match by longest keyword match
    let bestMatch: typeof COMMAND_MAP[0] | null = null;
    let bestScore = 0;

    for (const entry of COMMAND_MAP) {
        for (const keyword of entry.keywords) {
            if (text.includes(keyword) && keyword.length > bestScore) {
                bestScore = keyword.length;
                bestMatch = entry;
            }
        }
    }

    if (bestMatch) {
        vscode.window.showInformationMessage(`🎙️ Sarvis: Running "${bestMatch.label}"`, { modal: false });

        // Auto-select entire file for commands that need selection
        if (NEEDS_SELECTION.has(bestMatch.command)) {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.selection.isEmpty) {
                const doc = editor.document;
                const fullRange = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
                editor.selection = new vscode.Selection(fullRange.start, fullRange.end);
            }
        }

        await vscode.commands.executeCommand(bestMatch.command);
        return;
    }

    // No direct match — ask AI to interpret
    const interpreted = await interpretVoiceCommand(apiKey, transcript);
    if (interpreted) {
        const matched = COMMAND_MAP.find(c => c.command === interpreted);
        if (matched) {
            vscode.window.showInformationMessage(`🎙️ Sarvis: Running "${matched.label}"`);
            await vscode.commands.executeCommand(matched.command);
            return;
        }
    }

    // Final fallback — open chat
    vscode.window.showInformationMessage(`🎙️ Sarvis heard: "${transcript}"\nOpening chat...`);
    vscode.commands.executeCommand('sarvis.sidebar.focus');
}

async function interpretVoiceCommand(apiKey: string, transcript: string): Promise<string | null> {
    try {
        const commandList = COMMAND_MAP.map(c => c.command).join('\n');
        const raw = await AiService.chat(
            apiKey,
            `Map this voice command to exactly one VS Code command ID from this list.
Return ONLY the command ID, nothing else.

Voice command: "${transcript}"

Available commands:
${commandList}

Return only one command ID from the list above, exactly as written.`,
            '', []
        );
        return COMMAND_MAP.find(c => raw?.includes(c.command))?.command ?? null;
    } catch { return null; }
}

// ─── Voice HTML ────────────────────────────────────────────────────────────────

function buildVoiceHtml(port: number): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Sarvis Voice Command</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #1e1e1e; color: #e2e8f0; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; padding: 24px; }
        h1 { font-size: 20px; color: #7cc5f4; }
        p { font-size: 13px; color: #888; text-align: center; }
        .mic-btn { width: 100px; height: 100px; border-radius: 50%; border: none; cursor: pointer; font-size: 40px; background: linear-gradient(135deg, #007acc, #7c3aed); box-shadow: 0 4px 20px rgba(0,120,200,0.4); transition: all 0.2s; }
        .mic-btn:hover { transform: scale(1.05); }
        .mic-btn.listening { background: linear-gradient(135deg, #dc2626, #f97316); animation: pulse 1.2s infinite; }
        .mic-btn.done { background: linear-gradient(135deg, #16a34a, #0891b2); }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        .status { font-size: 15px; color: #94a3b8; min-height: 24px; text-align: center; }
        .status.listening { color: #f87171; font-weight: bold; }
        .status.done { color: #4ade80; font-weight: bold; }
        .transcript { width: 100%; max-width: 400px; min-height: 60px; background: rgba(255,255,255,0.05); border: 1px solid #444; border-radius: 10px; padding: 14px; font-size: 16px; text-align: center; color: #fff; }
        .chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; max-width: 420px; }
        .chip { background: rgba(255,255,255,0.06); border: 1px solid #444; border-radius: 20px; padding: 6px 14px; font-size: 12px; color: #aaa; cursor: pointer; transition: all 0.15s; }
        .chip:hover { background: rgba(0,120,200,0.2); border-color: #007acc; color: #7cc5f4; }
        .text-row { display: flex; gap: 8px; width: 100%; max-width: 400px; }
        .text-input { flex: 1; background: rgba(255,255,255,0.06); border: 1px solid #444; border-radius: 8px; padding: 10px 14px; color: #fff; font-size: 14px; outline: none; }
        .text-input:focus { border-color: #007acc; }
        .send-btn { background: #007acc; border: none; border-radius: 8px; padding: 10px 18px; color: white; font-weight: bold; cursor: pointer; font-size: 13px; }
        .send-btn:hover { background: #005f99; }
        .hint { font-size: 11px; color: #555; }
    </style>
</head>
<body>
    <h1>🎙️ Sarvis Voice Commands</h1>
    <p>Click mic and speak, or type a command below</p>

    <button class="mic-btn" id="micBtn" onclick="toggleMic()">🎙️</button>
    <div class="status" id="status">Click mic to start listening</div>
    <div class="transcript" id="transcript" style="color:#555;font-style:italic">Your words will appear here...</div>

    <div class="text-row">
        <input class="text-input" id="textInput" placeholder="Or type: fix this bug, run tests..."
            onkeydown="if(event.key==='Enter') sendText()"/>
        <button class="send-btn" onclick="sendText()">Send</button>
    </div>

    <div style="font-size:11px;color:#666;text-align:center">💬 Try saying...</div>
    <div class="chips">
        <div class="chip" onclick="sendCommand('fix this bug')">fix this bug</div>
        <div class="chip" onclick="sendCommand('explain this code')">explain this code</div>
        <div class="chip" onclick="sendCommand('generate tests')">generate tests</div>
        <div class="chip" onclick="sendCommand('review this file')">review this file</div>
        <div class="chip" onclick="sendCommand('security scan')">security scan</div>
        <div class="chip" onclick="sendCommand('run tests')">run tests</div>
        <div class="chip" onclick="sendCommand('health dashboard')">health dashboard</div>
        <div class="chip" onclick="sendCommand('generate commit')">generate commit</div>
        <div class="chip" onclick="sendCommand('complexity map')">complexity map</div>
        <div class="chip" onclick="sendCommand('generate standup')">generate standup</div>
        <div class="chip" onclick="sendCommand('find dead code')">find dead code</div>
        <div class="chip" onclick="sendCommand('generate changelog')">generate changelog</div>
    </div>

    <div class="hint">This window will close automatically after sending</div>

    <script>
        let recognition = null;
        let isListening = false;

        function initRecognition() {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SR) {
                document.getElementById('status').textContent = '⚠️ Use text input — mic not available';
                return null;
            }
            const r = new SR();
            r.continuous = false;
            r.interimResults = true;
            r.lang = 'en-US';
            r.onstart = () => {
                isListening = true;
                document.getElementById('micBtn').className = 'mic-btn listening';
                document.getElementById('micBtn').textContent = '🔴';
                document.getElementById('status').className = 'status listening';
                document.getElementById('status').textContent = '🔴 Listening... speak now';
                document.getElementById('transcript').style.color = '#888';
                document.getElementById('transcript').style.fontStyle = 'normal';
            };
            r.onresult = (event) => {
                let interim = '', final = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const t = event.results[i][0].transcript;
                    if (event.results[i].isFinal) final += t; else interim += t;
                }
                const text = final || interim;
                document.getElementById('transcript').textContent = text;
                document.getElementById('transcript').style.color = final ? '#fff' : '#888';
                if (final) sendCommand(final.trim());
            };
            r.onerror = (e) => {
                document.getElementById('status').textContent = e.error === 'not-allowed'
                    ? '❌ Mic blocked — use text input below'
                    : '⚠️ Error: ' + e.error + ' — use text input';
                document.getElementById('status').className = 'status';
                resetMic();
            };
            r.onend = () => { if (isListening) resetMic(); };
            return r;
        }

        function toggleMic() {
            if (!recognition) recognition = initRecognition();
            if (!recognition) return;
            if (isListening) { recognition.stop(); resetMic(); }
            else { try { recognition.start(); } catch { recognition = initRecognition(); if (recognition) recognition.start(); } }
        }

        function resetMic() {
            isListening = false;
            document.getElementById('micBtn').className = 'mic-btn';
            document.getElementById('micBtn').textContent = '🎙️';
            document.getElementById('status').className = 'status';
            document.getElementById('status').textContent = 'Click mic to start listening';
        }

        function sendText() {
            const val = document.getElementById('textInput').value.trim();
            if (val) sendCommand(val);
        }

        function sendCommand(text) {
            document.getElementById('transcript').textContent = text;
            document.getElementById('transcript').style.color = '#4ade80';
            document.getElementById('status').className = 'status done';
            document.getElementById('status').textContent = '⚡ Sending to Sarvis...';
            document.getElementById('micBtn').className = 'mic-btn done';
            document.getElementById('micBtn').textContent = '✅';

            fetch('http://127.0.0.1:${port}/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript: text })
            }).then(() => {
                document.getElementById('status').textContent = '✅ Command sent! This window will close.';
                setTimeout(() => window.close(), 1500);
            }).catch(() => {
                document.getElementById('status').textContent = '❌ Could not reach Sarvis. Is VS Code open?';
                document.getElementById('status').className = 'status';
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && document.activeElement === document.body) {
                e.preventDefault(); toggleMic();
            }
        });

        window.onload = () => {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SR) document.getElementById('textInput').focus();
        };
    </script>
</body>
</html>`;
}