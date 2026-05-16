import * as vscode from "vscode";

export function registerChatCommand() {
    return vscode.commands.registerCommand(
        "sarvis.openChat",
        async () => {
            await vscode.commands.executeCommand(
                "workbench.view.extension.sarvis"
            );
        }
    );
}