import * as vscode from 'vscode';
import { SECRET_KEY } from '../types';

export async function setApiKeyCommand(context: vscode.ExtensionContext): Promise<void> {
    const apiKey = await vscode.window.showInputBox({
        prompt: 'Enter your Sarvis API Key',
        password: true,
        placeHolder: 'sk-...',
        ignoreFocusOut: true
    });

    if (!apiKey?.trim()) return;

    await context.secrets.store(SECRET_KEY, apiKey.trim());
    vscode.window.showInformationMessage('Sarvis API Key saved.');
}