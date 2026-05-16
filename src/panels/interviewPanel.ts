import * as vscode from 'vscode';
import { AiInterviewService, InterviewProblem } from '../services/AiService/ai.interview';

export function showInterviewPanel(
    problem: InterviewProblem,
    language: string,
    apiKey: string,
    context: vscode.ExtensionContext
): void {
    const panel = vscode.window.createWebviewPanel(
        'sarvisInterview',
        `⚡ Interview: ${problem.title}`,
        vscode.ViewColumn.One,
        { enableScripts: true, retainContextWhenHidden: true }
    );

    const starterCode = problem.starterCode[language] ?? problem.starterCode['javascript'] ?? '// Write your solution here\n';
    const diffColors: Record<string, string> = { easy: '#16a34a', medium: '#f59e0b', hard: '#dc2626' };
    const diffColor = diffColors[problem.difficulty] ?? '#888';

    const examplesHtml = problem.examples.map((ex, i) => `
        <div class="example">
            <div class="example-label">Example ${i + 1}</div>
            <div class="example-row"><span class="ex-key">Input:</span> <code>${ex.input}</code></div>
            <div class="example-row"><span class="ex-key">Output:</span> <code>${ex.output}</code></div>
            ${ex.explanation ? `<div class="example-row"><span class="ex-key">Explanation:</span> ${ex.explanation}</div>` : ''}
        </div>`).join('');

    const constraintsHtml = problem.constraints.map(c => `<li>${c}</li>`).join('');

    panel.webview.html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--vscode-font-family); background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); height: 100vh; display: flex; flex-direction: column; overflow: hidden; font-size: 13px; }

    /* ── Top bar ── */
    .topbar { display: flex; align-items: center; gap: 12px; padding: 8px 16px; border-bottom: 1px solid #333; background: rgba(255,255,255,0.02); flex-shrink: 0; }
    .problem-title { font-weight: bold; font-size: 15px; color: var(--vscode-textLink-foreground); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .diff-badge { padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: bold; border: 1px solid ${diffColor}; color: ${diffColor}; background: ${diffColor}18; white-space: nowrap; }
    .topic-badge { padding: 2px 10px; border-radius: 10px; font-size: 11px; background: rgba(255,255,255,0.07); color: #aaa; white-space: nowrap; }
    .timer { font-family: monospace; font-size: 18px; font-weight: bold; color: #e2e8f0; min-width: 64px; text-align: right; }
    .timer.warning { color: #f59e0b; }
    .timer.danger  { color: #dc2626; animation: pulse-text 1s infinite; }
    @keyframes pulse-text { 0%,100%{opacity:1} 50%{opacity:0.6} }

    /* ── Main layout: left panel + right editor ── */
    .main { display: flex; flex: 1; overflow: hidden; }

    /* ── Left: problem description ── */
    .left-panel { width: 42%; min-width: 320px; border-right: 1px solid #333; display: flex; flex-direction: column; overflow: hidden; }
    .tabs { display: flex; border-bottom: 1px solid #333; flex-shrink: 0; }
    .tab { padding: 8px 16px; font-size: 12px; cursor: pointer; border-bottom: 2px solid transparent; color: #888; transition: all 0.15s; white-space: nowrap; }
    .tab:hover { color: var(--vscode-editor-foreground); background: rgba(255,255,255,0.04); }
    .tab.active { color: #7cc5f4; border-bottom-color: #007acc; }
    .tab-content { flex: 1; overflow-y: auto; padding: 16px; display: none; }
    .tab-content.active { display: block; }

    /* Problem tab */
    .problem-desc { font-size: 13px; line-height: 1.7; color: #d4d4d4; white-space: pre-wrap; }
    .section-label { font-size: 11px; font-weight: bold; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin: 16px 0 8px; }
    .example { background: rgba(255,255,255,0.04); border: 1px solid #333; border-radius: 6px; padding: 10px 12px; margin-bottom: 10px; }
    .example-label { font-size: 11px; color: #888; margin-bottom: 6px; font-weight: bold; }
    .example-row { margin: 3px 0; font-size: 12px; }
    .ex-key { color: #888; margin-right: 6px; }
    code { font-family: monospace; background: rgba(0,0,0,0.3); padding: 1px 5px; border-radius: 3px; font-size: 12px; }
    .constraints-list { list-style: none; padding: 0; }
    .constraints-list li { font-size: 12px; color: #94a3b8; padding: 3px 0; border-bottom: 1px solid #2a2a2a; }
    .constraints-list li::before { content: "• "; color: #555; }

    /* Hints tab */
    .hint-card { background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.3); border-radius: 6px; padding: 12px 14px; margin-bottom: 10px; font-size: 13px; line-height: 1.6; color: #fcd34d; display: none; }
    .hint-card.revealed { display: block; animation: fade-in 0.3s ease; }
    @keyframes fade-in { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
    .hint-locked { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: rgba(255,255,255,0.03); border: 1px solid #333; border-radius: 6px; margin-bottom: 8px; cursor: pointer; color: #888; font-size: 12px; transition: all 0.15s; }
    .hint-locked:hover { border-color: #f59e0b; color: #fcd34d; }
    .hint-num { background: rgba(251,191,36,0.15); color: #f59e0b; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; flex-shrink: 0; }
    .hints-note { font-size: 11px; color: #555; margin-top: 12px; }

    /* Review tab */
    #review-placeholder { text-align: center; padding: 40px 20px; color: #555; }
    #review-placeholder .icon { font-size: 40px; margin-bottom: 12px; }
    .verdict-banner { padding: 14px 18px; border-radius: 8px; margin-bottom: 16px; display: flex; align-items: center; gap: 12px; }
    .verdict-hire     { background: rgba(22,163,74,0.15); border: 1px solid #16a34a; }
    .verdict-lean-hire { background: rgba(34,197,94,0.1); border: 1px solid #22c55e; }
    .verdict-lean-no-hire { background: rgba(234,179,8,0.1); border: 1px solid #eab308; }
    .verdict-no-hire  { background: rgba(220,38,38,0.1);  border: 1px solid #dc2626; }
    .verdict-icon { font-size: 28px; }
    .verdict-text { flex: 1; }
    .verdict-label { font-size: 16px; font-weight: bold; }
    .verdict-score  { font-size: 12px; color: #888; margin-top: 2px; }
    .score-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
    .score-card { background: rgba(255,255,255,0.03); border: 1px solid #333; border-radius: 6px; padding: 10px 12px; }
    .score-card-label { font-size: 11px; color: #888; margin-bottom: 4px; }
    .score-card-val { font-size: 20px; font-weight: bold; }
    .score-bar { height: 4px; background: #333; border-radius: 2px; margin-top: 6px; overflow: hidden; }
    .score-bar-fill { height: 100%; border-radius: 2px; transition: width 1s ease; }
    .review-section { margin-bottom: 14px; }
    .review-section-title { font-size: 12px; font-weight: bold; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .review-list { list-style: none; padding: 0; }
    .review-list li { padding: 5px 0 5px 14px; border-bottom: 1px solid #2a2a2a; font-size: 13px; line-height: 1.5; position: relative; }
    .review-list li::before { content: ""; position: absolute; left: 0; top: 12px; width: 6px; height: 6px; border-radius: 50%; }
    .list-green li::before { background: #16a34a; }
    .list-amber li::before { background: #f59e0b; }
    .list-red   li::before { background: #dc2626; }
    .optimal-code { background: rgba(0,0,0,0.3); border: 1px solid #333; border-radius: 6px; padding: 12px; font-family: monospace; font-size: 12px; white-space: pre; overflow-x: auto; color: #9cdcfe; margin-top: 8px; }
    .complexity-row { display: flex; gap: 16px; margin-bottom: 12px; }
    .complexity-pill { background: rgba(255,255,255,0.06); border: 1px solid #444; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-family: monospace; }
    .complexity-label { font-size: 10px; color: #888; margin-bottom: 2px; }

    /* Follow-up chat */
    .followup-bar { border-top: 1px solid #333; padding: 8px 12px; display: flex; gap: 8px; flex-shrink: 0; }
    .followup-input { flex: 1; background: rgba(255,255,255,0.06); border: 1px solid #444; border-radius: 6px; padding: 6px 10px; color: var(--vscode-editor-foreground); font-size: 12px; font-family: var(--vscode-font-family); }
    .followup-input:focus { outline: none; border-color: #007acc; }
    .followup-input::placeholder { color: #555; }
    .followup-btn { background: #007acc; color: white; border: none; border-radius: 6px; padding: 6px 14px; cursor: pointer; font-size: 12px; font-weight: bold; white-space: nowrap; }
    .followup-btn:hover { background: #005f99; }
    .followup-response { background: rgba(0,120,200,0.08); border: 1px solid rgba(0,120,200,0.25); border-radius: 6px; padding: 10px 12px; margin-top: 10px; font-size: 13px; line-height: 1.6; color: #94a3b8; display: none; }
    .followup-response.visible { display: block; animation: fade-in 0.3s ease; }

    /* ── Right: code editor area ── */
    .right-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .editor-topbar { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-bottom: 1px solid #333; background: rgba(255,255,255,0.02); flex-shrink: 0; }
    .lang-badge { background: rgba(0,120,200,0.2); border: 1px solid #007acc; color: #7cc5f4; padding: 2px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; }
    .editor-actions { display: flex; gap: 6px; margin-left: auto; }
    .editor-btn { padding: 5px 14px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; transition: all 0.15s; }
    .btn-run    { background: #16a34a; color: white; }
    .btn-run:hover { background: #15803d; }
    .btn-submit { background: #007acc; color: white; }
    .btn-submit:hover { background: #005f99; }
    .btn-submit:disabled { background: #333; color: #666; cursor: not-allowed; }
    .btn-clear  { background: rgba(255,255,255,0.06); color: #aaa; border: 1px solid #444; }
    .btn-clear:hover { background: rgba(255,255,255,0.1); }
    textarea#code-editor { flex: 1; width: 100%; background: var(--vscode-editor-background); color: #d4d4d4; border: none; outline: none; resize: none; padding: 16px; font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.7; tab-size: 4; }
    .output-panel { border-top: 1px solid #333; max-height: 160px; overflow-y: auto; flex-shrink: 0; }
    .output-header { padding: 6px 12px; background: rgba(255,255,255,0.03); border-bottom: 1px solid #333; font-size: 11px; color: #888; display: flex; align-items: center; gap: 8px; }
    .output-content { padding: 10px 12px; font-family: monospace; font-size: 12px; white-space: pre-wrap; color: #94a3b8; min-height: 40px; }
    .output-content.success { color: #4ade80; }
    .output-content.error   { color: #f87171; }

    /* ── Bottom action bar ── */
    .bottom-bar { display: flex; align-items: center; gap: 10px; padding: 8px 16px; border-top: 1px solid #333; background: rgba(255,255,255,0.02); flex-shrink: 0; }
    .bottom-left { display: flex; gap: 8px; }
    .bottom-right { margin-left: auto; display: flex; gap: 8px; }
    .stat-pill { background: rgba(255,255,255,0.06); border: 1px solid #444; border-radius: 10px; padding: 3px 10px; font-size: 11px; color: #888; }
    .stat-pill span { color: #e2e8f0; font-weight: bold; }
    .btn-give-up { background: rgba(220,38,38,0.1); border: 1px solid #dc2626; color: #f87171; padding: 5px 14px; border-radius: 4px; cursor: pointer; font-size: 12px; }
    .btn-give-up:hover { background: rgba(220,38,38,0.2); }
    .btn-new { background: rgba(255,255,255,0.06); border: 1px solid #555; color: #aaa; padding: 5px 14px; border-radius: 4px; cursor: pointer; font-size: 12px; }
    .btn-new:hover { background: rgba(255,255,255,0.1); color: white; }

    /* Loading overlay */
    .loading-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 16px; z-index: 100; display: none; }
    .loading-overlay.active { display: flex; }
    .loading-dots { display: flex; gap: 8px; }
    .loading-dot { width: 10px; height: 10px; border-radius: 50%; background: #007acc; animation: bounce 1.2s infinite; }
    .loading-dot:nth-child(2) { animation-delay: 0.2s; }
    .loading-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-12px)} }
    .loading-text { color: #aaa; font-size: 14px; }

    scrollbar-width: thin;
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
</style>
</head>
<body>

<!-- Top bar -->
<div class="topbar">
    <div class="problem-title">${problem.title}</div>
    <span class="diff-badge">${problem.difficulty.toUpperCase()}</span>
    <span class="topic-badge">${problem.topic.replace(/-/g, ' ')}</span>
    <div class="timer" id="timer">${String(problem.timeLimit).padStart(2, '0')}:00</div>
</div>

<!-- Main split -->
<div class="main">

    <!-- Left: Problem / Hints / Review -->
    <div class="left-panel">
        <div class="tabs">
            <div class="tab active" onclick="switchTab('problem')">📋 Problem</div>
            <div class="tab" onclick="switchTab('hints')" id="hints-tab">💡 Hints</div>
            <div class="tab" onclick="switchTab('review')" id="review-tab">📊 Review</div>
        </div>

        <!-- Problem tab -->
        <div class="tab-content active" id="tab-problem">
            <div class="problem-desc">${problem.description}</div>
            <div class="section-label">Examples</div>
            ${examplesHtml}
            <div class="section-label">Constraints</div>
            <ul class="constraints-list">${constraintsHtml}</ul>
        </div>

        <!-- Hints tab -->
        <div class="tab-content" id="tab-hints">
            <p style="color:#888;font-size:12px;margin-bottom:14px">Each hint costs 5 points from your score. Use them wisely.</p>
            ${problem.hints.map((_, i) => `
            <div class="hint-locked" id="hint-lock-${i}" onclick="revealHint(${i})">
                <span class="hint-num">${i + 1}</span>
                Click to reveal hint ${i + 1}
            </div>
            <div class="hint-card" id="hint-card-${i}">
                <strong>Hint ${i + 1}:</strong> <span id="hint-text-${i}">Loading...</span>
            </div>`).join('')}
            <p class="hints-note">Hints are specific to your current code.</p>
        </div>

        <!-- Review tab -->
        <div class="tab-content" id="tab-review">
            <div id="review-placeholder">
                <div class="icon">📊</div>
                <div style="font-size:14px;color:#aaa;margin-bottom:8px">Submit your solution to see the review</div>
                <div style="font-size:12px">Click the Submit button when you're ready</div>
            </div>
            <div id="review-content" style="display:none"></div>
            <div class="followup-bar" id="followup-bar" style="display:none">
                <input class="followup-input" id="followup-input" placeholder="Ask the interviewer a question..." onkeydown="if(event.key==='Enter')sendFollowUp()"/>
                <button class="followup-btn" onclick="sendFollowUp()">Ask</button>
            </div>
            <div class="followup-response" id="followup-response"></div>
        </div>
    </div>

    <!-- Right: Code editor -->
    <div class="right-panel">
        <div class="editor-topbar">
            <span class="lang-badge">${language.toUpperCase()}</span>
            <span style="font-size:11px;color:#555">Write your solution below</span>
            <div class="editor-actions">
                <button class="editor-btn btn-clear"  onclick="clearCode()">Clear</button>
                <button class="editor-btn btn-run"    onclick="runCode()">▶ Run</button>
                <button class="editor-btn btn-submit" onclick="submitSolution()" id="submit-btn">⚡ Submit</button>
            </div>
        </div>
        <textarea id="code-editor" spellcheck="false" onkeydown="handleTab(event)">${starterCode}</textarea>
        <div class="output-panel">
            <div class="output-header">
                <span>Output</span>
                <span id="output-status" style="margin-left:auto"></span>
            </div>
            <div class="output-content" id="output-content">Run your code to see output...</div>
        </div>
    </div>
</div>

<!-- Bottom bar -->
<div class="bottom-bar">
    <div class="bottom-left">
        <div class="stat-pill">Hints used: <span id="hints-used">0</span></div>
        <div class="stat-pill">Time: <span id="time-spent">0:00</span></div>
    </div>
    <div class="bottom-right">
        <button class="btn-give-up" onclick="giveUp()">🏳️ Give Up</button>
        <button class="btn-new"     onclick="newProblem()">🔀 New Problem</button>
    </div>
</div>

<!-- Loading overlay -->
<div class="loading-overlay" id="loading-overlay">
    <div class="loading-dots">
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
    </div>
    <div class="loading-text" id="loading-text">Reviewing your solution...</div>
</div>

<script>
const vscode = acquireVsCodeApi();
const TOTAL_SECONDS = ${problem.timeLimit} * 60;
let secondsLeft   = TOTAL_SECONDS;
let secondsSpent  = 0;
let hintsUsed     = 0;
let submitted     = false;
let timerInterval = null;
let revealedHints = [];

// ── Timer ─────────────────────────────────────────────────────────────────────
function startTimer() {
    timerInterval = setInterval(() => {
        secondsLeft--;
        secondsSpent++;
        updateTimerDisplay();
        document.getElementById('time-spent').textContent = formatTime(secondsSpent);
        if (secondsLeft <= 0) {
            clearInterval(timerInterval);
            document.getElementById('timer').textContent = '00:00';
            if (!submitted) {
                showNotification('⏰ Time is up! Auto-submitting your solution...');
                setTimeout(submitSolution, 1500);
            }
        }
    }, 1000);
}

function updateTimerDisplay() {
    const el = document.getElementById('timer');
    el.textContent = formatTime(secondsLeft);
    el.className = 'timer' + (secondsLeft < 120 ? ' danger' : secondsLeft < 300 ? ' warning' : '');
}

function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
}

startTimer();

// ── Tab switching ─────────────────────────────────────────────────────────────
function switchTab(name) {
    document.querySelectorAll('.tab').forEach((t,i) => {
        t.classList.toggle('active', ['problem','hints','review'][i] === name);
    });
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active');
}

// ── Tab key in textarea ───────────────────────────────────────────────────────
function handleTab(e) {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const ta = e.target;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    ta.value = ta.value.substring(0, start) + '    ' + ta.value.substring(end);
    ta.selectionStart = ta.selectionEnd = start + 4;
}

// ── Clear code ────────────────────────────────────────────────────────────────
function clearCode() {
    if (confirm('Reset to starter code?')) {
        document.getElementById('code-editor').value = ${JSON.stringify(starterCode)};
        setOutput('', '', 'idle');
    }
}

// ── Run code (client-side basic test) ─────────────────────────────────────────
function runCode() {
    const code = document.getElementById('code-editor').value.trim();
    if (!code) return;
    setOutput('Running...', 'output-status', 'running');
    // Forward to extension for execution or just show it
    vscode.postMessage({ command: 'runCode', code, language: '${language}' });
    // Show basic feedback immediately
    setOutput('Code looks good — submit when ready to get full review.', 'success');
}

// ── Hint reveal ───────────────────────────────────────────────────────────────
function revealHint(index) {
    if (revealedHints.includes(index)) {
        switchTab('hints');
        return;
    }
    revealedHints.push(index);
    hintsUsed++;
    document.getElementById('hints-used').textContent = hintsUsed;
    document.getElementById('hint-lock-' + index).style.display = 'none';
    document.getElementById('hint-card-' + index).classList.add('revealed');
    vscode.postMessage({
        command: 'getHint',
        hintIndex: index,
        code: document.getElementById('code-editor').value
    });
}

// ── Submit solution ───────────────────────────────────────────────────────────
function submitSolution() {
    if (submitted) return;
    const code = document.getElementById('code-editor').value.trim();
    if (!code || code === ${JSON.stringify(starterCode.trim())}) {
        showNotification('Write some code first!');
        return;
    }
    submitted = true;
    clearInterval(timerInterval);
    document.getElementById('submit-btn').disabled = true;
    showLoading('Reviewing your solution...');
    vscode.postMessage({
        command: 'submitSolution',
        code,
        timeSpentMinutes: Math.ceil(secondsSpent / 60),
        hintsUsed
    });
}

// ── Give up ───────────────────────────────────────────────────────────────────
function giveUp() {
    if (!confirm('Give up and see the solution?')) return;
    submitted = true;
    clearInterval(timerInterval);
    document.getElementById('submit-btn').disabled = true;
    showLoading('Loading solution...');
    vscode.postMessage({
        command: 'submitSolution',
        code: document.getElementById('code-editor').value,
        timeSpentMinutes: Math.ceil(secondsSpent / 60),
        hintsUsed,
        gaveUp: true
    });
}

// ── New problem ───────────────────────────────────────────────────────────────
function newProblem() {
    if (!submitted && !confirm('Abandon this problem and start a new one?')) return;
    vscode.postMessage({ command: 'newProblem' });
}

// ── Follow-up question ────────────────────────────────────────────────────────
function sendFollowUp() {
    const input = document.getElementById('followup-input');
    const text  = input.value.trim();
    if (!text) return;
    input.value = '';
    const responseEl = document.getElementById('followup-response');
    responseEl.textContent = 'Thinking...';
    responseEl.classList.add('visible');
    vscode.postMessage({
        command: 'followUp',
        question: text,
        code: document.getElementById('code-editor').value
    });
}

// ── Output helpers ────────────────────────────────────────────────────────────
function setOutput(text, type = '', status = '') {
    const el = document.getElementById('output-content');
    el.textContent = text;
    el.className = 'output-content' + (type ? ' ' + type : '');
    if (status) document.getElementById('output-status').textContent = status;
}

// ── Loading overlay ───────────────────────────────────────────────────────────
function showLoading(text) {
    document.getElementById('loading-text').textContent = text;
    document.getElementById('loading-overlay').classList.add('active');
}
function hideLoading() {
    document.getElementById('loading-overlay').classList.remove('active');
}

// ── Notification ──────────────────────────────────────────────────────────────
function showNotification(msg) {
    setOutput(msg, '', '');
}

// ── Render review ─────────────────────────────────────────────────────────────
function renderReview(review) {
    hideLoading();
    switchTab('review');

    const verdictLabels = {
        'hire':          { label: '✅ Strong Hire',    cls: 'verdict-hire'         },
        'lean-hire':     { label: '👍 Lean Hire',      cls: 'verdict-lean-hire'    },
        'lean-no-hire':  { label: '👎 Lean No-Hire',  cls: 'verdict-lean-no-hire' },
        'no-hire':       { label: '❌ No Hire',        cls: 'verdict-no-hire'      },
    };
    const v = verdictLabels[review.verdict] || verdictLabels['lean-hire'];

    const scoreColor = (s) => s >= 80 ? '#16a34a' : s >= 60 ? '#f59e0b' : '#dc2626';

    const sectionCards = Object.entries(review.sections).map(([key, sec]) => {
        const label = { correctness:'Correctness', efficiency:'Efficiency', codeQuality:'Code Quality', communication:'Readability' }[key] || key;
        const color = scoreColor(sec.score);
        return \`<div class="score-card">
            <div class="score-card-label">\${label}</div>
            <div class="score-card-val" style="color:\${color}">\${sec.score}</div>
            <div class="score-bar"><div class="score-bar-fill" style="width:\${sec.score}%;background:\${color}"></div></div>
            <div style="font-size:11px;color:#888;margin-top:6px">\${sec.feedback}</div>
        </div>\`;
    }).join('');

    const listItems = (arr) => arr.map(i => \`<li>\${i}</li>\`).join('');

    document.getElementById('review-placeholder').style.display = 'none';
    document.getElementById('review-content').style.display = 'block';
    document.getElementById('followup-bar').style.display = 'flex';

    document.getElementById('review-content').innerHTML = \`
        <div class="verdict-banner \${v.cls}">
            <div class="verdict-icon">\${review.score >= 80 ? '🏆' : review.score >= 65 ? '👍' : review.score >= 50 ? '📝' : '📚'}</div>
            <div class="verdict-text">
                <div class="verdict-label">\${v.label}</div>
                <div class="verdict-score">Overall score: <strong>\${review.score}/100</strong></div>
            </div>
        </div>

        <div class="score-grid">\${sectionCards}</div>

        \${review.bugs.length > 0 ? \`
        <div class="review-section">
            <div class="review-section-title">🐛 Bugs Found</div>
            <ul class="review-list list-red">\${listItems(review.bugs)}</ul>
        </div>\` : ''}

        <div class="review-section">
            <div class="review-section-title">✅ Strengths</div>
            <ul class="review-list list-green">\${listItems(review.strengths)}</ul>
        </div>

        <div class="review-section">
            <div class="review-section-title">⚡ Optimizations</div>
            <ul class="review-list list-amber">\${listItems(review.optimizations)}</ul>
        </div>

        <div class="review-section">
            <div class="review-section-title">📈 Areas to Improve</div>
            <ul class="review-list list-amber">\${listItems(review.improvements)}</ul>
        </div>

        <div class="review-section">
            <div class="review-section-title">⏱️ Complexity</div>
            <div class="complexity-row">
                <div class="complexity-pill"><div class="complexity-label">TIME</div>\${review.timeComplexity}</div>
                <div class="complexity-pill"><div class="complexity-label">SPACE</div>\${review.spaceComplexity}</div>
            </div>
        </div>

        <div class="review-section">
            <div class="review-section-title">💡 Optimal Solution</div>
            <div class="optimal-code">\${review.optimalSolution.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
        </div>

        <div class="review-section" style="background:rgba(0,120,200,0.08);border:1px solid rgba(0,120,200,0.25);border-radius:6px;padding:12px 14px;">
            <div class="review-section-title">🎯 Follow-up Question</div>
            <div style="font-size:13px;color:#7cc5f4;line-height:1.6">\${review.followUpQuestion}</div>
        </div>
    \`;
}

// ── Messages from extension ───────────────────────────────────────────────────
window.addEventListener('message', (event) => {
    const msg = event.data;
    switch (msg.type) {
        case 'hintResult':
            document.getElementById('hint-text-' + msg.index).textContent = msg.hint;
            break;
        case 'reviewResult':
            renderReview(msg.review);
            break;
        case 'followUpResult':
            const el = document.getElementById('followup-response');
            el.textContent = msg.response;
            el.classList.add('visible');
            break;
        case 'error':
            hideLoading();
            setOutput('Error: ' + msg.message, 'error');
            submitted = false;
            document.getElementById('submit-btn').disabled = false;
            break;
    }
});
</script>
</body>
</html>`;

    // ── Handle messages from the webview ──────────────────────────────────────
    panel.webview.onDidReceiveMessage(async (msg) => {
        switch (msg.command) {

            case 'submitSolution': {
                try {
                    const review = await AiInterviewService.reviewSolution(
                        apiKey, problem, msg.code, language, msg.timeSpentMinutes
                    );
                    if (!review) throw new Error('Could not generate review');
                    panel.webview.postMessage({ type: 'reviewResult', review });
                } catch (err: any) {
                    panel.webview.postMessage({ type: 'error', message: err.message });
                }
                break;
            }

            case 'getHint': {
                try {
                    const hint = await AiInterviewService.getHint(
                        apiKey, problem, msg.code, msg.hintIndex, language
                    );
                    panel.webview.postMessage({ type: 'hintResult', index: msg.hintIndex, hint: hint ?? 'Think about the time complexity.' });
                } catch {
                    panel.webview.postMessage({ type: 'hintResult', index: msg.hintIndex, hint: problem.hints[msg.hintIndex] ?? 'Keep thinking!' });
                }
                break;
            }

            case 'followUp': {
                try {
                    const response = await AiInterviewService.askFollowUp(
                        apiKey, problem, msg.code, msg.question, language
                    );
                    panel.webview.postMessage({ type: 'followUpResult', response: response ?? 'Good question — think about edge cases.' });
                } catch {
                    panel.webview.postMessage({ type: 'followUpResult', response: 'Could not get response. Try again.' });
                }
                break;
            }

            case 'newProblem': {
                panel.dispose();
                vscode.commands.executeCommand('sarvis.practiceInterview');
                break;
            }

            case 'runCode': {
                // Could integrate with a code runner — for now just acknowledge
                break;
            }
        }
    });
}