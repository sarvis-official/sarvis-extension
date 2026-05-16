import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AiService } from '../services/AiService';
import { LearningService } from '../services/LearningService';
import { SessionMemoryService } from '../services/SessionMemoryService';
import { IndexService } from '../services/IndexService';
import { RefactorService, RefactorPlan } from '../services/RefactorService';
import { ArchitectureService, ArchitecturePlan } from '../services/ArchitectureService';
import { TemplateService } from '../services/TemplateService';
import { MigrationService, MigrationTemplate } from '../services/MigrationService';
import { TodoService, TodoItem } from '../services/TodoService';
import { ComplexityService } from '../services/ComplexityService';
import { DependencyReport } from '../services/DependencyService';
import { DependencyService } from '../services/DependencyService';
import { SecurityService } from '../services/SecurityService';
import { PerformanceService } from '../services/PerformanceService';
import { DeadCodeService } from '../services/DeadCodeService';
import { handleError } from '../utils/errorHandler';
import { showArchitecturePreviewPanel } from '../panels/architecturePanel';
import { showRefactorPreviewPanel } from '../panels/refactorPanel';
import { showDiagramPanel } from '../panels/diagramPanel';
import { showMigrationPreviewPanel } from '../panels/migrationPanel';
import { showTodoPanel } from '../panels/todoPanel';
import { showStandupPanel } from '../panels/standupPanel';
import { showHealthDashboard } from '../panels/healthPanel';
import { showReadmePanel } from '../panels/docsPanel';
import { SECRET_KEY } from '../types';
import { requireApiKey } from '../helpers/requireApiKey';
import { getDirectoryTree } from '../helpers/directoryTree';

