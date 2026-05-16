import * as vscode from 'vscode';
import { SECRET_KEY } from '../types';

export async function requireApiKey(
    context: vscode.ExtensionContext
): Promise<string | undefined> {
    const apiKey = await context.secrets.get(SECRET_KEY);
    if (!apiKey) {
        vscode.window.showErrorMessage('Set your Sarvis API key first via the ⚙ button.');
        return undefined;
    }
    return apiKey;
}