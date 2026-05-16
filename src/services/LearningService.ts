import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface UserPattern {
    id: string;
    type: 'naming' | 'style' | 'architecture' | 'pattern';
    description: string;
    example: string;
    language: string;
    frequency: number;
    lastSeen: number;
}

export interface UserProfile {
    patterns: UserPattern[];
    preferredLanguages: string[];
    namingConventions: {
        variables: string;
        functions: string;
        classes: string;
        files: string;
    };
    stylePreferences: {
        indentation: 'tabs' | 'spaces';
        indentSize: number;
        semicolons: boolean;
        quotes: 'single' | 'double';
        trailingCommas: boolean;
    };
    architectureNotes: string[];
    lastUpdated: number;
}

const PROFILE_FILE = '.sarvis-profile.json';

const DEFAULT_PROFILE: UserProfile = {
    patterns: [],
    preferredLanguages: [],
    namingConventions: {
        variables: 'camelCase',
        functions: 'camelCase',
        classes: 'PascalCase',
        files: 'camelCase'
    },
    stylePreferences: {
        indentation: 'spaces',
        indentSize: 4,
        semicolons: true,
        quotes: 'single',
        trailingCommas: false
    },
    architectureNotes: [],
    lastUpdated: Date.now()
};

export class LearningService {
    private profile: UserProfile = { ...DEFAULT_PROFILE };
    private profilePath: string = '';

    constructor(private context: vscode.ExtensionContext) { }

    // ── Load profile from disk ──────────────────────────────────────────────
    async load(): Promise<void> {
        const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!ws) return;

        this.profilePath = path.join(ws, PROFILE_FILE);

        if (fs.existsSync(this.profilePath)) {
            try {
                const raw = fs.readFileSync(this.profilePath, 'utf-8');
                this.profile = { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
            } catch {
                this.profile = { ...DEFAULT_PROFILE };
            }
        }
    }

    // ── Save profile to disk ────────────────────────────────────────────────
    private save(): void {
        if (!this.profilePath) return;
        this.profile.lastUpdated = Date.now();
        fs.writeFileSync(this.profilePath, JSON.stringify(this.profile, null, 2));
    }

