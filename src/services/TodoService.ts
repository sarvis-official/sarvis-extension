import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export type TodoType = 'TODO' | 'FIXME' | 'HACK' | 'NOTE' | 'XXX' | 'DEPRECATED' | 'BUG' | 'OPTIMIZE';

export interface TodoItem {
    id: string;
    type: TodoType;
    message: string;
    file: string;
    line: number;
    column: number;
    snippet: string;
    priority: 'high' | 'medium' | 'low';
    createdAt: number;
}

const IGNORE = ['node_modules', '.git', 'dist', 'out', 'build', '.next', 'coverage'];
const SUPPORTED = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.cs', '.cpp', '.c', '.rs', '.rb', '.php', '.css', '.scss'];

const PRIORITY_MAP: Record<TodoType, TodoItem['priority']> = {
    BUG: 'high', FIXME: 'high', XXX: 'high',
    HACK: 'medium', DEPRECATED: 'medium', OPTIMIZE: 'medium',
    TODO: 'low', NOTE: 'low'
};

export const TodoService = {

    scanFile(filePath: string, content: string): TodoItem[] {
        const items: TodoItem[] = [];
        const lines = content.split('\n');
        const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
        const relativePath = ws ? path.relative(ws, filePath) : filePath;

        const pattern = /(?:\/\/|#|\/\*|\*)\s*(TODO|FIXME|HACK|NOTE|XXX|DEPRECATED|BUG|OPTIMIZE)\s*[:\-]?\s*(.*)/gi;

        lines.forEach((line, i) => {
            let match;
            const linePattern = new RegExp(pattern.source, 'gi');
            while ((match = linePattern.exec(line)) !== null) {
                const type = match[1].toUpperCase() as TodoType;
                const message = match[2].trim() || `${type} needs attention`;
                items.push({
                    id: `${relativePath}:${i + 1}:${match.index}`,
                    type,
                    message,
                    file: relativePath,
                    line: i + 1,
                    column: match.index,
                    snippet: line.trim(),
                    priority: PRIORITY_MAP[type] ?? 'low',
                    createdAt: Date.now()
                });
            }
        });

        return items;
    },

    scanWorkspace(): TodoItem[] {
        const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!ws) return [];

        const results: TodoItem[] = [];
        this._walk(ws, results);
        return results.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    },

    _walk(dir: string, results: TodoItem[]): void {
        try {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                if (IGNORE.includes(entry.name)) continue;
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) this._walk(full, results);
                else if (SUPPORTED.includes(path.extname(entry.name))) {
                    try {
                        const content = fs.readFileSync(full, 'utf-8');
                        results.push(...this.scanFile(full, content));
                    } catch { /* skip */ }
                }
            }
        } catch { /* skip */ }
    },

    groupByFile(items: TodoItem[]): Map<string, TodoItem[]> {
        const map = new Map<string, TodoItem[]>();
        items.forEach(item => {
            if (!map.has(item.file)) map.set(item.file, []);
            map.get(item.file)!.push(item);
        });
        return map;
    },

    groupByType(items: TodoItem[]): Map<TodoType, TodoItem[]> {
        const map = new Map<TodoType, TodoItem[]>();
        items.forEach(item => {
            if (!map.has(item.type)) map.set(item.type, []);
            map.get(item.type)!.push(item);
        });
        return map;
    },

    getStats(items: TodoItem[]): Record<string, number> {
        return {
            total: items.length,
            high: items.filter(i => i.priority === 'high').length,
            medium: items.filter(i => i.priority === 'medium').length,
            low: items.filter(i => i.priority === 'low').length,
            TODO: items.filter(i => i.type === 'TODO').length,
            FIXME: items.filter(i => i.type === 'FIXME').length,
            HACK: items.filter(i => i.type === 'HACK').length,
            BUG: items.filter(i => i.type === 'BUG').length,
        };
    }
};