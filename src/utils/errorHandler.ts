import * as vscode from 'vscode';

export function handleError(error: unknown, context?: string): void {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    const prefix = context ? `Sarvis [${context}]` : 'Sarvis';
    console.error(`[${prefix}]`, error);
    vscode.window.showErrorMessage(`${prefix}: ${message}`);
}