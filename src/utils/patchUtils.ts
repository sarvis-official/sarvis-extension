import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { FilePatch } from '../types';

export function extractMultiFilePatches(markdown: string): FilePatch[] {
    const fileRegex = /### FILE:\s*(.*?)\n```[\w]*\n([\s\S]*?)```/g;
    const patches: FilePatch[] = [];
    let match: RegExpExecArray | null;

    while ((match = fileRegex.exec(markdown)) !== null) {
        patches.push({
            file: match[1].trim(),
            content: match[2].trim()
        });
    }

    return patches;
}

export function extractConfidence(markdown: string): number {
    const match = markdown.match(/## Confidence\s*([\d]+)/);
    return match ? Math.min(100, Math.max(0, parseInt(match[1], 10))) : 70;
}

export function resolvePatchFile(patchFile: string): vscode.Uri | undefined {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const activeEditor = vscode.window.activeTextEditor;

    // Placeholder path → use active file
    if (patchFile.includes('path/to/') || (patchFile.includes('file.js') && !patchFile.includes('/'))) {
        return activeEditor?.document.uri;
    }

    // Active editor filename matches
    if (activeEditor) {
        const activeName = path.basename(activeEditor.document.uri.fsPath);
        if (patchFile.endsWith(activeName)) {
            return activeEditor.document.uri;
        }
    }

    // Resolve relative to workspace
    if (workspaceFolder) {
        const possiblePath = path.join(workspaceFolder.uri.fsPath, patchFile);
        if (fs.existsSync(possiblePath)) {
            return vscode.Uri.file(possiblePath);
        }
    }

    return activeEditor?.document.uri;
}

export function cleanCodeBlock(text: string): string {
    return text
        .replace(/```[a-zA-Z]*\n?/g, '')
        .replace(/```/g, '')
        .trim();
}