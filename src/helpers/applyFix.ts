import * as vscode from 'vscode';

export async function applyFixToDocument(
    uri: vscode.Uri,
    originalCode: string,
    fixedCode: string
): Promise<void> {
    const edit = new vscode.WorkspaceEdit();
    const document = await vscode.workspace.openTextDocument(uri);
    const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(originalCode.length)
    );
    edit.replace(uri, fullRange, fixedCode);
    await vscode.workspace.applyEdit(edit);
}