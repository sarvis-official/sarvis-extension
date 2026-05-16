import * as vscode from 'vscode';

export class CodeActionFixProvider implements vscode.CodeActionProvider {

    static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

    provideCodeActions(
        _document: vscode.TextDocument,
        range: vscode.Range
    ): vscode.CodeAction[] {
        const action = new vscode.CodeAction('Fix with Sarvis', vscode.CodeActionKind.QuickFix);
        action.command = {
            command: 'sarvis.fixSelection',
            title: 'Fix with Sarvis',
            arguments: [range]
        };
        return [action];
    }
}