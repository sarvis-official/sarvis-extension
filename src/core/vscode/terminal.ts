import * as vscode from "vscode";

export function createTerminal(
    name = "Sarvis"
) {
    return vscode.window.createTerminal(
        name
    );
}

export function runCommand(
    command: string
) {
    const terminal =
        createTerminal();

    terminal.show();

    terminal.sendText(command);
}