export function registerProjectCommands(
    context: vscode.ExtensionContext,
    learningService: LearningService,
    sessionMemory: SessionMemoryService,
    indexService: IndexService
): void {

    context.subscriptions.push(

        // ─── Architecture Generator ────────────────────────────────────────────
        vscode.commands.registerCommand('sarvis.generateArchitecture', async () => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;
                const prompt = await vscode.window.showInputBox({ prompt: 'Describe the architecture you want to scaffold', placeHolder: 'e.g. Create scalable Spring Boot microservice, Node.js REST API with Express and MongoDB', ignoreFocusOut: true });
                if (!prompt) return;

                let planJson: string | null = null;
                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Sarvis generating architecture...', cancellable: false },
                    async () => { planJson = await AiService.generateArchitecture(apiKey, prompt, learningService.buildContextPrompt()); }
                );
                if (!planJson) { vscode.window.showErrorMessage('Sarvis could not generate architecture. Try a more specific description.'); return; }

                let plan: ArchitecturePlan;
                try { plan = JSON.parse((planJson as string).replace(/```json|```/g, '').trim()); }
                catch { vscode.window.showErrorMessage('Sarvis returned an invalid plan. Try again with a clearer description.'); return; }

                showArchitecturePreviewPanel(plan, context, async (confirmed) => {
                    if (!confirmed) return;
                    try {
                        await vscode.window.withProgress(
                            { location: vscode.ProgressLocation.Notification, title: 'Sarvis scaffolding files...', cancellable: false },
                            async () => { await ArchitectureService.applyPlan(plan); }
                        );
                        vscode.window.showInformationMessage(`✅ Sarvis scaffolded ${plan.files.length} files for "${plan.name}"`);
                    } catch (err) { handleError(err, 'generateArchitecture:apply'); }
                });
            } catch (err) { handleError(err, 'generateArchitecture'); }
        }),

        // ─── Refactor Project ──────────────────────────────────────────────────
        vscode.commands.registerCommand('sarvis.refactorProject', async () => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;
                const instruction = await vscode.window.showInputBox({ prompt: 'Describe the refactoring you want to do', placeHolder: 'e.g. Convert this project from JS to TS, Move auth to middleware pattern', ignoreFocusOut: true });
                if (!instruction) return;
                const files = RefactorService.collectProjectFiles(20);
                if (files.length === 0) { vscode.window.showWarningMessage('No files found in workspace.'); return; }

                let planJson: string | null = null;
                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: `Sarvis planning refactor: "${instruction}"...`, cancellable: false },
                    async () => { planJson = await AiService.planRefactor(apiKey, instruction, files, learningService.buildContextPrompt()); }
                );
                if (!planJson) { vscode.window.showErrorMessage('Sarvis could not generate a refactor plan.'); return; }

                let plan: RefactorPlan;
                try { plan = JSON.parse(planJson.replace(/```json|```/g, '').trim()); }
                catch { vscode.window.showErrorMessage('Sarvis returned an invalid plan. Try a more specific instruction.'); return; }

                showRefactorPreviewPanel(plan, context, async (confirmed) => {
                    if (!confirmed) return;
                    try {
                        const edit = RefactorService.applyRefactorPlan(plan);
                        await vscode.workspace.applyEdit(edit);
                        vscode.window.showInformationMessage(`✅ Sarvis refactored ${plan.files.length} file(s) successfully.`);
                    } catch (err) { handleError(err, 'refactorProject:apply'); }
                });
            } catch (err) { handleError(err, 'refactorProject'); }
        }),

        // ─── Architecture Diagram ──────────────────────────────────────────────
        vscode.commands.registerCommand('sarvis.generateDiagram', async () => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;

                const diagramTypes = [
                    { label: '🏗️ System Architecture', value: 'graph TD', description: 'Components and their relationships' },
                    { label: '🔄 Data Flow', value: 'flowchart TD', description: 'How data moves through the system' },
                    { label: '📡 Sequence Diagram', value: 'sequenceDiagram', description: 'API calls and service interactions' },
                    { label: '🧱 Class Diagram', value: 'classDiagram', description: 'Class relationships and OOP structure' },
                    { label: '🗄️ ER Diagram', value: 'erDiagram', description: 'Database entities and relations' },
                    { label: '🔀 State Diagram', value: 'stateDiagram-v2', description: 'State machines and lifecycle' },
                ];
                const selectedType = await vscode.window.showQuickPick(diagramTypes, { placeHolder: 'Select diagram type' });
                if (!selectedType) return;

                const scope = await vscode.window.showQuickPick([
                    { label: '📄 Current File', value: 'file', description: 'Diagram from open file only' },
                    { label: '📁 Entire Project', value: 'project', description: 'Diagram from all project files' },
                    { label: '✏️ Custom Description', value: 'custom', description: 'Describe your system manually' },
                ], { placeHolder: 'What to generate diagram from?' });
                if (!scope) return;

                let projectContext = '';
                if (scope.value === 'file') {
                    const editor = vscode.window.activeTextEditor;
                    if (!editor) { vscode.window.showWarningMessage('Open a file first.'); return; }
                    projectContext = `File: ${path.basename(editor.document.fileName)}\n\`\`\`\n${editor.document.getText().slice(0, 3000)}\n\`\`\``;
                } else if (scope.value === 'project') {
                    const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                    if (!ws) { vscode.window.showWarningMessage('No workspace open.'); return; }
                    for (const file of ['package.json', 'README.md', 'src/index.ts', 'src/index.js', 'src/app.ts', 'src/app.js', 'src/server.ts', 'src/server.js']) {
                        const filePath = path.join(ws, file);
                        if (fs.existsSync(filePath)) projectContext += `### ${file}\n\`\`\`\n${fs.readFileSync(filePath, 'utf-8').slice(0, 800)}\n\`\`\`\n\n`;
                    }
                    const srcPath = path.join(ws, 'src');
                    if (fs.existsSync(srcPath)) projectContext += `\n### Project Structure:\n${getDirectoryTree(srcPath, 3)}`;
                } else {
                    const custom = await vscode.window.showInputBox({ prompt: 'Describe your system architecture', placeHolder: 'e.g. React frontend, Express API, MongoDB database, Redis cache, Auth service', ignoreFocusOut: true });
                    if (!custom?.trim()) return;
                    projectContext = custom.trim();
                }

                let diagram: string | null = null;
                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Sarvis generating diagram...', cancellable: false },
                    async () => { diagram = await AiService.generateArchitectureDiagram(apiKey, projectContext, selectedType.value, learningService.buildContextPrompt()); }
                );
                if (!diagram) { vscode.window.showErrorMessage('Sarvis could not generate diagram. Try again.'); return; }

                const cleanDiagram = (diagram as string).replace(/```mermaid\n?/g, '').replace(/```\n?/g, '').trim();
                showDiagramPanel(cleanDiagram, selectedType.label, context);
            } catch (err) { handleError(err, 'generateDiagram'); }
        }),

        // ─── Migration Assistant ───────────────────────────────────────────────
        vscode.commands.registerCommand('sarvis.migrateCode', async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) { vscode.window.showWarningMessage('Open a file to migrate.'); return; }
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;

                const categories = MigrationService.getCategories();
                const categoryIcons: Record<string, string> = { 'Framework': '🏗️', 'Language': '🔷', 'React': '⚛️', 'Database': '🗄️', 'HTTP': '🌐', 'Styling': '🎨', 'Testing': '🧪' };
                const categoryPicks = categories.map(c => ({ label: `${categoryIcons[c] ?? '📦'} ${c}`, value: c }));
                const selectedCategory = await vscode.window.showQuickPick(categoryPicks.map(c => c.label), { placeHolder: 'Select migration category' });
                if (!selectedCategory) return;
                const categoryValue = categoryPicks.find(c => c.label === selectedCategory)?.value ?? '';
                const migrations = MigrationService.getByCategory(categoryValue);
                const selectedMigration = await vscode.window.showQuickPick(migrations.map(m => ({ label: `${m.icon} ${m.label}`, description: m.description, value: m.id })), { placeHolder: 'Select migration' });
                if (!selectedMigration) return;
                const migration = MigrationService.getById(selectedMigration.value);
                if (!migration) return;

                const code = editor.document.getText();
                const fileName = path.basename(editor.document.fileName);
                let migrated: string | null = null;

                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: `Sarvis migrating ${fileName}: ${migration.from} → ${migration.to}...`, cancellable: false },
                    async () => { migrated = await AiService.migrateCode(apiKey, migration.promptBuilder(code), editor.document.languageId, learningService.buildContextPrompt()); }
                );
                if (!migrated) { vscode.window.showErrorMessage('Sarvis could not migrate the code. Try again.'); return; }

                const originalUri = editor.document.uri;
                const diffUri = vscode.Uri.parse(`sarvis-migrate:${originalUri.path}.migrated`);
                context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('sarvis-migrate', { provideTextDocumentContent: () => migrated! }));
                await vscode.commands.executeCommand('vscode.diff', originalUri, diffUri, `${migration.from} → ${migration.to}: ${fileName}`);

                showMigrationPreviewPanel(migration, migrated, context, async (confirmed) => {
                    if (!confirmed) return;
                    const currentExt = path.extname(editor.document.fileName);
                    const extChange = migration.fileExtensionChange;
                    const shouldRename = extChange && currentExt === extChange.from;

                    if (shouldRename && extChange) {
                        const newFilePath = editor.document.fileName.replace(new RegExp(`\\${extChange.from}$`), extChange.to);
                        const newUri = vscode.Uri.file(newFilePath);
                        const createEdit = new vscode.WorkspaceEdit();
                        createEdit.createFile(newUri, { overwrite: true });
                        await vscode.workspace.applyEdit(createEdit);
                        const writeEdit = new vscode.WorkspaceEdit();
                        writeEdit.insert(newUri, new vscode.Position(0, 0), migrated!);
                        await vscode.workspace.applyEdit(writeEdit);
                        const deleteEdit = new vscode.WorkspaceEdit();
                        deleteEdit.deleteFile(originalUri, { ignoreIfNotExists: true });
                        await vscode.workspace.applyEdit(deleteEdit);
                        const newDoc = await vscode.workspace.openTextDocument(newUri);
                        await vscode.window.showTextDocument(newDoc);
                        vscode.window.showInformationMessage(`✅ Migrated ${fileName} → ${path.basename(newFilePath)}`);
                    } else {
                        const edit = new vscode.WorkspaceEdit();
                        edit.replace(originalUri, new vscode.Range(editor.document.positionAt(0), editor.document.positionAt(code.length)), migrated!);
                        await vscode.workspace.applyEdit(edit);
                        vscode.window.setStatusBarMessage(`⚡ Migrated: ${migration.from} → ${migration.to}`, 4000);
                    }
                });
            } catch (err) { handleError(err, 'migrateCode'); }
        }),

        // ─── TODO Manager ──────────────────────────────────────────────────────
        vscode.commands.registerCommand('sarvis.scanTodos', async () => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;
                let items: TodoItem[] = [], result: string | null = null;
                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Sarvis scanning for TODOs...', cancellable: false },
                    async () => {
                        items = TodoService.scanWorkspace();
                        if (items.length === 0) { vscode.window.showInformationMessage('✅ No TODO/FIXME/HACK comments found!'); return; }
                        const todoText = items.map(i => `[${i.priority.toUpperCase()}] ${i.type} at ${i.file}:${i.line} — ${i.message}`).join('\n');
                        const pkg = (() => { try { const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath; if (!ws) return ''; const pkgPath = path.join(ws, 'package.json'); return fs.existsSync(pkgPath) ? fs.readFileSync(pkgPath, 'utf-8').slice(0, 500) : ''; } catch { return ''; } })();
                        result = await AiService.analyzeTodos(apiKey, todoText, pkg, learningService.buildContextPrompt() + '\n' + sessionMemory.buildContextPrompt());
                    }
                );
                if (items.length > 0 && result) showTodoPanel(items, result);
            } catch (err) { handleError(err, 'scanTodos'); }
        }),

        vscode.commands.registerCommand('sarvis.scanTodosFile', async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) { vscode.window.showWarningMessage('Open a file first.'); return; }
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;
                const code = editor.document.getText();
                const filePath = editor.document.uri.fsPath;
                const fileName = path.basename(filePath);
                let items: TodoItem[] = [], result: string | null = null;
                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: `Sarvis scanning ${fileName} for TODOs...`, cancellable: false },
                    async () => {
                        items = TodoService.scanFile(filePath, code);
                        if (items.length === 0) { vscode.window.showInformationMessage(`✅ No TODO/FIXME/HACK in ${fileName}`); return; }
                        const todoText = items.map(i => `[${i.priority.toUpperCase()}] ${i.type} at line ${i.line} — ${i.message}\nCode: ${i.snippet}`).join('\n\n');
                        result = await AiService.analyzeTodos(apiKey, todoText, `File: ${fileName}\n${code.slice(0, 1000)}`, learningService.buildContextPrompt());
                    }
                );
                if (items.length > 0 && result) showTodoPanel(items, result);
            } catch (err) { handleError(err, 'scanTodosFile'); }
        }),

        vscode.commands.registerCommand('sarvis.jumpToTodo', async (item: TodoItem) => {
            try {
                const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
                const fullPath = path.isAbsolute(item.file) ? item.file : path.join(ws, item.file);
                const doc = await vscode.workspace.openTextDocument(fullPath);
                const editor = await vscode.window.showTextDocument(doc);
                const position = new vscode.Position(item.line - 1, item.column);
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
            } catch (err) { handleError(err, 'jumpToTodo'); }
        }),

        // ─── Standup Generator ─────────────────────────────────────────────────
        vscode.commands.registerCommand('sarvis.generateStandup', async () => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;
                const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (!ws) { vscode.window.showWarningMessage('No workspace folder open.'); return; }

                let commits = '', filesChanged = '', standupData: Record<string, unknown> | null = null;

                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Sarvis generating standup...', cancellable: false },
                    async (progress) => {
                        progress.report({ message: 'Reading git history...' });
                        try { const { stdout } = await require('util').promisify(require('child_process').exec)('git log --oneline --since="24 hours ago"', { cwd: ws }); commits = stdout.trim() || 'No commits in last 24 hours'; } catch { commits = 'Git history unavailable'; }
                        progress.report({ message: 'Reading changed files...' });
                        try { const { stdout } = await require('util').promisify(require('child_process').exec)('git diff --name-only HEAD~5 HEAD', { cwd: ws }); filesChanged = stdout.trim() || 'No recent file changes'; } catch { filesChanged = sessionMemory.currentMemory.recentChanges.slice(0, 10).join('\n') || 'No changes tracked'; }

                        progress.report({ message: 'Scanning TODOs...' });
                        let todos = 'None';
                        try { const todoItems = TodoService.scanWorkspace(); todos = todoItems.filter(t => t.priority === 'high').slice(0, 5).map(t => `${t.type}: ${t.message}`).join('\n') || 'No high priority TODOs'; } catch { /* skip */ }

                        progress.report({ message: 'AI generating standup...' });
                        const raw = await AiService.generateStandup(apiKey, commits, filesChanged, todos, sessionMemory.currentMemory.currentFeature, sessionMemory.currentMemory.currentBug, learningService.buildContextPrompt());
                        if (!raw) return;
                        try { standupData = JSON.parse(raw); } catch { vscode.window.showErrorMessage('Could not parse standup data.'); }
                    }
                );
                if (standupData) showStandupPanel(standupData, context);
            } catch (err) { handleError(err, 'generateStandup'); }
        }),

        // ─── Health Dashboard ──────────────────────────────────────────────────
        vscode.commands.registerCommand('sarvis.healthDashboard', async () => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;
                const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (!ws) { vscode.window.showWarningMessage('No workspace open.'); return; }

                let securityScore = 100, performanceScore = 100, qualityScore = 100;
                let securityIssues: unknown[] = [], perfIssues: unknown[] = [], qualityIssues: unknown[] = [];
                let todoItems: unknown[] = [], deadCodeItems: unknown[] = [];
                let complexityFiles: import('../services/ComplexityService').FileComplexity[] = [];
                let depReport: Partial<DependencyReport> = {};

                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Sarvis analyzing workspace health...', cancellable: false },
                    async (progress) => {
                        progress.report({ message: 'Security scan...', increment: 15 });
                        const secFiles = SecurityService.collectFiles(30);
                        secFiles.forEach(f => securityIssues.push(...SecurityService.analyzeFile(f.path, f.content)));
                        securityScore = SecurityService.calculateRiskScore(securityIssues as Parameters<typeof SecurityService.calculateRiskScore>[0]);

                        progress.report({ message: 'Performance analysis...', increment: 15 });
                        const perfFiles = PerformanceService.collectFiles(20);
                        perfFiles.forEach(f => perfIssues.push(...PerformanceService.analyzeFile(f.path, f.content)));
                        performanceScore = PerformanceService.calculateScore(perfIssues as Parameters<typeof PerformanceService.calculateScore>[0]);

                        progress.report({ message: 'Code quality analysis...', increment: 15 });
                        const qualFiles = ComplexityService.collectFiles();
                        complexityFiles = qualFiles.map(f => ComplexityService.analyzeFile(f.path, f.content));
                        const avgComplexity = complexityFiles.length > 0 ? complexityFiles.reduce((s, f) => s + f.score, 0) / complexityFiles.length : 0;
                        qualityScore = Math.max(0, 100 - Math.round(avgComplexity));

                        progress.report({ message: 'Dead code analysis...', increment: 10 });
                        try { const dcFiles = DeadCodeService.collectFiles(); dcFiles.forEach(f => deadCodeItems.push(...DeadCodeService.analyzeFile(f.path, f.content, dcFiles))); deadCodeItems.push(...DeadCodeService.findUnusedFiles(dcFiles)); } catch { /* skip */ }

                        progress.report({ message: 'Scanning TODOs...', increment: 10 });
                        try { todoItems = TodoService.scanWorkspace(); } catch { /* skip */ }

                        progress.report({ message: 'Checking dependencies...', increment: 10 });
                        try {
                            const allDeps = DependencyService.getAllDependencies();
                            const outdated = await DependencyService.getOutdated();
                            const vulns = await DependencyService.getVulnerabilities();
                            depReport = {
                                totalDeps: allDeps.length,
                                packageManager: DependencyService.detectPackageManager(),
                                outdated: Object.entries(outdated).map(([name, info]) => ({ name, currentVersion: info.current, latestVersion: info.latest, type: 'dependency' as const, isOutdated: true })),
                                vulnerable: Object.keys(vulns.vulnerabilities ?? {}).map(name => ({ name, currentVersion: '', type: 'dependency' as const, hasVulnerability: true })),
                            };
                        } catch { /* skip */ }

                        progress.report({ message: 'Generating AI summary...', increment: 15 });
                        const healthData = `Security Score: ${securityScore}/100 (${securityIssues.length} issues)\nPerformance Score: ${performanceScore}/100 (${perfIssues.length} issues)\nCode Quality Score: ${qualityScore}/100\nTODOs: ${todoItems.length} items\nDead Code: ${deadCodeItems.length} items\nDependencies: ${depReport.totalDeps ?? 0} total, ${depReport.outdated?.length ?? 0} outdated, ${depReport.vulnerable?.length ?? 0} vulnerable\nFiles analyzed: ${complexityFiles.length}`.trim();
                        const aiSummary = await AiService.generateHealthSummary(apiKey, healthData, learningService.buildContextPrompt());

                        showHealthDashboard({ securityScore, performanceScore, qualityScore, securityIssues: securityIssues.length, perfIssues: perfIssues.length, qualityIssues: qualityIssues.length, todoItems: todoItems.length, deadCodeItems: deadCodeItems.length, complexityFiles, depReport, aiSummary: aiSummary ?? '', ws });
                    }
                );
            } catch (err) { handleError(err, 'healthDashboard'); }
        }),

        // ─── Docs ──────────────────────────────────────────────────────────────
        vscode.commands.registerCommand('sarvis.generateReadme', async () => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;
                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Sarvis generating README...', cancellable: false },
                    async () => {
                        const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                        if (!ws) { vscode.window.showWarningMessage('No workspace folder open.'); return; }
                        let projectContext = '';
                        for (const file of ['package.json', 'package-lock.json', 'tsconfig.json', '.env.example']) {
                            const filePath = path.join(ws, file);
                            if (fs.existsSync(filePath)) projectContext += `\n// ${file}\n${fs.readFileSync(filePath, 'utf-8').slice(0, 1000)}\n`;
                        }
                        const editor = vscode.window.activeTextEditor;
                        if (editor) projectContext += `\n// ${path.basename(editor.document.fileName)}\n${editor.document.getText().slice(0, 2000)}`;
                        const readme = await AiService.generateReadme(apiKey, projectContext);
                        if (!readme) return;
                        const readmePath = path.join(ws, 'README.md');
                        const exists = fs.existsSync(readmePath);
                        if (exists) {
                            const choice = await vscode.window.showWarningMessage('README.md already exists. Overwrite?', { modal: true }, 'Overwrite', 'Preview Only');
                            if (choice === 'Preview Only') {
                                const doc = await vscode.workspace.openTextDocument({ content: readme, language: 'markdown' });
                                await vscode.window.showTextDocument(doc);
                                await vscode.commands.executeCommand('markdown.showPreviewToSide', doc.uri);
                                return;
                            }
                            if (!choice) return;
                        }
                        fs.writeFileSync(readmePath, readme);
                        const doc = await vscode.workspace.openTextDocument(readmePath);
                        await vscode.window.showTextDocument(doc);
                        await vscode.commands.executeCommand('markdown.showPreviewToSide', doc.uri);
                        vscode.window.showInformationMessage('✅ README.md generated!');
                    }
                );
            } catch (err) { handleError(err, 'generateReadme'); }
        }),

        vscode.commands.registerCommand('sarvis.generateSwagger', async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) { vscode.window.showWarningMessage('Open an API file first.'); return; }
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;
                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Sarvis generating Swagger docs...', cancellable: false },
                    async () => {
                        const swagger = await AiService.generateSwaggerDocs(apiKey, editor.document.getText());
                        if (!swagger) return;
                        const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                        const swaggerPath = ws ? path.join(ws, 'swagger.yaml') : undefined;
                        if (swaggerPath) {
                            fs.writeFileSync(swaggerPath, swagger);
                            const doc = await vscode.workspace.openTextDocument(swaggerPath);
                            await vscode.window.showTextDocument(doc);
                            vscode.window.showInformationMessage('✅ swagger.yaml generated!');
                        } else {
                            const doc = await vscode.workspace.openTextDocument({ content: swagger, language: 'yaml' });
                            await vscode.window.showTextDocument(doc);
                        }
                    }
                );
            } catch (err) { handleError(err, 'generateSwagger'); }
        }),

        vscode.commands.registerCommand('sarvis.generateApiDocs', async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) { vscode.window.showWarningMessage('Open a file first.'); return; }
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;
                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Sarvis generating API docs...', cancellable: false },
                    async () => {
                        const docs = await AiService.generateApiDocs(apiKey, editor.document.getText(), editor.document.languageId);
                        if (!docs) return;
                        const doc = await vscode.workspace.openTextDocument({ content: docs, language: 'markdown' });
                        await vscode.window.showTextDocument(doc);
                        await vscode.commands.executeCommand('markdown.showPreviewToSide', doc.uri);
                    }
                );
            } catch (err) { handleError(err, 'generateApiDocs'); }
        }),

        // ─── Codebase QA ───────────────────────────────────────────────────────
        vscode.commands.registerCommand('sarvis.indexCodebase', async () => {
            await vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: 'Sarvis: Indexing codebase...', cancellable: false },
                async () => { await indexService.buildIndex(); }
            );
            vscode.window.showInformationMessage(`Sarvis: Indexed ${indexService.chunkCount} code chunks.`);
        }),

        vscode.commands.registerCommand('sarvis.askCodebase', async () => {
            const apiKey = await context.secrets.get(SECRET_KEY);
            if (!apiKey) { vscode.window.showErrorMessage('Set your API key first.'); return; }
            const question = await vscode.window.showInputBox({ prompt: 'Ask about your codebase...', placeHolder: 'Where is auth handled?' });
            if (!question) return;
            const chunks = await indexService.search(apiKey, question);
            const answer = await AiService.codebaseQA(apiKey, question, chunks);
            const content = `# 🔍 Sarvis Codebase Q&A\n\n---\n\n## ❓ Question\n\n${question}\n\n---\n\n## 💡 Answer\n\n${answer}\n\n---\n\n*Powered by Sarvam AI*`;
            const doc = await vscode.workspace.openTextDocument({ content, language: 'markdown' });
            await vscode.window.showTextDocument(doc, { preview: true });
            await vscode.commands.executeCommand('markdown.showPreviewToSide', doc.uri);
        })
    );
}