    // ── Analyze a file and learn from it ───────────────────────────────────
    analyzeAndLearn(code: string, language: string): void {
        if (!code.trim()) return;

        // Learn preferred languages
        if (!this.profile.preferredLanguages.includes(language)) {
            this.profile.preferredLanguages.push(language);
        }

        // Detect indentation
        const tabLines = (code.match(/^\t/gm) ?? []).length;
        const spaceLines = (code.match(/^  /gm) ?? []).length;
        if (tabLines > spaceLines) {
            this.profile.stylePreferences.indentation = 'tabs';
        } else if (spaceLines > tabLines) {
            this.profile.stylePreferences.indentation = 'spaces';
            const twoSpace = (code.match(/^  [^ ]/gm) ?? []).length;
            const fourSpace = (code.match(/^    [^ ]/gm) ?? []).length;
            this.profile.stylePreferences.indentSize = twoSpace > fourSpace ? 2 : 4;
        }

        // Detect quotes
        const singleQuotes = (code.match(/'/g) ?? []).length;
        const doubleQuotes = (code.match(/"/g) ?? []).length;
        this.profile.stylePreferences.quotes = singleQuotes >= doubleQuotes ? 'single' : 'double';

        // Detect semicolons
        const linesWithSemi = (code.match(/;$/gm) ?? []).length;
        const totalLines = code.split('\n').length;
        this.profile.stylePreferences.semicolons = linesWithSemi > totalLines * 0.3;

        // Detect naming conventions
        const camelCaseVars = (code.match(/\b(const|let|var)\s+[a-z][a-zA-Z0-9]*\b/g) ?? []).length;
        const snakeCaseVars = (code.match(/\b(const|let|var)\s+[a-z][a-z_0-9]*_[a-z]/g) ?? []).length;
        if (snakeCaseVars > camelCaseVars) {
            this.profile.namingConventions.variables = 'snake_case';
            this.profile.namingConventions.functions = 'snake_case';
        } else {
            this.profile.namingConventions.variables = 'camelCase';
            this.profile.namingConventions.functions = 'camelCase';
        }

        // Detect common patterns
        this._detectPatterns(code, language);

        this.save();
    }

    // ── Detect reusable code patterns ──────────────────────────────────────
    private _detectPatterns(code: string, language: string): void {
        const patternChecks: Array<{ regex: RegExp; type: UserPattern['type']; description: string }> = [
            // ── Advanced patterns (original) ──
            { regex: /async\s+\w+\s*\(.*\)\s*{[\s\S]*?await/g, type: 'pattern', description: 'Async/await pattern' },
            { regex: /try\s*{[\s\S]*?}\s*catch/g, type: 'pattern', description: 'Try/catch error handling' },
            { regex: /\.(map|filter|reduce)\s*\(/g, type: 'pattern', description: 'Functional array methods' },
            { regex: /class\s+\w+\s*(extends\s+\w+)?\s*{/g, type: 'architecture', description: 'Class-based architecture' },
            { regex: /export\s+(default\s+)?function/g, type: 'architecture', description: 'Function exports pattern' },
            { regex: /interface\s+\w+\s*{/g, type: 'pattern', description: 'TypeScript interfaces' },
            { regex: /useState|useEffect|useCallback/g, type: 'pattern', description: 'React hooks pattern' },

            // ── Basic patterns (new) ──
            { regex: /function\s+\w+\s*\(/g, type: 'pattern', description: 'Named functions' },
            { regex: /const\s+\w+\s*=/g, type: 'style', description: 'Const variable declarations' },
            { regex: /let\s+\w+\s*=/g, type: 'style', description: 'Let variable declarations' },
            { regex: /=>\s*{/g, type: 'pattern', description: 'Arrow functions' },
            { regex: /if\s*\(.*\)\s*{/g, type: 'pattern', description: 'If statements' },
            { regex: /switch\s*\(.*\)\s*{/g, type: 'pattern', description: 'Switch statements' },
            { regex: /for\s*\(.*\)\s*{/g, type: 'pattern', description: 'For loops' },
            { regex: /return\s+.+;/g, type: 'pattern', description: 'Return statements' },
            { regex: /console\.(log|error|warn)\s*\(/g, type: 'style', description: 'Console logging' },
            { regex: /throw\s+new\s+\w+/g, type: 'pattern', description: 'Error throwing' },
            { regex: /module\.exports\s*=/g, type: 'architecture', description: 'CommonJS exports' },
            { regex: /require\s*\(/g, type: 'architecture', description: 'CommonJS imports' },
            { regex: /import\s+.*\s+from\s+/g, type: 'architecture', description: 'ES module imports' },
        ];

        for (const check of patternChecks) {
            const matches = code.match(check.regex);
            if (matches && matches.length > 0) {
                const existing = this.profile.patterns.find(
                    p => p.description === check.description && p.language === language
                );
                if (existing) {
                    existing.frequency += matches.length;
                    existing.lastSeen = Date.now();
                } else {
                    this.profile.patterns.push({
                        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                        type: check.type,
                        description: check.description,
                        example: matches[0].slice(0, 100),
                        language,
                        frequency: matches.length,
                        lastSeen: Date.now()
                    });
                }
            }
        }
    }

    // ── Build context string to inject into AI prompts ─────────────────────
    buildContextPrompt(): string {
        if (this.profile.patterns.length === 0) return '';

        const topPatterns = [...this.profile.patterns]
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, 5)
            .map(p => `- ${p.description} (used ${p.frequency}x)`)
            .join('\n');

        const style = this.profile.stylePreferences;
        const naming = this.profile.namingConventions;

        return `
## User's Coding Preferences (learned from their codebase):
- Indentation: ${style.indentation} (${style.indentSize} spaces)
- Quotes: ${style.quotes}
- Semicolons: ${style.semicolons ? 'yes' : 'no'}
- Variable naming: ${naming.variables}
- Function naming: ${naming.functions}
- Class naming: ${naming.classes}
- Preferred languages: ${this.profile.preferredLanguages.join(', ')}

## Common Patterns They Use:
${topPatterns}

IMPORTANT: Match the user's exact coding style in all suggestions.`.trim();
    }

    // ── Add a manual architecture note ─────────────────────────────────────
    addArchitectureNote(note: string): void {
        if (!this.profile.architectureNotes.includes(note)) {
            this.profile.architectureNotes.push(note);
            this.save();
        }
    }

    // ── Reset profile ───────────────────────────────────────────────────────
    resetProfile(): void {
        this.profile = { ...DEFAULT_PROFILE };
        if (this.profilePath && fs.existsSync(this.profilePath)) {
            fs.unlinkSync(this.profilePath);
        }
    }

    get currentProfile(): UserProfile { return this.profile; }
    get hasLearnedData(): boolean { return this.profile.patterns.length > 0; }
}