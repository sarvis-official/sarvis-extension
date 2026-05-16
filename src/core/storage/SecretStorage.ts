import * as vscode from "vscode";

export class SecretStorage {
    constructor(
        private context: vscode.ExtensionContext
    ) { }

    async setApiKey(
        apiKey: string
    ) {
        await this.context.secrets.store(
            "sarvis-api-key",
            apiKey
        );
    }

    async getApiKey() {
        return this.context.secrets.get(
            "sarvis-api-key"
        );
    }

    async clearApiKey() {
        await this.context.secrets.delete(
            "sarvis-api-key"
        );
    }
}