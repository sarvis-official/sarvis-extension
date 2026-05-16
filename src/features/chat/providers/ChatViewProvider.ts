import * as vscode from "vscode";

import { ChatService } from "../services/chat.service";

import { chatState } from "../state/chat.state";

import { getEditorContext } from "../services/context.service";

export class ChatViewProvider
    implements vscode.WebviewViewProvider {
    constructor(
        private context: vscode.ExtensionContext
    ) { }

    async resolveWebviewView(
        webviewView: vscode.WebviewView
    ) {
        webviewView.webview.options = {
            enableScripts: true,
        };

        /*
         |--------------------------------------------------------------------------
         | Ask API Key First Time
         |--------------------------------------------------------------------------
         */

        let apiKey =
            await this.context.secrets.get(
                "sarvis-api-key"
            );

        if (!apiKey) {
            apiKey =
                await vscode.window.showInputBox(
                    {
                        prompt:
                            "Enter Sarvam API Key",

                        password: true,

                        ignoreFocusOut: true,
                    }
                );

            if (!apiKey) {
                vscode.window.showErrorMessage(
                    "Sarvam API Key is required"
                );

                return;
            }

            await this.context.secrets.store(
                "sarvis-api-key",
                apiKey
            );

            vscode.window.showInformationMessage(
                "API Key saved successfully"
            );
        }

        webviewView.webview.html =
            this.getHtml();

        webviewView.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case "chat":
                        await this.handleChat(
                            webviewView,
                            message.text
                        );
                        break;

                    case "clear":
                        chatState.clear();

                        webviewView.webview.postMessage(
                            {
                                type: "clear",
                            }
                        );

                        break;
                }
            }
        );
    }

    /*
     |--------------------------------------------------------------------------
     | Chat Handler
     |--------------------------------------------------------------------------
     */

    private async handleChat(
        webviewView: vscode.WebviewView,
        text: string
    ) {
        try {
            const apiKey =
                await this.context.secrets.get(
                    "sarvis-api-key"
                );

            if (!apiKey) {
                throw new Error(
                    "Missing API Key"
                );
            }

            const cleanText =
                text.trim();

            if (!cleanText) {
                return;
            }

            webviewView.webview.postMessage({
                type: "thinking",
            });

            const chatService =
                new ChatService(apiKey);

            const editorContext =
                await getEditorContext();

            /*
             |--------------------------------------------------------------------------
             | IMPORTANT:
             | Do NOT add user message before API request
             |--------------------------------------------------------------------------
             */

            const response =
                await chatService.sendMessage(
                    cleanText,
                    chatState.getMessages(),
                    editorContext
                );

            /*
             |--------------------------------------------------------------------------
             | Add messages AFTER successful response
             |--------------------------------------------------------------------------
             */

            chatState.addMessage({
                role: "user",
                content: cleanText,
            });

            chatState.addMessage({
                role: "assistant",
                content: response,
            });

            webviewView.webview.postMessage({
                type: "response",
                text: response,
            });

        } catch (error) {

            console.error(error);

            webviewView.webview.postMessage({
                type: "error",

                text:
                    error instanceof Error
                        ? error.message
                        : "Unknown Error",
            });
        }
    }

    /*
     |--------------------------------------------------------------------------
     | Modern UI
     |--------------------------------------------------------------------------
     */

    private getHtml() {
        return `
<!DOCTYPE html>
<html lang="en">

<head>
<meta charset="UTF-8" />

<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0"
/>

<style>

:root {
  --bg: #0d1117;
  --panel: #161b22;
  --border: #30363d;
  --primary: #3b82f6;
  --text: #e6edf3;
  --muted: #8b949e;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  height: 100vh;

  background: var(--bg);

  color: var(--text);

  font-family:
    Inter,
    system-ui,
    sans-serif;

  display: flex;
  flex-direction: column;
}

.header {
  height: 60px;

  border-bottom:
    1px solid var(--border);

  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 0 16px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-circle {
  width: 12px;
  height: 12px;

  border-radius: 999px;

  background: var(--primary);
}

.title {
  font-size: 14px;
  font-weight: 600;
}

.subtitle {
  font-size: 12px;
  color: var(--muted);
}

.chat-container {
  flex: 1;

  overflow-y: auto;

  padding: 20px;

  display: flex;
  flex-direction: column;

  gap: 16px;
}

.message {
  max-width: 90%;

  padding: 14px;

  border-radius: 14px;

  line-height: 1.6;

  white-space: pre-wrap;

  font-size: 14px;
}

.user {
  align-self: flex-end;

  background: var(--primary);

  color: white;
}

.assistant {
  align-self: flex-start;

  background: var(--panel);

  border:
    1px solid var(--border);
}

.input-container {
  padding: 16px;

  border-top:
    1px solid var(--border);
}

.input-wrapper {
  display: flex;

  align-items: center;

  gap: 10px;
}

textarea {
  flex: 1;

  resize: none;

  background: var(--panel);

  border:
    1px solid var(--border);

  color: white;

  border-radius: 12px;

  padding: 14px;

  min-height: 50px;

  outline: none;
}

textarea:focus {
  border-color: var(--primary);
}

button {
  border: none;

  background: var(--primary);

  color: white;

  border-radius: 12px;

  padding: 12px 18px;

  cursor: pointer;

  font-weight: 600;
}

button:hover {
  opacity: 0.9;
}

.typing {
  color: var(--muted);

  font-size: 13px;

  padding: 0 4px;

  display: none;
}

.empty {
  margin: auto;

  text-align: center;

  color: var(--muted);
}

::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-thumb {
  background: #2d333b;
  border-radius: 999px;
}

</style>
</head>

<body>

<div class="header">

  <div class="logo">

    <div class="logo-circle"></div>

    <div>
      <div class="title">
        Sarvis AI
      </div>

      <div class="subtitle">
        Powered by Sarvam AI
      </div>
    </div>

  </div>

  <button onclick="clearChat()">
    Clear
  </button>

</div>

<div
  id="chat"
  class="chat-container"
>

  <div class="empty">
    <h2>
      Welcome to Sarvis
    </h2>

    <p>
      Your AI coding assistant
    </p>
  </div>

</div>

<div class="input-container">

  <div class="input-wrapper">

    <textarea
      id="input"
      placeholder="Ask Sarvis anything..."
    ></textarea>

    <button onclick="sendMessage()">
      Send
    </button>

  </div>

  <div
    id="typing"
    class="typing"
  >
    Sarvis is thinking...
  </div>

</div>

<script>

const vscode =
  acquireVsCodeApi();

const chat =
  document.getElementById(
    "chat"
  );

const input =
  document.getElementById(
    "input"
  );

const typing =
  document.getElementById(
    "typing"
  );

function addMessage(
  text,
  type
) {
  const empty =
    document.querySelector(
      ".empty"
    );

  if (empty) {
    empty.remove();
  }

  const message =
    document.createElement(
      "div"
    );

  message.className =
    "message " + type;

  message.textContent =
    text;

  chat.appendChild(message);

  chat.scrollTop =
    chat.scrollHeight;
}

function sendMessage() {
  const text =
    input.value.trim();

  if (!text) {
    return;
  }

  addMessage(
    text,
    "user"
  );

  vscode.postMessage({
    command: "chat",
    text
  });

  input.value = "";
}

function clearChat() {
  chat.innerHTML = "";

  vscode.postMessage({
    command: "clear"
  });
}

window.addEventListener(
  "message",
  event => {
    const message =
      event.data;

    switch (message.type) {

      case "thinking":
        typing.style.display =
          "block";
        break;

      case "response":
        typing.style.display =
          "none";

        addMessage(
          message.text,
          "assistant"
        );
        break;

      case "error":
        typing.style.display =
          "none";

        addMessage(
          message.text,
          "assistant"
        );
        break;

      case "clear":
        chat.innerHTML = "";
        break;
    }
  }
);

input.addEventListener(
  "keydown",
  event => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      sendMessage();
    }
  }
);

</script>

</body>
</html>
`;
    }
}