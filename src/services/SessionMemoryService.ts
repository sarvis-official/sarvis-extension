import * as vscode from 'vscode';
import * as path from 'path';

export interface MemoryEntry {
    id: string;
    type: 'bug' | 'feature' | 'change' | 'note' | 'context';
    content: string;
    file?: string;
    timestamp: number;
    tags: string[];
}

export interface SessionMemory {
    entries: MemoryEntry[];
    currentBug: string;
    currentFeature: string;
    recentChanges: string[];
    projectGoal: string;
    lastUpdated: number;
}

const DEFAULT_MEMORY: SessionMemory = {
    entries: [],
    currentBug: '',
    currentFeature: '',
    recentChanges: [],
    projectGoal: '',
    lastUpdated: Date.now()
};

export class SessionMemoryService {

    private memory: SessionMemory = { ...DEFAULT_MEMORY };
    private readonly MAX_ENTRIES = 50;
    private readonly MAX_CHANGES = 10;
    private readonly STORAGE_KEY = 'sarvis.sessionMemory';

    constructor(private context: vscode.ExtensionContext) { }

    // ── Load from workspace state ──────────────────────────────────────────
    load(): void {
        const saved = this.context.workspaceState.get<SessionMemory>(this.STORAGE_KEY);
        if (saved) {
            this.memory = { ...DEFAULT_MEMORY, ...saved };
        }
    }

    // ── Save to workspace state ────────────────────────────────────────────
    private save(): void {
        this.memory.lastUpdated = Date.now();
        this.context.workspaceState.update(this.STORAGE_KEY, this.memory);
    }

    // ── Add a memory entry ─────────────────────────────────────────────────
    addEntry(
        type: MemoryEntry['type'],
        content: string,
        file?: string,
        tags: string[] = []
    ): void {
        const entry: MemoryEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            type, content, file,
            timestamp: Date.now(),
            tags
        };

        this.memory.entries.unshift(entry);

        // Keep only recent entries
        if (this.memory.entries.length > this.MAX_ENTRIES) {
            this.memory.entries = this.memory.entries.slice(0, this.MAX_ENTRIES);
        }

        // Auto-update shortcuts
        if (type === 'bug') this.memory.currentBug = content;
        if (type === 'feature') this.memory.currentFeature = content;
        if (type === 'change') {
            this.memory.recentChanges.unshift(content);
            if (this.memory.recentChanges.length > this.MAX_CHANGES) {
                this.memory.recentChanges = this.memory.recentChanges.slice(0, this.MAX_CHANGES);
            }
        }

        this.save();
    }

    // ── Auto-capture from file saves ───────────────────────────────────────
    captureFileSave(document: vscode.TextDocument): void {
        const fileName = path.basename(document.fileName);
        const change = `Modified ${fileName} at ${new Date().toLocaleTimeString()}`;
        this.addEntry('change', change, document.fileName);
    }

    // ── Auto-capture from git commits ──────────────────────────────────────
    captureGitCommit(message: string): void {
        this.addEntry('change', `Git commit: ${message}`);
    }

    // ── Build context string for AI prompts ────────────────────────────────
    buildContextPrompt(): string {
        if (!this.hasMemory) return '';

        const parts: string[] = ['## 🧠 Session Memory (What Sarvis knows about your current work):'];

        if (this.memory.projectGoal) {
            parts.push(`**Project Goal:** ${this.memory.projectGoal}`);
        }

        if (this.memory.currentBug) {
            parts.push(`**Current Bug Being Fixed:** ${this.memory.currentBug}`);
        }

        if (this.memory.currentFeature) {
            parts.push(`**Current Feature Being Built:** ${this.memory.currentFeature}`);
        }

        if (this.memory.recentChanges.length > 0) {
            parts.push(`**Recent Changes:**\n${this.memory.recentChanges.slice(0, 5).map(c => `- ${c}`).join('\n')}`);
        }

        const recentNotes = this.memory.entries
            .filter(e => e.type === 'note' || e.type === 'context')
            .slice(0, 3);

        if (recentNotes.length > 0) {
            parts.push(`**Notes & Context:**\n${recentNotes.map(n => `- ${n.content}`).join('\n')}`);
        }

        parts.push('Use this context to give more relevant and targeted suggestions.');

        return parts.join('\n\n');
    }

    // ── Quick setters ──────────────────────────────────────────────────────
    setCurrentBug(bug: string): void {
        this.memory.currentBug = bug;
        this.addEntry('bug', bug);
    }

    setCurrentFeature(feature: string): void {
        this.memory.currentFeature = feature;
        this.addEntry('feature', feature);
    }

    setProjectGoal(goal: string): void {
        this.memory.projectGoal = goal;
        this.save();
    }

    clearMemory(): void {
        this.memory = { ...DEFAULT_MEMORY };
        this.save();
    }

    get currentMemory(): SessionMemory { return this.memory; }
    get hasMemory(): boolean {
        return !!(
            this.memory.currentBug ||
            this.memory.currentFeature ||
            this.memory.recentChanges.length > 0 ||
            this.memory.entries.length > 0
        );
    }
    get entryCount(): number { return this.memory.entries.length; }
}