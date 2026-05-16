import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface ScaffoldFile {
    path: string;
    content: string;
    description: string;
}

export interface ArchitecturePlan {
    name: string;
    description: string;
    structure: string;
    files: ScaffoldFile[];
    nextSteps: string[];
}

export const ArchitectureService = {

    async applyPlan(plan: ArchitecturePlan): Promise<void> {
        const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!ws) throw new Error('No workspace folder found.');

        for (const file of plan.files) {
            const fullPath = path.join(ws, file.path);
            const dir = path.dirname(fullPath);

            // Create directories recursively
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Write file
            fs.writeFileSync(fullPath, file.content, 'utf-8');
        }
    },

    getTreeHtml(files: ScaffoldFile[]): string {
        const tree: Record<string, string[]> = {};

        for (const file of files) {
            const parts = file.path.split('/');
            const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '.';
            if (!tree[dir]) tree[dir] = [];
            tree[dir].push(parts[parts.length - 1]);
        }

        let html = '<ul class="tree">';
        const dirs = Object.keys(tree).sort();

        for (const dir of dirs) {
            if (dir !== '.') {
                html += `<li class="dir">📁 ${dir}/</li>`;
            }
            for (const file of tree[dir]) {
                const ext = path.extname(file).slice(1);
                const icon = getFileIcon(ext);
                html += `<li class="file">${icon} ${file}</li>`;
            }
        }
        html += '</ul>';
        return html;
    }
};

function getFileIcon(ext: string): string {
    const icons: Record<string, string> = {
        ts: '📘', js: '📜', json: '📋', java: '☕',
        py: '🐍', go: '🐹', rs: '🦀', yaml: '⚙️',
        yml: '⚙️', xml: '📄', md: '📝', css: '🎨',
        html: '🌐', env: '🔑', gitignore: '🚫',
        dockerfile: '🐳', sh: '💻', sql: '🗄️'
    };
    return icons[ext] ?? '📄';
}