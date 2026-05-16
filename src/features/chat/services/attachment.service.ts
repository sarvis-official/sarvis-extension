import * as vscode from "vscode";

export async function pickFiles() {
    const files =
        await vscode.window.showOpenDialog({
            canSelectMany: true,
            openLabel: "Attach Files",
        });

    return files || [];
}