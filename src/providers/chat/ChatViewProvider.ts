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
      <html>
      <body
        style="
          background:#111;
          color:white;
          padding:16px;
          font-family:sans-serif;
        "
      >
        <h2>Sarvis AI</h2>

        <input
          id="message"
          type="text"
          style="width:80%"
        />

        <button onclick="sendMessage()">
          Send
        </button>

        <pre id="response"></pre>

        <script>
          const vscode =
            acquireVsCodeApi();

          function sendMessage() {
            const input =
              document.getElementById(
                "message"
              );

            vscode.postMessage({
              command: "chat",
              text: input.value
            });
          }

          window.addEventListener(
            "message",
            event => {
              document.getElementById(
                "response"
              ).textContent =
                event.data.text;
            }
          );
        </script>
      </body>
      </html>
    `;
    }
}