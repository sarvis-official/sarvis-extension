import * as vscode from 'vscode';
import * as path from 'path';
import { AiService } from '../services/AiService';
import { LearningService } from '../services/LearningService';
import { SecurityService, SecurityIssue } from '../services/SecurityService';
import { PerformanceService, PerformanceIssue } from '../services/PerformanceService';
import { ComplexityService, FileComplexity } from '../services/ComplexityService';
import { DeadCodeService, DeadCodeItem } from '../services/DeadCodeService';
import { DependencyService, DependencyReport } from '../services/DependencyService';
import { CodeSmellService, SmellReport } from '../services/CodeSmellService';
import { handleError } from '../utils/errorHandler';
import { showSecurityPanel } from '../panels/securityPanel';
import { showPerformancePanel } from '../panels/performancePanel';
import { showComplexityPanel } from '../panels/complexityPanel';
import { showDeadCodePanel } from '../panels/deadCodePanel';
import { showDependencyPanel } from '../panels/dependencyPanel';
import { showSmellPanel } from '../panels/smellPanel';
import { requireApiKey } from '../helpers/requireApiKey';

export function registerAnalysisCommands(
    context: vscode.ExtensionContext,
    learningService: LearningService
): void {

    // ─── Security ──────────────────────────────────────────────────────────────
    context.subscriptions.push(

        vscode.commands.registerCommand('sarvis.scanSecurityFile', async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) { vscode.window.showWarningMessage('Open a file first.'); return; }
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;

                const code = editor.document.getText();
                const language = editor.document.languageId;
                const filePath = editor.document.uri.fsPath;
                const fileName = path.basename(filePath);
                let result: string | null = null, issues: SecurityIssue[] = [];

                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: `Sarvis scanning ${fileName} for vulnerabilities...`, cancellable: false },
                    async () => {
                        issues = SecurityService.analyzeFile(filePath, code);
                        const staticSummary = issues.length > 0
                            ? issues.map(i => `[${i.severity.toUpperCase()}] ${i.type} — ${i.message} ${i.cwe ? `(${i.cwe})` : ''}`).join('\n')
                            : 'No static vulnerabilities detected';
                        result = await AiService.scanSecurity(apiKey, code, language, fileName, staticSummary, learningService.buildContextPrompt());
                    }
                );
                if (result) showSecurityPanel(`🔒 Security Scan: ${fileName}`, result, issues);
            } catch (err) { handleError(err, 'scanSecurityFile'); }
        }),

        vscode.commands.registerCommand('sarvis.scanSecurityProject', async () => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;
                const files = SecurityService.collectFiles(25);
                if (files.length === 0) { vscode.window.showWarningMessage('No files found in workspace.'); return; }

                let result: string | null = null;
                const allIssues: SecurityIssue[] = [];

                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: `Sarvis scanning ${files.length} files for vulnerabilities...`, cancellable: false },
                    async (progress) => {
                        files.forEach((f, i) => {
                            progress.report({ message: `Scanning ${path.basename(f.path)}...`, increment: 60 / files.length });
                            allIssues.push(...SecurityService.analyzeFile(f.path, f.content));
                        });
                        progress.report({ message: 'AI deep security audit...', increment: 20 });
                        const criticalFiles = files.filter(f => SecurityService.analyzeFile(f.path, f.content).some(i => i.severity === 'critical' || i.severity === 'high')).slice(0, 3);
                        const focusFiles = criticalFiles.length > 0 ? criticalFiles : files.slice(0, 3);
                        const combinedCode = focusFiles.map(f => `### ${path.basename(f.path)}\n${f.content.slice(0, 1500)}`).join('\n\n');
                        const staticSummary = allIssues.length > 0
                            ? allIssues.map(i => `[${i.severity.toUpperCase()}] ${i.file}:${i.line ?? '?'} — ${i.type}: ${i.message}`).join('\n')
                            : 'No static vulnerabilities detected';
                        result = await AiService.scanSecurity(apiKey, combinedCode, 'mixed', 'project', staticSummary, learningService.buildContextPrompt());
                    }
                );
                if (result) showSecurityPanel('🔒 Project Security Scan', result, allIssues);
            } catch (err) { handleError(err, 'scanSecurityProject'); }
        }),

        // ─── Performance ───────────────────────────────────────────────────────
        vscode.commands.registerCommand('sarvis.analyzePerformanceFile', async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) { vscode.window.showWarningMessage('Open a file first.'); return; }
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;

                const code = editor.document.getText();
                const language = editor.document.languageId;
                const filePath = editor.document.uri.fsPath;
                const fileName = path.basename(filePath);
                let result: string | null = null;
                let issues: PerformanceIssue[] = [];

                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: `Sarvis analyzing performance of ${fileName}...`, cancellable: false },
                    async () => {
                        issues = PerformanceService.analyzeFile(filePath, code);
                        result = await AiService.analyzePerformance(apiKey, code, language, fileName, learningService.buildContextPrompt());
                    }
                );
                if (result) showPerformancePanel(`⚡ Performance: ${fileName}`, result, issues);
            } catch (err) { handleError(err, 'analyzePerformanceFile'); }
        }),

        vscode.commands.registerCommand('sarvis.analyzePerformanceProject', async () => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;
                const files = PerformanceService.collectFiles(20);
                if (files.length === 0) { vscode.window.showWarningMessage('No files found in workspace.'); return; }

                let result: string | null = null;
                const allIssues: PerformanceIssue[] = [];

                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: `Sarvis analyzing ${files.length} files...`, cancellable: false },
                    async (progress) => {
                        files.forEach(f => allIssues.push(...PerformanceService.analyzeFile(f.path, f.content)));
                        progress.report({ message: 'AI deep analysis...', increment: 60 });
                        const filesContext = files.map(f => `### ${path.basename(f.path)} (${f.language})\n\`\`\`\n${f.content.slice(0, 1000)}\n\`\`\``).join('\n\n');
                        result = await AiService.analyzePerformanceProject(apiKey, filesContext, learningService.buildContextPrompt());
                    }
                );
                if (result) showPerformancePanel('⚡ Project Performance Analysis', result, allIssues);
            } catch (err) { handleError(err, 'analyzePerformanceProject'); }
        }),

        // ─── Complexity ────────────────────────────────────────────────────────
        vscode.commands.registerCommand('sarvis.complexityMap', async () => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;
                const files = ComplexityService.collectFiles();
                if (files.length === 0) { vscode.window.showWarningMessage('No files found in workspace.'); return; }

                let fileComplexities: FileComplexity[] = [];
                let aiAnalysis: string | null = null;

                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: `Sarvis analyzing complexity of ${files.length} files...`, cancellable: false },
                    async (progress) => {
                        files.forEach((f, i) => {
                            progress.report({ message: `Analyzing ${path.basename(f.path)}...`, increment: 70 / files.length });
                            fileComplexities.push(ComplexityService.analyzeFile(f.path, f.content));
                        });
                        fileComplexities.sort((a, b) => b.score - a.score);
                        progress.report({ message: 'AI analysis...', increment: 20 });
                        const summary = fileComplexities.map(f => {
                            const topFns = f.functions.slice(0, 3).map(fn => `    - ${fn.name}(): ${fn.lines} lines, cyclomatic=${fn.cyclomaticComplexity}, score=${fn.score}`).join('\n');
                            return `${f.relativePath} (Grade: ${f.grade}, Score: ${f.score}/100, ${f.totalLines} lines, ${f.totalFunctions} functions)\n${topFns}`;
                        }).join('\n\n');
                        aiAnalysis = await AiService.analyzeComplexity(apiKey, summary, learningService.buildContextPrompt());
                    }
                );
                showComplexityPanel(fileComplexities, aiAnalysis ?? '', context);
            } catch (err) { handleError(err, 'complexityMap'); }
        }),

        // ─── Dead Code ─────────────────────────────────────────────────────────
        vscode.commands.registerCommand('sarvis.findDeadCodeFile', async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) { vscode.window.showWarningMessage('Open a file first.'); return; }
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;

                const code = editor.document.getText();
                const language = editor.document.languageId;
                const filePath = editor.document.uri.fsPath;
                const fileName = path.basename(filePath);
                let result: string | null = null, items: DeadCodeItem[] = [];

                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: `Sarvis finding dead code in ${fileName}...`, cancellable: false },
                    async () => {
                        const allFiles = DeadCodeService.collectFiles();
                        items = DeadCodeService.analyzeFile(filePath, code, allFiles);
                        const staticSummary = items.length > 0
                            ? items.map(i => `[${i.severity.toUpperCase()}] ${i.type} — ${i.message}`).join('\n')
                            : 'No static dead code detected';
                        result = await AiService.findDeadCode(apiKey, code, language, fileName, staticSummary, learningService.buildContextPrompt());
                    }
                );
                if (result) showDeadCodePanel(`🪦 Dead Code: ${fileName}`, result, items);
            } catch (err) { handleError(err, 'findDeadCodeFile'); }
        }),

        vscode.commands.registerCommand('sarvis.findDeadCodeProject', async () => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;
                const files = DeadCodeService.collectFiles();
                if (files.length === 0) { vscode.window.showWarningMessage('No files found in workspace.'); return; }

                let result: string | null = null;
                const allItems: DeadCodeItem[] = [];

                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: `Sarvis finding dead code across ${files.length} files...`, cancellable: false },
                    async (progress) => {
                        files.forEach((f, i) => {
                            progress.report({ message: `Analyzing ${path.basename(f.path)}...`, increment: 50 / files.length });
                            allItems.push(...DeadCodeService.analyzeFile(f.path, f.content, files));
                        });
                        progress.report({ message: 'Finding unused files...', increment: 10 });
                        allItems.push(...DeadCodeService.findUnusedFiles(files));
                        progress.report({ message: 'AI deep analysis...', increment: 20 });
                        const worstFiles = files.map(f => ({ file: f, count: DeadCodeService.analyzeFile(f.path, f.content, files).length })).sort((a, b) => b.count - a.count).slice(0, 3).map(x => x.file);
                        const combinedCode = worstFiles.map(f => `### ${path.basename(f.path)}\n${f.content.slice(0, 1200)}`).join('\n\n');
                        const staticSummary = allItems.length > 0
                            ? allItems.map(i => `[${i.severity.toUpperCase()}] ${i.file}:${i.line ?? '?'} — ${i.type}: ${i.message}`).join('\n')
                            : 'No static dead code detected';
                        result = await AiService.findDeadCode(apiKey, combinedCode, 'mixed', 'project', staticSummary, learningService.buildContextPrompt());
                    }
                );
                if (result) showDeadCodePanel('🪦 Dead Code: Project', result, allItems);
            } catch (err) { handleError(err, 'findDeadCodeProject'); }
        }),

        // ─── Dependencies ──────────────────────────────────────────────────────
        vscode.commands.registerCommand('sarvis.analyzeDependencies', async () => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;
                const pm = DependencyService.detectPackageManager();
                if (pm === 'unknown') { vscode.window.showWarningMessage('No package.json found. Open a Node.js project.'); return; }
                const pkg = DependencyService.readPackageJson();
                if (!pkg) { vscode.window.showWarningMessage('Could not read package.json.'); return; }

                let result: string | null = null;
                let report: Partial<DependencyReport> = {};

                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: 'Sarvis analyzing dependencies...', cancellable: false },
                    async (progress) => {
                        const allDeps = DependencyService.getAllDependencies();
                        report.totalDeps = allDeps.length;
                        report.packageManager = pm;

                        progress.report({ message: 'Checking for outdated packages...', increment: 20 });
                        const outdatedRaw = await DependencyService.getOutdated();
                        progress.report({ message: 'Running security audit...', increment: 20 });
                        const auditRaw = await DependencyService.getVulnerabilities();
                        progress.report({ message: 'Finding unused dependencies...', increment: 20 });
                        const unusedNames = DependencyService.findUnusedDependencies(allDeps);
                        const heavyDeps = DependencyService.getHeavyPackages(allDeps);
                        const duplicates = DependencyService.findDuplicates(allDeps);
                        const vulnerableNames = Object.keys(auditRaw.vulnerabilities ?? {});
                        const updateCmds = DependencyService.generateUpdateCommands(outdatedRaw, vulnerableNames, unusedNames, pm);
                        report.updateCommands = updateCmds;
                        report.duplicates = duplicates;

                        progress.report({ message: 'AI analysis...', increment: 20 });
                        const outdatedStr = Object.entries(outdatedRaw).map(([n, i]) => `${n}: ${i.current} → ${i.latest}`).join('\n') || 'None detected';
                        const vulnerableStr = vulnerableNames.join(', ') || 'None detected';
                        const unusedStr = unusedNames.join(', ') || 'None detected';
                        const heavyStr = heavyDeps.length > 0 ? heavyDeps.map(d => `${d.name}: ${d.size}`).join('\n') : 'None detected';

                        result = await AiService.analyzeDependencies(apiKey, JSON.stringify(pkg, null, 2).slice(0, 2000), outdatedStr, vulnerableStr, unusedStr, heavyStr, updateCmds.join('\n'), learningService.buildContextPrompt());

                        report = {
                            ...report,
                            outdated: Object.entries(outdatedRaw).map(([name, info]) => ({ name, currentVersion: info.current, latestVersion: info.latest, type: 'dependency' as const, isOutdated: true })),
                            vulnerable: vulnerableNames.map(name => ({ name, currentVersion: '', type: 'dependency' as const, hasVulnerability: true })),
                            unused: unusedNames.map(name => ({ name, currentVersion: '', type: 'dependency' as const, isUnused: true })),
                            heaviest: heavyDeps,
                            duplicates
                        };
                    }
                );
                if (result) showDependencyPanel('📦 Dependency Analysis', result, report as DependencyReport);
            } catch (err) { handleError(err, 'analyzeDependencies'); }
        }),

        // ─── Code Smells ───────────────────────────────────────────────────────
        vscode.commands.registerCommand('sarvis.detectSmellsFile', async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) { vscode.window.showWarningMessage('Open a file first.'); return; }
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;

                const code = editor.document.getText();
                const language = editor.document.languageId;
                const filePath = editor.document.uri.fsPath;
                const fileName = path.basename(filePath);
                let result: string | null = null, report: SmellReport | null = null;

                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: `Sarvis analyzing ${fileName}...`, cancellable: false },
                    async () => {
                        const smells = CodeSmellService.analyzeFile(filePath, code);
                        const score = CodeSmellService.calculateScore(smells);
                        report = { file: fileName, smells, score };
                        const staticSummary = smells.length > 0 ? smells.map(s => `[${s.severity.toUpperCase()}] ${s.message}`).join('\n') : 'No static smells detected';
                        result = await AiService.analyzeCodeSmells(apiKey, staticSummary, code, language, fileName, learningService.buildContextPrompt());
                    }
                );
                if (result && report) showSmellPanel(`🧪 Code Smells: ${fileName}`, result, [report]);
            } catch (err) { handleError(err, 'detectSmellsFile'); }
        }),

        vscode.commands.registerCommand('sarvis.detectSmellsProject', async () => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;
                const files = CodeSmellService.collectFiles();
                if (files.length === 0) { vscode.window.showWarningMessage('No files found in workspace.'); return; }

                let result: string | null = null;
                const reports: SmellReport[] = [];

                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: `Sarvis scanning ${files.length} files...`, cancellable: false },
                    async (progress) => {
                        files.forEach((f, i) => {
                            progress.report({ message: `Scanning ${path.basename(f.path)}...`, increment: 60 / files.length });
                            const smells = CodeSmellService.analyzeFile(f.path, f.content);
                            reports.push({ file: f.path, smells, score: CodeSmellService.calculateScore(smells) });
                        });
                        progress.report({ message: 'AI deep analysis...', increment: 20 });
                        const worstFiles = [...reports].sort((a, b) => b.smells.length - a.smells.length).slice(0, 3);
                        const staticSummary = CodeSmellService.formatForAI(worstFiles);
                        const worstCode = worstFiles.map(r => {
                            const f = files.find(f => f.path === r.file);
                            return f ? `### ${r.file}\n${f.content.slice(0, 1500)}` : '';
                        }).join('\n\n');
                        result = await AiService.analyzeCodeSmells(apiKey, staticSummary, worstCode, 'mixed', 'project', learningService.buildContextPrompt());
                    }
                );
                if (result) showSmellPanel('🧪 Project Code Smells', result, reports);
            } catch (err) { handleError(err, 'detectSmellsProject'); }
        })
    );
}
