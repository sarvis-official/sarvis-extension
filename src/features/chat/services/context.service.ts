import * as vscode from "vscode";

export async function getEditorContext() {
  const editor =
    vscode.window.activeTextEditor;

  if (!editor) {
    return "";
  }

  const selected =
    editor.document.getText(
      editor.selection
    );

  return `
File:
${editor.document.fileName}

Selected Code:
${selected}
`;
}