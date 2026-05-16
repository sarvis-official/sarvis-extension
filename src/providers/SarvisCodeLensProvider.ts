import * as vscode from 'vscode';

let currentPatchedFunction: string | null = null;

export function setCurrentPatchedFunction(code: string | null) {
    currentPatchedFunction = code;
}

export class SarvisCodeLensProvider implements vscode.CodeLensProvider {

    provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {

        if (!currentPatchedFunction) return [];

        const match = currentPatchedFunction.match(
            /function\s+([a-zA-Z0-9_]+)\s*\(/
        );

        if (!match) return [];

        const functionName = match[1];

        const regex = new RegExp(
            `function\\s+${functionName}\\s*\\(`,
            'g'
        );

        const text = document.getText();
        const found = regex.exec(text);

        if (!found) return [];

        const position = document.positionAt(found.index);

        return [
            new vscode.CodeLens(
                new vscode.Range(position, position),
                {
                    title: '⚡ Accept Sarvis Change',
                    command: 'sarvis.applyFunctionPatch'
                }
            )
        ];
    }
}