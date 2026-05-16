import * as vscode from 'vscode';
import { AiService } from '../services/AiService';
import { SECRET_KEY } from '../types';

export class ErrorExplainerProvider implements vscode.HoverProvider {

    private cache = new Map<string, vscode.Hover>();
    private pendingRequests = new Map<string, Promise<vscode.Hover | null>>();

    constructor(private readonly context: vscode.ExtensionContext) { }

    async provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Hover | null> {

        // Get diagnostics at this position
        const diagnostics = vscode.languages.getDiagnostics(document.uri).filter(d =>
            d.range.contains(position) &&
            (d.severity === vscode.DiagnosticSeverity.Error ||
                d.severity === vscode.DiagnosticSeverity.Warning)
        );

        if (diagnostics.length === 0) return null;

        const apiKey = await this.context.secrets.get(SECRET_KEY);
        if (!apiKey) return null;

        const diagnostic = diagnostics[0];
        const cacheKey = `${document.uri}:${diagnostic.range.start.line}:${diagnostic.message}`;

        // Return cached result
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!;
        }

        // Return pending request if already in flight
        if (this.pendingRequests.has(cacheKey)) {
            return this.pendingRequests.get(cacheKey)!;
        }

        // Get code context around the error
        const startLine = Math.max(0, diagnostic.range.start.line - 3);
        const endLine = Math.min(document.lineCount - 1, diagnostic.range.end.line + 3);
        const codeContext = document.getText(
            new vscode.Range(
                new vscode.Position(startLine, 0),
                new vscode.Position(endLine, document.lineAt(endLine).text.length)
            )
        );

        const errorLine = document.lineAt(diagnostic.range.start.line).text;

        // Make AI request
        const request = this._fetchExplanation(
            apiKey, diagnostic, errorLine, codeContext,
            document.languageId, cacheKey
        );

        this.pendingRequests.set(cacheKey, request);

        const result = await request;
        this.pendingRequests.delete(cacheKey);

        return result;
    }

    private async _fetchExplanation(
        apiKey: string,
        diagnostic: vscode.Diagnostic,
        errorLine: string,
        codeContext: string,
        language: string,
        cacheKey: string
    ): Promise<vscode.Hover | null> {
        try {
            const explanation = await AiService.explainError(
                apiKey,
                diagnostic.message,
                errorLine.trim(),
                codeContext,
                language
            );

            if (!explanation) return null;

            const hover = this._buildHover(diagnostic, explanation);
            this.cache.set(cacheKey, hover);

            // Clear cache after 5 minutes
            setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);

            return hover;
        } catch {
            return null;
        }
    }

    private _buildHover(
        diagnostic: vscode.Diagnostic,
        explanation: { plain: string; fix: string; example?: string }
    ): vscode.Hover {
        const severityIcon = diagnostic.severity === vscode.DiagnosticSeverity.Error
            ? '❌' : '⚠️';
        const severityLabel = diagnostic.severity === vscode.DiagnosticSeverity.Error
            ? 'ERROR' : 'WARNING';

        const md = new vscode.MarkdownString('', true);
        md.isTrusted = true;
        md.supportHtml = true;

        // Header
        md.appendMarkdown(`### ${severityIcon} Sarvis Error Explainer\n\n`);

        // Original error
        md.appendMarkdown(`**${severityLabel}:** \`${diagnostic.message}\`\n\n`);
        md.appendMarkdown(`---\n\n`);

        // Plain English explanation
        md.appendMarkdown(`💡 **What this means:**\n\n${explanation.plain}\n\n`);

        // Fix suggestion
        if (explanation.fix) {
            md.appendMarkdown(`🔧 **How to fix:**\n\n${explanation.fix}\n\n`);
        }

        // Code example
        if (explanation.example) {
            md.appendMarkdown(`**Example fix:**\n\`\`\`\n${explanation.example}\n\`\`\`\n\n`);
        }

        // Source attribution
        md.appendMarkdown(`---\n*⚡ Powered by Sarvam AI*`);

        return new vscode.Hover(md, diagnostic.range);
    }

    clearCache(): void {
        this.cache.clear();
    }
}