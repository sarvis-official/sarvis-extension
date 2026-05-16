import * as vscode from 'vscode';

export class DiagnosticCodeActionProvider implements vscode.CodeActionProvider {

    static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range,
        context: vscode.CodeActionContext
    ): vscode.CodeAction[] {
        if (context.diagnostics.length === 0) return [];

        const actions: vscode.CodeAction[] = [];

        // ── Fix single diagnostic ──────────────────────────────────────────
        const fixOne = new vscode.CodeAction(
            '⚡ Fix with Sarvis',
            vscode.CodeActionKind.QuickFix
        );
        fixOne.command = {
            command: 'sarvis.fixDiagnostic',
            title: 'Fix with Sarvis',
            arguments: [document.uri, context.diagnostics[0]]
        };
        fixOne.isPreferred = true;
        actions.push(fixOne);

        // ── Fix all in file ────────────────────────────────────────────────
        const fixAll = new vscode.CodeAction(
            '⚡ Fix all in file with Sarvis',
            vscode.CodeActionKind.QuickFix
        );
        fixAll.command = {
            command: 'sarvis.fixAllInFile',
            title: 'Fix all in file with Sarvis',
            arguments: [document.uri]
        };
        actions.push(fixAll);

        return actions;
    }
}