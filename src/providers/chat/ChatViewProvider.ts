import * as vscode from "vscode";

export class ChatViewProvider
    implements vscode.WebviewViewProvider {
    public static readonly viewType = "sarvis.sidebar";

    constructor(
        private readonly extensionUri: vscode.Uri
    ) { }

    resolveWebviewView(
        webviewView: vscode.WebviewView
    ) {
        webviewView.webview.options = {
            enableScripts: true,
        };

        webviewView.webview.html = this.getHtml();

        webviewView.webview.onDidReceiveMessage(
            async (message) => {
                if (message.command === "chat") {
                    const response =
                        "Sarvis connected successfully";

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
      <body>
        <h2>Sarvis AI</h2>

        <input
          id="message"
          type="text"
          placeholder="Ask something..."
        />

        <button onclick="sendMessage()">
          Send
        </button>

        <pre id="response"></pre>

        <script>
          const vscode = acquireVsCodeApi();

          function sendMessage() {
            const input =
              document.getElementById("message");

            vscode.postMessage({
              command: "chat",
              text: input.value
            });
          }

          window.addEventListener(
            "message",
            event => {
              const message = event.data;

              document.getElementById(
                "response"
              ).textContent = message.text;
            }
          );
        </script>
      </body>
      </html>
    `;
    }
}