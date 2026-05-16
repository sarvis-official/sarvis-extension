import * as vscode from "vscode";

export function registerCommand(
    command: string,
    callback: (...args: any[]) => any
) {
    return vscode.commands.registerCommand(
        command,
        callback
    );
}

export async function executeCommand(
    command: string,
    ...args: unknown[]
) {
    return vscode.commands.executeCommand(
        command,
        ...args
    );
}