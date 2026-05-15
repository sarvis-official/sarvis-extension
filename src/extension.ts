import * as vscode from "vscode";
import { ChatViewProvider } from "./providers/chat/ChatViewProvider";

export function activate(
    context: vscode.ExtensionContext
) {
    const provider =
        new ChatViewProvider(context);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            "sarvis.sidebar",
            provider
        )
    );
}

export function deactivate() { }