import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Opens generated markdown content in VS Code's built-in markdown preview.
 * Used for README, API docs, and any other markdown deliverables.
 */
export async function showDocsPanel(
    content: string,
    language: 'markdown' | 'yaml',
    fileName?: string
): Promise<void> {
    const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    if (fileName && ws) {
        // Write to disk so the user can save it
        const filePath = path.join(ws, fileName);
        fs.writeFileSync(filePath, content);
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc);
        if (language === 'markdown') {
            await vscode.commands.executeCommand('markdown.showPreviewToSide', doc.uri);
        }
        vscode.window.showInformationMessage(`✅ ${fileName} generated!`);
    } else {
        // Open as virtual unsaved document
        const doc = await vscode.workspace.openTextDocument({ content, language });
        await vscode.window.showTextDocument(doc);
        if (language === 'markdown') {
            await vscode.commands.executeCommand('markdown.showPreviewToSide', doc.uri);
        }
    }
}

/**
 * Convenience wrapper for README generation.
 * Handles the "overwrite?" prompt when README.md already exists.
 */
export async function showReadmePanel(content: string, ws: string): Promise<void> {
    const readmePath = path.join(ws, 'README.md');

    if (fs.existsSync(readmePath)) {
        const choice = await vscode.window.showWarningMessage(
            'README.md already exists. Overwrite?',
            { modal: true },
            'Overwrite', 'Preview Only'
        );
        if (choice === 'Preview Only') {
            await showDocsPanel(content, 'markdown');
            return;
        }
        if (!choice) return;
    }

    await showDocsPanel(content, 'markdown', 'README.md');
}