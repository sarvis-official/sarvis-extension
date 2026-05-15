import * as vscode from "vscode";
import { SarvamService } from "../../services/ai/providers/sarvam/SarvamService";

export class ChatViewProvider
    implements vscode.WebviewViewProvider {
    private context: vscode.ExtensionContext;

    constructor(
        context: vscode.ExtensionContext
    ) {
        this.context = context;
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView
    ) {
        webviewView.webview.options = {
            enableScripts: true,
        };

        webviewView.webview.html =
            this.getHtml();

        webviewView.webview.onDidReceiveMessage(
            async (message) => {
                if (message.command === "chat") {
                    let apiKey =
                        await this.context.secrets.get(
                            "sarvis-api-key"
                        );

                    if (!apiKey) {
                        apiKey =
                            await vscode.window.showInputBox({
                                prompt:
                                    "Enter Sarvam API Key",
                                password: true,
                                ignoreFocusOut: true,
                            });

                        if (!apiKey) {
                            vscode.window.showErrorMessage(
                                "API key required"
                            );

                            return;
                        }

                        await this.context.secrets.store(
                            "sarvis-api-key",
                            apiKey
                        );
                    }

                    const sarvamService =
                        new SarvamService(apiKey);

                    const response =
                        await sarvamService.sendMessage(
                            message.text
                        );

                    webviewView.webview.postMessage({
                        command: "response",
                        text: response,
                    });
                }
            }
        );
    }

    private getHtml(): string {
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
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        height: 100vh;
        background: #0f1117;
        color: #ffffff;
        font-family:
          Inter,
          system-ui,
          sans-serif;

        display: flex;
        flex-direction: column;
      }

      .header {
        padding: 18px;
        border-bottom: 1px solid #222630;
        background: #151923;

        display: flex;
        align-items: center;
        justify-content: space-between;
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
        background: #5b8cff;
      }

      .title {
        font-size: 15px;
        font-weight: 600;
      }

      .subtitle {
        font-size: 12px;
        color: #9aa4b2;
        margin-top: 2px;
      }

      .chat-container {
        flex: 1;
        overflow-y: auto;

        display: flex;
        flex-direction: column;

        padding: 18px;
        gap: 14px;
      }

      .message {
        max-width: 90%;
        padding: 14px;
        border-radius: 14px;
        line-height: 1.5;
        font-size: 14px;
        white-space: pre-wrap;
      }

      .user {
        align-self: flex-end;
        background: #5b8cff;
        color: white;
      }

      .assistant {
        align-self: flex-start;
        background: #1a1f2b;
        border: 1px solid #2a3242;
      }

      .input-container {
        padding: 16px;
        border-top: 1px solid #222630;
        background: #151923;
      }

      .input-wrapper {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      textarea {
        flex: 1;
        resize: none;

        border: 1px solid #2a3242;
        background: #0f1117;
        color: white;

        border-radius: 12px;

        padding: 12px;

        min-height: 52px;
        max-height: 160px;

        outline: none;

        font-size: 14px;
      }

      textarea:focus {
        border-color: #5b8cff;
      }

      button {
        border: none;
        background: #5b8cff;
        color: white;

        padding: 12px 18px;

        border-radius: 10px;

        cursor: pointer;

        font-weight: 600;

        transition: 0.2s;
      }

      button:hover {
        background: #7aa0ff;
      }

      .typing {
        display: none;
        color: #9aa4b2;
        font-size: 13px;
        margin-top: 10px;
      }

      .empty-state {
        margin: auto;
        text-align: center;
        color: #7d8794;
      }

      .empty-state h2 {
        font-size: 20px;
        margin-bottom: 10px;
      }

      .empty-state p {
        font-size: 13px;
      }

      ::-webkit-scrollbar {
        width: 8px;
      }

      ::-webkit-scrollbar-thumb {
        background: #2a3242;
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
    </div>

    <div
      id="chat"
      class="chat-container"
    >
      <div class="empty-state">
        <h2>
          Welcome to Sarvis
        </h2>

        <p>
          Ask coding questions, generate code,
          explain bugs, and more.
        </p>
      </div>
    </div>

    <div class="input-container">
      <div class="input-wrapper">

        <textarea
          id="message"
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
        document.getElementById("chat");

      const input =
        document.getElementById("message");

      const typing =
        document.getElementById("typing");

      function addMessage(
        text,
        type
      ) {
        const emptyState =
          document.querySelector(
            ".empty-state"
          );

        if (emptyState) {
          emptyState.remove();
        }

        const message =
          document.createElement("div");

        message.className =
          "message " + type;

        message.textContent = text;

        chat.appendChild(message);

        chat.scrollTop =
          chat.scrollHeight;
      }

      async function sendMessage() {
        const text =
          input.value.trim();

        if (!text) {
          return;
        }

        addMessage(text, "user");

        typing.style.display =
          "block";

        vscode.postMessage({
          command: "chat",
          text
        });

        input.value = "";
      }

      window.addEventListener(
        "message",
        event => {
          typing.style.display =
            "none";

          addMessage(
            event.data.text,
            "assistant"
          );
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