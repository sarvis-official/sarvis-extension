import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AiService } from '../services/AiService';
import { LearningService } from '../services/LearningService';
import { TemplateService } from '../services/TemplateService';
import { handleError } from '../utils/errorHandler';
import { requireApiKey } from './requireApiKey';

export function registerTemplateCommands(
    context: vscode.ExtensionContext,
    learningService: LearningService
): void {

    context.subscriptions.push(
        vscode.commands.registerCommand('sarvis.templates', async () => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;

                // Step 1 — Pick category
                const categories = TemplateService.getCategories();
                const categoryItems = categories.map(c => ({
                    label: getCategoryIcon(c) + ' ' + c.charAt(0).toUpperCase() + c.slice(1),
                    value: c
                }));

                const selectedCategory = await vscode.window.showQuickPick(
                    categoryItems.map(c => c.label),
                    { placeHolder: 'Select a category' }
                );
                if (!selectedCategory) return;

                const categoryValue = categoryItems.find(c => c.label === selectedCategory)?.value ?? '';

                // Step 2 — Pick template
                const templates = TemplateService.getByCategory(categoryValue);
                const templateItems = templates.map(t => ({
                    label: `${t.icon} ${t.label}`,
                    description: t.description,
                    value: t.id
                }));

                const selectedTemplate = await vscode.window.showQuickPick(templateItems, {
                    placeHolder: 'Select a template'
                });
                if (!selectedTemplate) return;

                const template = TemplateService.getById(selectedTemplate.value);
                if (!template) return;

                // Step 3 — Fill required fields
                const values: Record<string, string> = {};
                for (const field of template.fields) {
                    const value = await vscode.window.showInputBox({
                        prompt: field.label,
                        placeHolder: field.placeholder,
                        ignoreFocusOut: true
                    });
                    if (!value && field.required) {
                        vscode.window.showWarningMessage(`${field.label} is required.`);
                        return;
                    }
                    values[field.id] = value ?? '';
                }

                // Step 4 — Generate
                const prompt = template.promptBuilder(values);
                const language = values.language || 'code';
                let generated: string | null = null;

                await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: `Sarvis generating ${template.label}...`,
                        cancellable: false
                    },
                    async () => {
                        generated = await AiService.generateFromTemplate(
                            apiKey, prompt, language,
                            learningService.buildContextPrompt()
                        );
                    }
                );

                if (!generated) {
                    vscode.window.showErrorMessage('Sarvis could not generate code. Try again.');
                    return;
                }

                // Step 5 — Insert at cursor or create new file
                const editor = vscode.window.activeTextEditor;
                const action = await vscode.window.showQuickPick(
                    ['Insert at cursor', 'Create new file'],
                    { placeHolder: 'Where to put the generated code?' }
                );

                if (action === 'Insert at cursor' && editor) {
                    await editor.edit(edit => edit.insert(editor.selection.active, generated!));
                    vscode.window.setStatusBarMessage(`⚡ Sarvis inserted ${template.label}`, 3000);
                } else {
                    const ext = getTemplateExtension(template.id, language);
                    const nameKey = values.name ?? values.resource ?? values.entity ?? values.model ?? values.table ?? 'generated';
                    const fileName = `${nameKey}.${ext}`;
                    const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                    if (!ws) return;

                    const filePath = path.join(ws, fileName);
                    fs.writeFileSync(filePath, generated);
                    const doc = await vscode.workspace.openTextDocument(filePath);
                    await vscode.window.showTextDocument(doc);
                    vscode.window.showInformationMessage(`✅ Created ${fileName}`);
                }

            } catch (err) { handleError(err, 'templates'); }
        })
    );
}

function getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
        backend: '⚙️',
        frontend: '🎨',
        database: '🗄️',
        testing: '🧪',
        devops: '🚀'
    };
    return icons[category] ?? '📦';
}

function getTemplateExtension(templateId: string, language: string): string {
    const lang = language.toLowerCase();
    if (templateId === 'dockerfile') return 'dockerfile';
    if (templateId === 'github-actions') return 'yml';
    if (templateId === 'sql-schema') return 'sql';
    if (templateId === 'prisma-schema') return 'prisma';
    if (lang.includes('typescript')) return 'ts';
    if (lang.includes('javascript')) return 'js';
    if (lang.includes('python')) return 'py';
    if (lang.includes('java')) return 'java';
    if (lang.includes('go')) return 'go';
    if (lang.includes('rust')) return 'rs';
    if (lang.includes('c#')) return 'cs';
    return 'txt';
}