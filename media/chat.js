const vscode = acquireVsCodeApi();

const chat = document.getElementById('chat');
const input = document.getElementById('input');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearBtn');
const apiKeyBtn = document.getElementById('apiKeyBtn');
const apiBanner = document.getElementById('api-banner');
const bannerSetKeyBtn = document.getElementById('bannerSetKeyBtn');
const contextBadge = document.getElementById('context-badge');
const contextFile = document.getElementById('context-file');

let isThinking = false;
let thinkingEl = null;

// Check API key on load
vscode.postMessage({ command: 'getApiKeyStatus' });

// --- Render helpers ---

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function renderMarkdown(text) {
    // Code blocks with language
    text = text.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, lang, code) => {
        return `<pre><code class="language-${lang || ''}">${escapeHtml(code.trim())}</code></pre>`;
    });

    // Inline code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Headers
    text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bullet lists
    text = text.replace(/^\- (.+)$/gm, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Numbered lists
    text = text.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Line breaks (double newline = paragraph break)
    text = text.replace(/\n\n/g, '<br><br>');
    text = text.replace(/\n/g, '<br>');

    return text;
}

function appendMessage(role, text, isError = false) {
    removeThinking();

    const div = document.createElement('div');
    div.className = `message ${isError ? 'error' : role}`;

    const header = document.createElement('div');
    header.className = 'message-header';
    header.textContent = role === 'user' ? 'You' : isError ? 'Error' : 'Sarvis';

    const body = document.createElement('div');
    body.className = 'message-body';

    if (role === 'assistant' && !isError) {
        body.innerHTML = renderMarkdown(text);
    } else {
        body.textContent = text;
    }

    div.appendChild(header);
    div.appendChild(body);
    chat.appendChild(div);
    scrollToBottom();

    // Remove empty state
    const emptyState = document.getElementById('empty-state');
    if (emptyState) emptyState.remove();
}

function showThinking() {
    removeThinking();
    thinkingEl = document.createElement('div');
    thinkingEl.className = 'message assistant';
    thinkingEl.innerHTML = `
        <div class="message-header">Sarvis</div>
        <div class="thinking">
            <div class="dots">
                <span></span><span></span><span></span>
            </div>
            thinking...
        </div>`;
    chat.appendChild(thinkingEl);
    scrollToBottom();
}

function removeThinking() {
    if (thinkingEl) {
        thinkingEl.remove();
        thinkingEl = null;
    }
}

function scrollToBottom() {
    chat.scrollTop = chat.scrollHeight;
}

function setLoading(loading) {
    isThinking = loading;
    sendBtn.disabled = loading;
    input.disabled = loading;
}

function showEmptyState() {
    if (chat.children.length === 0) {
        const empty = document.createElement('div');
        empty.id = 'empty-state';
        empty.innerHTML = `
            <div class="big-s">S</div>
            <p>Ask me anything about your code.<br>I can help debug, explain, and improve.</p>`;
        chat.appendChild(empty);
    }
}

// --- Event listeners ---

function sendMessage() {
    const text = input.value.trim();
    if (!text || isThinking) return;

    appendMessage('user', text);
    input.value = '';
    input.style.height = 'auto';
    setLoading(true);

    vscode.postMessage({ command: 'send', text });
}

sendBtn.addEventListener('click', sendMessage);

input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Auto-resize textarea
input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
});

clearBtn.addEventListener('click', () => {
    chat.innerHTML = '';
    vscode.postMessage({ command: 'clear' });
    showEmptyState();
});

apiKeyBtn.addEventListener('click', () => {
    vscode.postMessage({ command: 'setApiKey' });
});

bannerSetKeyBtn.addEventListener('click', () => {
    vscode.postMessage({ command: 'setApiKey' });
});

// --- Message handler ---

window.addEventListener('message', (event) => {
    const msg = event.data;

    switch (msg.type) {
        case 'response':
            setLoading(false);
            appendMessage('assistant', msg.text);
            break;

        case 'error':
            setLoading(false);
            removeThinking();
            appendMessage('error', msg.text, true);
            break;

        case 'thinking':
            showThinking();
            break;

        case 'apiKeyStatus':
            if (msg.hasKey) {
                apiBanner.style.display = 'none';
            } else {
                apiBanner.style.display = 'flex';
            }
            break;

        case 'fileContext':
            if (msg.filename) {
                contextBadge.style.display = 'flex';
                contextFile.textContent = '📄 ' + msg.filename;
            } else {
                contextBadge.style.display = 'none';
            }
            break;
    }
});

// Init
showEmptyState();