import * as vscode from 'vscode';
import { AiService } from '../services/AiService';
import { SECRET_KEY } from '../types';
import { SecurityService } from '../services/SecurityService';
import { PerformanceService } from '../services/PerformanceService';

export interface SaveReviewResult {
    fileName: string;
    filePath: string;
    issues: SaveIssue[];
    timestamp: number;
}

export interface SaveIssue {
    type: 'security' | 'performance' | 'quality';
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    line?: number;
    fix?: string;
}

export class SaveReviewProvider {

    private statusBarItem: vscode.StatusBarItem;
    private lastReview: SaveReviewResult | null = null;
    private isReviewing = false;
    private debounceTimer: NodeJS.Timeout | undefined;

    constructor(private readonly context: vscode.ExtensionContext) {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,  // ← Left side is more visible
            0
        );
        this.statusBarItem.command = 'sarvis.showSaveReview';
        context.subscriptions.push(this.statusBarItem);
    }

    // ── Called on every file save ──────────────────────────────────────────
    async onFileSave(document: vscode.TextDocument): Promise<void> {
        const config = vscode.workspace.getConfiguration('sarvis');
        const enabled = config.get<boolean>('reviewOnSave', true);
        if (!enabled) return;

        // Skip non-code files
        const skipLanguages = ['json', 'markdown', 'plaintext', 'yaml', 'xml'];
        if (skipLanguages.includes(document.languageId)) return;

        // Skip small files
        if (document.lineCount < 5) return;

        // Debounce — wait 1.5s after save before reviewing
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this._runReview(document);
        }, 1500);
    }

    private async _runReview(document: vscode.TextDocument): Promise<void> {
        if (this.isReviewing) return;
        this.isReviewing = true;

        const apiKey = await this.context.secrets.get(SECRET_KEY);
        if (!apiKey) { this.isReviewing = false; return; }

        // Show reviewing indicator
        this.statusBarItem.text = '$(sync~spin) Sarvis reviewing...';
        this.statusBarItem.tooltip = 'Sarvis is reviewing your code...';
        this.statusBarItem.show();

        try {
            const code = document.getText();
            const filePath = document.uri.fsPath;
            const language = document.languageId;
            const fileName = require('path').basename(filePath);

            // Run static analysis instantly (no API needed)
            const staticIssues: SaveIssue[] = [];

            const securityIssues = SecurityService.analyzeFile(filePath, code);
            securityIssues.forEach(i => {
                staticIssues.push({
                    type: 'security',
                    severity: i.severity as SaveIssue['severity'],
                    message: i.message,
                    line: i.line,
                });
            });

            const perfIssues = PerformanceService.analyzeFile(filePath, code);
            perfIssues.forEach(i => {
                staticIssues.push({
                    type: 'performance',
                    severity: i.severity as SaveIssue['severity'],
                    message: i.message,
                    line: i.line,
                });
            });

            // AI quick review (only critical/high issues)
            const aiIssuesRaw = await AiService.quickReviewOnSave(
                apiKey, code, language, fileName
            );



            const aiIssues: SaveIssue[] = (aiIssuesRaw ?? []).map(i => ({
                type: (i.type === 'security' || i.type === 'performance' || i.type === 'quality'
                    ? i.type : 'quality') as SaveIssue['type'],
                severity: (i.severity === 'critical' || i.severity === 'high' ||
                    i.severity === 'medium' || i.severity === 'low'
                    ? i.severity : 'medium') as SaveIssue['severity'],
                message: i.message,
                line: i.line,
                fix: i.fix
            }));

            const allIssues = [
                ...staticIssues,
                ...aiIssues
            ].sort((a, b) => {
                const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
                return order[a.severity] - order[b.severity];
            });

            if (allIssues.length === 0) {
                vscode.window.setStatusBarMessage('⚡ Sarvis: Code looks clean ✓', 3000);
            } else {
                vscode.window.setStatusBarMessage(
                    `⚡ Sarvis: ${allIssues.length} issue(s) found — click status bar`,
                    5000
                );
            }

            this.lastReview = {
                fileName,
                filePath,
                issues: allIssues,
                timestamp: Date.now()
            };

            this._updateStatusBar(allIssues);

        } catch {
            this.statusBarItem.hide();
        } finally {
            this.isReviewing = false;
        }
    }

    private _updateStatusBar(issues: SaveIssue[]): void {
        // In _updateStatusBar, change the clean code section:
        if (issues.length === 0) {
            this.statusBarItem.text = '⚡ Sarvis ✓ Clean';
            this.statusBarItem.tooltip = 'No issues found — code looks clean!';
            this.statusBarItem.backgroundColor = undefined;
            this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.prominentForeground');
            this.statusBarItem.show();
            setTimeout(() => {
                this.statusBarItem.hide();
                this.statusBarItem.color = undefined;
            }, 4000);
            return;
        }
        const critical = issues.filter(i => i.severity === 'critical').length;
        const high = issues.filter(i => i.severity === 'high').length;
        const total = issues.length;

        const icon = critical > 0 ? '$(error)' : high > 0 ? '$(warning)' : '$(info)';
        this.statusBarItem.text = `${icon} Sarvis: ${total} issue${total > 1 ? 's' : ''}`;
        this.statusBarItem.tooltip = `${total} issue(s) found — click to view\n${critical > 0 ? `🔴 ${critical} critical  ` : ''}${high > 0 ? `🟠 ${high} high` : ''}`;

        if (critical > 0) {
            this.statusBarItem.backgroundColor = new vscode.ThemeColor(
                'statusBarItem.errorBackground'
            );
        } else if (high > 0) {
            this.statusBarItem.backgroundColor = new vscode.ThemeColor(
                'statusBarItem.warningBackground'
            );
        } else {
            this.statusBarItem.backgroundColor = undefined;
        }

        this.statusBarItem.show();
    }

    getLastReview(): SaveReviewResult | null { return this.lastReview; }
    hide(): void { this.statusBarItem.hide(); }
}