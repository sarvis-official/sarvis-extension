import * as vscode from 'vscode';
import { AiService } from '../services/AiService';
import { SECRET_KEY } from '../types';
import { LearningService } from '../services/LearningService';
import { SessionMemoryService } from '../services/SessionMemoryService';

// ── Trigger words that activate smart snippets ─────────────────────────────
const SNIPPET_TRIGGERS: Record<string, string> = {
    // Auth patterns
    'useAuth': 'Generate an authentication hook/function using the project\'s auth pattern',
    'authMiddleware': 'Generate authentication middleware for this project',
    'jwtVerify': 'Generate JWT verification logic',

    // API patterns
    'apiCall': 'Generate an API call function using the project\'s fetch/axios pattern',
    'apiGet': 'Generate a GET API request function',
    'apiPost': 'Generate a POST API request function',
    'useApi': 'Generate a custom hook for API calls with loading and error states',

    // Component patterns
    'reactComp': 'Generate a React functional component with the project\'s style',
    'useStore': 'Generate a state management hook using the project\'s store pattern',
    'useForm': 'Generate a form handler with validation',

    // Error handling
    'tryCatch': 'Generate a try/catch block with proper error handling for this project',
    'errorHandler': 'Generate an error handler following the project\'s error pattern',

    // Database patterns
    'dbQuery': 'Generate a database query following the project\'s ORM pattern',
    'dbModel': 'Generate a database model for this project',
    'findById': 'Generate a findById database function',

    // Testing
    'testCase': 'Generate a test case using the project\'s testing pattern',
    'mockApi': 'Generate an API mock for testing',

    // Utility
    'logger': 'Generate a logger utility matching the project\'s logging style',
    'validator': 'Generate input validation following the project\'s validation pattern',
    'paginate': 'Generate pagination logic for this project',
    'cacheFunc': 'Generate a caching wrapper function',
    'debounce': 'Generate a debounce function',
    'throttle': 'Generate a throttle function',
    'formatDate': 'Generate a date formatting utility',
    'envConfig': 'Generate environment configuration setup',
};

export class SmartSnippetProvider implements vscode.CompletionItemProvider {

    private cache = new Map<string, string>();

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly learningService: LearningService,
        private readonly sessionMemory: SessionMemoryService
    ) { }

    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.CompletionItem[]> {

        const linePrefix = document.lineAt(position).text
            .slice(0, position.character).trim();

        // Find matching trigger
        const matchedTrigger = Object.keys(SNIPPET_TRIGGERS).find(trigger =>
            linePrefix.endsWith(trigger) || linePrefix === trigger
        );

        if (!matchedTrigger) return [];

        // Build completion item with lazy generation
        const item = new vscode.CompletionItem(
            `⚡ ${matchedTrigger} — Sarvis Smart Snippet`,
            vscode.CompletionItemKind.Snippet
        );

        item.detail = 'Sarvis: Generate from your codebase patterns';
        item.documentation = new vscode.MarkdownString(
            `**Sarvis Smart Snippet**\n\n${SNIPPET_TRIGGERS[matchedTrigger]}\n\n*Learns from your actual code patterns*`
        );
        item.sortText = '0000'; // appear at top
        item.filterText = matchedTrigger;

        // Command to trigger generation when accepted
        item.command = {
            command: 'sarvis.generateSmartSnippet',
            title: 'Generate Smart Snippet',
            arguments: [matchedTrigger, document, position]
        };

        // Insert placeholder text first (replaced by command)
        item.insertText = '';

        return [item];
    }
}