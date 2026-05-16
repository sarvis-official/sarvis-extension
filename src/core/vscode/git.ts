import * as vscode from "vscode";

export async function getGitExtension() {
    const extension =
        vscode.extensions.getExtension(
            "vscode.git"
        );

    if (!extension) {
        return null;
    }

    if (!extension.isActive) {
        await extension.activate();
    }

    return extension.exports;
}

export async function getGitRepositories() {
    const git =
        await getGitExtension();

    return (
        git?.getAPI(1)
            ?.repositories || []
    );
}