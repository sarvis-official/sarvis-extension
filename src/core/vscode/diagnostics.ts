import * as vscode from "vscode";

export function getDiagnostics() {
    return vscode.languages.getDiagnostics();
}

export function getFileDiagnostics(
    uri: vscode.Uri
) {
    return vscode.languages.getDiagnostics(
        uri
    );
}