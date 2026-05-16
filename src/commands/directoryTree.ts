// helpers/directoryTree.ts
import * as fs from 'fs';
import * as path from 'path';

const IGNORE = ['node_modules', '.git', 'dist', 'out', 'build', '.next'];

export function getDirectoryTree(dir: string, depth: number, prefix = ''): string {
    if (depth === 0) return '';
    let result = '';
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
            .filter(e => !IGNORE.includes(e.name))
            .slice(0, 20);
        entries.forEach((entry, i) => {
            const isLast = i === entries.length - 1;
            result += `${prefix}${isLast ? '└── ' : '├── '}${entry.name}\n`;
            if (entry.isDirectory()) {
                result += getDirectoryTree(path.join(dir, entry.name), depth - 1, prefix + (isLast ? '    ' : '│   '));
            }
        });
    } catch { /* skip */ }
    return result;
}
