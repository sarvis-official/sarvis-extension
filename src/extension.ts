import * as vscode from "vscode";

import {
    ChatViewProvider,
    registerChatCommand,
} from "./features/chat";

export async function activate(
    context: vscode.ExtensionContext
) {
    console.log(
        "Sarvis extension activated"
    );

    /*
     |--------------------------------------------------------------------------
     | Chat Feature
     |--------------------------------------------------------------------------
     */

    const chatProvider =
        new ChatViewProvider(
            context
        );

    context.subscriptions.push(

        vscode.window.registerWebviewViewProvider(
            "sarvis.sidebar",
            chatProvider
        ),

        registerChatCommand()
    );

    vscode.window.showInformationMessage(
        "Sarvis AI is ready 🚀"
    );
}

export function deactivate() {
    console.log(
        "Sarvis extension deactivated"
    );
}