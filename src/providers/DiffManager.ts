import * as vscode from 'vscode';
import * as path from 'path';
import { FilePatch } from '../types';
import { resolvePatchFile } from '../utils/patchUtils';

class SarvisDiffContentProvider implements vscode.TextDocumentContentProvider {
    constructor(private content: string) {}
    provideTextDocumentContent(): string {
        return this.content;
    }
}

// ─── Extract function name from patch content ──────────────────────────────
function extractFunctionName(code: string): string | null {
    const patterns = [
        /(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(/,
        /(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\(/,
        /(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?function/,
    ];
    for (const pattern of patterns) {
        const match = code.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// ─── Find the full range of a named function in a document ────────────────
export function findFunctionRange(
    document: vscode.TextDocument,
    functionName: string
): vscode.Range | null {
    const text = document.getText();

    const patterns = [
        new RegExp(`(?:async\\s+)?function\\s+${functionName}\\s*\\(`),
        new RegExp(`(?:const|let|var)\\s+${functionName}\\s*=\\s*(?:async\\s*)?(?:function\\s*)?\\(`),
        new RegExp(`(?:const|let|var)\\s+${functionName}\\s*=\\s*async\\s+`),
    ];

    let startIndex = -1;
    for (const pattern of patterns) {
        const match = pattern.exec(text);
        if (match) {
            startIndex = match.index;
            break;
        }
    }

    if (startIndex === -1) return null;

    // Walk braces to find the end of the function body
    let braceCount = 0;
    let inFunction = false;
    let endIndex = startIndex;

    for (let i = startIndex; i < text.length; i++) {
        if (text[i] === '{') {
            braceCount++;
            inFunction = true;
        } else if (text[i] === '}') {
            braceCount--;
            if (inFunction && braceCount === 0) {
                endIndex = i + 1;
                break;
            }
        }
    }

    if (!inFunction) return null;

    return new vscode.Range(
        document.positionAt(startIndex),
        document.positionAt(endIndex)
    );
}

export class DiffManager {
    constructor(private context: vscode.ExtensionContext) {}

    // ─── Preview diff scoped to just the changed function ───────────────────
    async previewPatches(patches: FilePatch[]): Promise<void> {
        for (const patch of patches) {
            const fileUri = resolvePatchFile(patch.file);
            if (!fileUri) {
                vscode.window.showErrorMessage(`Cannot resolve patch file: ${patch.file}`);
                continue;
            }

            const document = await vscode.workspace.openTextDocument(fileUri);
            const functionName = extractFunctionName(patch.content);
            const functionRange = functionName ? findFunctionRange(document, functionName) : null;

            // Splice the new function into the original file for preview
            let previewContent: string;
            if (functionRange) {
                const originalText = document.getText();
                const before = originalText.slice(0, document.offsetAt(functionRange.start));
                const after = originalText.slice(document.offsetAt(functionRange.end));
                previewContent = before + patch.content + after;
            } else {
                previewContent = patch.content; // fallback
            }

            const modifiedUri = vscode.Uri.parse(`sarvis-diff:${fileUri.path}.patched`);
            const provider = new SarvisDiffContentProvider(previewContent);
            const registration = vscode.workspace.registerTextDocumentContentProvider('sarvis-diff', provider);
            this.context.subscriptions.push(registration);

            const label = functionName
                ? `Sarvis: ${functionName}() in ${path.basename(fileUri.fsPath)}`
                : `Sarvis Changes: ${path.basename(fileUri.fsPath)}`;

            await vscode.commands.executeCommand('vscode.diff', fileUri, modifiedUri, label);
        }
    }

    // ─── Apply: only replace the specific function, not the whole file ───────
    async applyPatches(patches: FilePatch[]): Promise<void> {
        const edit = new vscode.WorkspaceEdit();

        for (const patch of patches) {
            const fileUri = resolvePatchFile(patch.file);
            if (!fileUri) continue;

            const document = await vscode.workspace.openTextDocument(fileUri);
            const functionName = extractFunctionName(patch.content);
            const functionRange = functionName ? findFunctionRange(document, functionName) : null;

            if (functionRange) {
                // ✅ Surgical replace — only the function body
                edit.replace(fileUri, functionRange, patch.content);
                console.log(`[Sarvis] Patching function: ${functionName}() in ${path.basename(fileUri.fsPath)}`);
            } else {
                // ⚠️ Fallback: full file replace if function cannot be located
                const fullRange = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(document.getText().length)
                );
                edit.replace(fileUri, fullRange, patch.content);
                console.warn(`[Sarvis] Function not found — falling back to full file replace`);
                vscode.window.showWarningMessage('Sarvis: Could not isolate function, replaced full file.');
            }
        }

        await vscode.workspace.applyEdit(edit);
    }

    // ─── Apply a single named function patch (used by CodeLens) ─────────────
    async applyFunctionPatch(fileUri: vscode.Uri, functionName: string, newCode: string): Promise<void> {
        const document = await vscode.workspace.openTextDocument(fileUri);
        const functionRange = findFunctionRange(document, functionName);

        if (!functionRange) {
            vscode.window.showErrorMessage(`Sarvis: Could not find function "${functionName}" to patch.`);
            return;
        }

        const edit = new vscode.WorkspaceEdit();
        edit.replace(fileUri, functionRange, newCode);
        await vscode.workspace.applyEdit(edit);

        vscode.window.setStatusBarMessage(`⚡ Sarvis patched ${functionName}()`, 2000);
    }
}