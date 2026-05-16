import * as vscode from "vscode";

export function getActiveEditor() {
    return vscode.window.activeTextEditor;
}

export function getSelectedText() {
    const editor =
        getActiveEditor();

    if (!editor) {
        return "";
    }

    return editor.document.getText(
        editor.selection
    );
}

export function replaceSelection(
    content: string
) {
    const editor =
        getActiveEditor();

    if (!editor) {
        return;
    }

    editor.edit((editBuilder) => {
        editBuilder.replace(
            editor.selection,
            content
        );
    });
}

export async function openFile(
    uri: vscode.Uri
) {
    const document =
        await vscode.workspace.openTextDocument(
            uri
        );

    await vscode.window.showTextDocument(
        document
    );
}