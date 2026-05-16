import * as vscode from 'vscode';
import { AiService } from '../services/AiService';
import { SECRET_KEY, SarvisMode } from '../types';
import { LearningService } from '../services/LearningService';

export class InlineCompletionProvider implements vscode.InlineCompletionItemProvider {

    private abortController?: AbortController;
    private readonly cache = new Map<string, string>();

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly learningService: LearningService
    ) { }

    async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        _context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionItem[]> {
        if (token.isCancellationRequested) return [];

        const apiKey = await this.context.secrets.get(SECRET_KEY);
        if (!apiKey) return [];

        const config = vscode.workspace.getConfiguration('sarvis');
        const mode = config.get<SarvisMode>('completionMode', 'balanced');
        const branding = config.get<boolean>('showBranding', true);

        const linePrefix = document.lineAt(position).text.slice(0, position.character);
        if (!this.shouldTrigger(linePrefix, mode)) return [];

        const contextText = this.getContext(document, position);
        const cacheKey = contextText.slice(-300);

        if (this.cache.has(cacheKey)) {
            return [this.buildItem(this.cache.get(cacheKey)!, position, branding)];
        }

        this.abortController?.abort();
        this.abortController = new AbortController();

        const suggestion = await AiService.completeInline(
            apiKey,
            contextText,
            mode,
            this.abortController.signal,
            this.learningService.buildContextPrompt()
        );

        if (!suggestion || token.isCancellationRequested) return [];

        const cleaned = this.cleanDuplicate(linePrefix, suggestion);
        this.cache.set(cacheKey, cleaned);

        return [this.buildItem(cleaned, position, branding)];
    }

    private shouldTrigger(prefix: string, mode: SarvisMode): boolean {
        if (!prefix.trim()) return false;
        if (mode === 'conservative') {
            return ['.', '(', '=', '{'].includes(prefix.slice(-1));
        }
        return true;
    }

    private getContext(document: vscode.TextDocument, position: vscode.Position): string {
        const startLine = Math.max(position.line - 40, 0);
        const range = new vscode.Range(new vscode.Position(startLine, 0), position);
        return document.getText(range);
    }

    private cleanDuplicate(prefix: string, suggestion: string): string {
        const trimmed = prefix.trim();
        return suggestion.startsWith(trimmed) ? suggestion.slice(trimmed.length) : suggestion;
    }

    private buildItem(
        suggestion: string,
        position: vscode.Position,
        branding: boolean
    ): vscode.InlineCompletionItem {
        const item = new vscode.InlineCompletionItem(suggestion, new vscode.Range(position, position));
        if (branding) {
            item.command = { command: 'sarvis.inlineAccepted', title: 'Sarvis Inline Accepted' };
        }
        return item;
    }
}