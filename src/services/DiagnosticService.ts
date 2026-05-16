import * as vscode from 'vscode';

export interface DiagnosticFix {
    uri: vscode.Uri;
    diagnostic: vscode.Diagnostic;
    code: string;
    language: string;
}

export const DiagnosticService = {

    getFileDiagnostics(uri: vscode.Uri): DiagnosticFix[] {
        const diagnostics = vscode.languages.getDiagnostics(uri);
        const document = vscode.workspace.textDocuments.find(
            d => d.uri.toString() === uri.toString()
        );
        if (!document) return [];

        return diagnostics
            .filter(d => d.severity === vscode.DiagnosticSeverity.Error ||
                d.severity === vscode.DiagnosticSeverity.Warning)
            .map(d => ({
                uri,
                diagnostic: d,
                code: document.getText(),
                language: document.languageId
            }));
    },

    getWorkspaceDiagnostics(): DiagnosticFix[] {
        const all = vscode.languages.getDiagnostics();
        const results: DiagnosticFix[] = [];

        for (const [uri, diagnostics] of all) {
            const document = vscode.workspace.textDocuments.find(
                d => d.uri.toString() === uri.toString()
            );
            if (!document) continue;

            for (const d of diagnostics) {
                if (d.severity === vscode.DiagnosticSeverity.Error ||
                    d.severity === vscode.DiagnosticSeverity.Warning) {
                    results.push({
                        uri,
                        diagnostic: d,
                        code: document.getText(),
                        language: document.languageId
                    });
                }
            }
        }
        return results;
    },

    formatDiagnosticsForAI(fixes: DiagnosticFix[]): string {
        return fixes.map(f => {
            const line = f.diagnostic.range.start.line + 1;
            const col = f.diagnostic.range.start.character + 1;
            const severity = f.diagnostic.severity === vscode.DiagnosticSeverity.Error
                ? '❌ ERROR' : '⚠️ WARNING';
            return `${severity} at line ${line}:${col} — ${f.diagnostic.message}`;
        }).join('\n');
    },

    groupByFile(fixes: DiagnosticFix[]): Map<string, DiagnosticFix[]> {
        const map = new Map<string, DiagnosticFix[]>();
        for (const fix of fixes) {
            const key = fix.uri.fsPath;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(fix);
        }
        return map;
    }
};