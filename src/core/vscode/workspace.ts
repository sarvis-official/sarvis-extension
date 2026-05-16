import * as vscode from "vscode";

export function getWorkspaceFolders() {
    return (
        vscode.workspace.workspaceFolders ||
        []
    );
}

export function getWorkspacePath() {
    return (
        getWorkspaceFolders()[0]?.uri.fsPath ||
        ""
    );
}

export async function findFiles(
    pattern: string
) {
    return vscode.workspace.findFiles(
        pattern
    );
}

export async function readFile(
    uri: vscode.Uri
) {
    const bytes =
        await vscode.workspace.fs.readFile(
            uri
        );

    return Buffer.from(bytes).toString(
        "utf8"
    );
}