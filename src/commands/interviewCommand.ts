import * as vscode from 'vscode';
import { handleError } from '../utils/errorHandler';
import { requireApiKey } from './requireApiKey';
import { AiInterviewService, InterviewDifficulty, InterviewTopic } from '../services/AiService/ai.interview';
import { showInterviewPanel } from '../panels/interviewPanel';

const SESSION_KEY = 'sarvis.interviewHistory';

export function registerInterviewCommand(context: vscode.ExtensionContext): void {

    context.subscriptions.push(
        vscode.commands.registerCommand('sarvis.practiceInterview', async () => {
            try {
                const apiKey = await requireApiKey(context);
                if (!apiKey) return;

                // ── Step 1: Pick difficulty ────────────────────────────────────
                const difficultyPick = await vscode.window.showQuickPick([
                    { label: '🟢 Easy', description: 'Arrays, strings, basic loops', value: 'easy' as InterviewDifficulty },
                    { label: '🟡 Medium', description: 'Trees, binary search, sliding window', value: 'medium' as InterviewDifficulty },
                    { label: '🔴 Hard', description: 'Graphs, DP, advanced algorithms', value: 'hard' as InterviewDifficulty },
                ], { placeHolder: 'Select difficulty level' });
                if (!difficultyPick) return;

                // ── Step 2: Pick topic ─────────────────────────────────────────
                const topicPick = await vscode.window.showQuickPick([
                    { label: '📊 Arrays & Hashing', value: 'arrays' as InterviewTopic },
                    { label: '🔤 Strings', value: 'strings' as InterviewTopic },
                    { label: '🌳 Trees & BST', value: 'trees' as InterviewTopic },
                    { label: '🕸️ Graphs', value: 'graphs' as InterviewTopic },
                    { label: '🧮 Dynamic Programming', value: 'dp' as InterviewTopic },
                    { label: '🔀 Sorting & Search', value: 'sorting' as InterviewTopic },
                    { label: '🏗️ System Design', value: 'system-design' as InterviewTopic },
                    { label: '🧩 OOP & Design Patterns', value: 'oop' as InterviewTopic },
                    { label: '🎲 Mixed / Surprise me', value: 'mixed' as InterviewTopic },
                ], { placeHolder: 'Select topic' });
                if (!topicPick) return;

                // ── Step 3: Pick language ──────────────────────────────────────
                const languagePick = await vscode.window.showQuickPick([
                    { label: 'TypeScript', value: 'typescript' },
                    { label: 'JavaScript', value: 'javascript' },
                    { label: 'Python', value: 'python' },
                    { label: 'Java', value: 'java' },
                    { label: 'Go', value: 'go' },
                ], { placeHolder: 'Select language' });
                if (!languagePick) return;

                // Load history to avoid repeats
                const history: string[] = context.globalState.get(SESSION_KEY, []);

                let problem = null;

                await vscode.window.withProgress(
                    { location: vscode.ProgressLocation.Notification, title: '⚡ Sarvis generating your interview problem...', cancellable: false },
                    async () => {
                        problem = await AiInterviewService.generateProblem(
                            apiKey,
                            difficultyPick.value,
                            topicPick.value,
                            languagePick.value,
                            history
                        );
                    }
                );

                if (!problem) {
                    vscode.window.showErrorMessage('Could not generate problem. Try again.');
                    return;
                }

                // Save to history (keep last 20)
                history.push((problem as any).title);
                context.globalState.update(SESSION_KEY, history.slice(-20));

                // ── Open the interview panel ───────────────────────────────────
                showInterviewPanel(problem, languagePick.value, apiKey, context);

            } catch (err) { handleError(err, 'practiceInterview'); }
        })
    );
}