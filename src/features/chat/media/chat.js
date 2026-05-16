const vscode =
    acquireVsCodeApi();

function sendMessage() {
    const input =
        document.getElementById(
            "messageInput"
        );

    vscode.postMessage({
        command: "chat",
        text: input.value,
    });

    input.value = "";
}