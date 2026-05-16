import * as vscode from "vscode";

export class WorkspaceStorage {
    constructor(
        private context: vscode.ExtensionContext
    ) { }

    async set<T>(
        key: string,
        value: T
    ) {
        await this.context.workspaceState.update(
            key,
            value
        );
    }

    get<T>(
        key: string
    ): T | undefined {
        return this.context.workspaceState.get<T>(
            key
        );
    }

    async delete(
        key: string
    ) {
        await this.context.workspaceState.update(
            key,
            undefined
        );
    }
}