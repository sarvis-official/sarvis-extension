import * as vscode from 'vscode';
import { AiService } from '../services/AiService';
import { SECRET_KEY, ChatMessage } from '../types';
import { SessionMemoryService } from '../services/SessionMemoryService';

export class ChatViewProvider implements vscode.WebviewViewProvider {

  private _view?: vscode.WebviewView;
  private _chatHistory: ChatMessage[] = [];

  constructor(
    private readonly context: vscode.ExtensionContext,
    private sessionMemory?: SessionMemoryService  // ← add
  ) { }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    try {
      this._view = webviewView;

      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')]
      };

      webviewView.webview.html = this._getHtml(webviewView.webview);

      webviewView.webview.onDidReceiveMessage(async (msg) => {
        switch (msg.command) {
          case 'send':
            await this._handleMessage(msg.text);
            break;
          case 'clear':
            this._chatHistory = [];
            break;
          case 'getApiKeyStatus': {
            const key = await this.context.secrets.get(SECRET_KEY);
            webviewView.webview.postMessage({ type: 'apiKeyStatus', hasKey: !!key });
            break;
          }
          case 'setApiKey':
            await this._promptApiKey();
            break;
        }
      });
    } catch (err) {
      console.error('[Sarvis] resolveWebviewView error:', err);
      vscode.window.showErrorMessage(`Sarvis failed to load sidebar: ${err}`);
    }
  }

  private async _promptApiKey(): Promise<void> {
    const apiKey = await vscode.window.showInputBox({
      prompt: 'Enter your Sarvis API Key',
      password: true,
      placeHolder: 'sk-...',
      ignoreFocusOut: true
    });
    if (!apiKey?.trim()) return;
    await this.context.secrets.store(SECRET_KEY, apiKey.trim());
    vscode.window.showInformationMessage('Sarvis API Key saved!');
    this._view?.webview.postMessage({ type: 'apiKeyStatus', hasKey: true });
  }

  private async _handleMessage(text: string): Promise<void> {
    if (!this._view) return;

    const apiKey = await this.context.secrets.get(SECRET_KEY);
    if (!apiKey) {
      this._view.webview.postMessage({
        type: 'error',
        text: 'No API key set. Click "Set API Key" to get started.'
      });
      return;
    }

    const editor = vscode.window.activeTextEditor;
    const fileContext = editor
      ? `File: ${editor.document.fileName}\n\`\`\`${editor.document.languageId}\n${editor.document.getText().slice(0, 3000)}\n\`\`\``
      : '';

    this._chatHistory.push({ role: 'user', content: text });
    this._view.webview.postMessage({ type: 'thinking' });

    try {
      const reply = await AiService.chat(
        apiKey,
        text,
        fileContext,
        this._chatHistory.slice(-10),
        this.sessionMemory?.buildContextPrompt() ?? ''
      );

      this._chatHistory.push({
        role: 'assistant',
        content: reply
      });

      this._view.webview.postMessage({
        type: 'response',
        text: reply
      });

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Check your API key.';
      this._view.webview.postMessage({ type: 'error', text: message });
    }
  }

  private _getHtml(webview: vscode.Webview): string {
    const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'chat.css'));
    const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'chat.js'));

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource};">
    <link rel="stylesheet" href="${cssUri}">
    <title>Sarvis AI</title>
</head>
<body>
    <div id="app">
        <div id="header">
            <div id="header-title">
                <span class="logo">S</span>
                <span>Sarvis AI</span>
            </div>
            <div id="header-actions">
                <button id="clearBtn" title="Clear chat">↺</button>
                <button id="apiKeyBtn" title="Set API Key">⚙</button>
            </div>
        </div>

        <div id="api-banner" style="display:none;">
            <p>No API key set.</p>
            <button id="bannerSetKeyBtn">Set Sarvis API Key</button>
        </div>

        <div id="chat"></div>

        <div id="input-area">
            <div id="context-badge" style="display:none;">
                <span id="context-file"></span>
            </div>
            <div id="input-row">
                <textarea id="input" placeholder="Ask Sarvis anything..." rows="1"></textarea>
                <button id="sendBtn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </div>
        </div>
    </div>
    <script src="${jsUri}"></script>
</body>
</html>`;
  }
}