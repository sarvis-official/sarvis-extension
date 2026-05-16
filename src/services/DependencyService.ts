import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';
import * as util from 'util';

const exec = util.promisify(cp.exec);

export interface Dependency {
    name: string;
    currentVersion: string;
    latestVersion?: string;
    type: 'dependency' | 'devDependency' | 'peerDependency';
    hasVulnerability?: boolean;
    isOutdated?: boolean;
    isDuplicate?: boolean;
    isUnused?: boolean;
    license?: string;
    size?: string;
}

export interface DependencyReport {
    packageManager: 'npm' | 'yarn' | 'pnpm' | 'pip' | 'maven' | 'gradle' | 'unknown';
    totalDeps: number;
    outdated: Dependency[];
    vulnerable: Dependency[];
    unused: Dependency[];
    duplicates: string[];
    heaviest: Dependency[];
    updateCommands: string[];
    packageJson?: Record<string, unknown>;
}

export const DependencyService = {

    // ── Detect package manager ─────────────────────────────────────────────
    detectPackageManager(): DependencyReport['packageManager'] {
        const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!ws) return 'unknown';
        if (fs.existsSync(path.join(ws, 'yarn.lock'))) return 'yarn';
        if (fs.existsSync(path.join(ws, 'pnpm-lock.yaml'))) return 'pnpm';
        if (fs.existsSync(path.join(ws, 'package.json'))) return 'npm';
        if (fs.existsSync(path.join(ws, 'requirements.txt'))) return 'pip';
        if (fs.existsSync(path.join(ws, 'pom.xml'))) return 'maven';
        if (fs.existsSync(path.join(ws, 'build.gradle'))) return 'gradle';
        return 'unknown';
    },

    // ── Read package.json ──────────────────────────────────────────────────
    readPackageJson(): Record<string, unknown> | null {
        const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!ws) return null;
        const pkgPath = path.join(ws, 'package.json');
        if (!fs.existsSync(pkgPath)) return null;
        try {
            return JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        } catch { return null; }
    },

    // ── Get all dependencies ───────────────────────────────────────────────
    getAllDependencies(): Dependency[] {
        const pkg = this.readPackageJson();
        if (!pkg) return [];

        const deps: Dependency[] = [];

        const addDeps = (obj: Record<string, string>, type: Dependency['type']) => {
            Object.entries(obj ?? {}).forEach(([name, version]) => {
                deps.push({
                    name,
                    currentVersion: version.replace(/[\^~>=<]/g, ''),
                    type
                });
            });
        };

        addDeps(pkg.dependencies as Record<string, string> ?? {}, 'dependency');
        addDeps(pkg.devDependencies as Record<string, string> ?? {}, 'devDependency');
        addDeps(pkg.peerDependencies as Record<string, string> ?? {}, 'peerDependency');

        return deps;
    },

    // ── Run npm outdated ───────────────────────────────────────────────────
    async getOutdated(): Promise<Record<string, { current: string; latest: string; wanted: string }>> {
        const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!ws) return {};
        try {
            const { stdout } = await exec('npm outdated --json', { cwd: ws });
            return JSON.parse(stdout || '{}');
        } catch (err: unknown) {
            // npm outdated exits with code 1 when outdated packages exist
            const execErr = err as { stdout?: string };
            if (execErr.stdout) {
                try { return JSON.parse(execErr.stdout); } catch { return {}; }
            }
            return {};
        }
    },

    // ── Run npm audit ──────────────────────────────────────────────────────
    async getVulnerabilities(): Promise<{ vulnerabilities: Record<string, unknown>; metadata: Record<string, unknown> }> {
        const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!ws) return { vulnerabilities: {}, metadata: {} };
        try {
            const { stdout } = await exec('npm audit --json', { cwd: ws });
            return JSON.parse(stdout || '{}');
        } catch (err: unknown) {
            const execErr = err as { stdout?: string };
            if (execErr.stdout) {
                try { return JSON.parse(execErr.stdout); } catch { }
            }
            return { vulnerabilities: {}, metadata: {} };
        }
    },

    // ── Find unused deps by scanning source files ──────────────────────────
    findUnusedDependencies(deps: Dependency[]): string[] {
        const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!ws) return [];

        const srcContent = this._readAllSourceFiles(ws);
        const unused: string[] = [];

        const alwaysUsed = ['typescript', 'ts-node', '@types/', 'eslint', 'prettier',
            'jest', 'mocha', 'webpack', 'vite', 'babel', 'nodemon', 'rimraf'];

        deps.filter(d => d.type === 'dependency').forEach(dep => {
            if (alwaysUsed.some(a => dep.name.includes(a))) return;

            const importPatterns = [
                new RegExp(`require\\s*\\(\\s*['"]${dep.name}['"]`),
                new RegExp(`from\\s+['"]${dep.name}['"]`),
                new RegExp(`from\\s+['"]${dep.name}/`),
                new RegExp(`import\\s+['"]${dep.name}['"]`),
            ];

            const isUsed = importPatterns.some(p => srcContent.match(p));
            if (!isUsed) unused.push(dep.name);
        });

        return unused;
    },

    // ── Find duplicate/conflicting versions ────────────────────────────────
    findDuplicates(deps: Dependency[]): string[] {
        const names = deps.map(d => d.name);
        const seen = new Set<string>();
        const dupes: string[] = [];
        names.forEach(n => {
            if (seen.has(n)) dupes.push(n);
            seen.add(n);
        });
        return dupes;
    },

    // ── Known heavy packages ───────────────────────────────────────────────
    getHeavyPackages(deps: Dependency[]): Dependency[] {
        const heavyPackages: Record<string, string> = {
            'moment': '~67KB (use date-fns ~13KB or dayjs ~2KB instead)',
            'lodash': '~70KB (use lodash-es or individual imports)',
            'jquery': '~87KB (use native DOM APIs)',
            'axios': '~13KB (use native fetch)',
            'bluebird': '~72KB (use native Promises)',
            'underscore': '~16KB (use lodash or native)',
            'request': 'deprecated — use got or axios',
            'crypto-js': '~80KB (use native crypto API)',
        };

        return deps.filter(d => heavyPackages[d.name]).map(d => ({
            ...d,
            size: heavyPackages[d.name]
        }));
    },

    // ── Generate update commands ───────────────────────────────────────────
    generateUpdateCommands(
        outdated: Record<string, { current: string; latest: string }>,
        vulnerable: string[],
        unused: string[],
        pm: string
    ): string[] {
        const cmds: string[] = [];
        const install = pm === 'yarn' ? 'yarn add' : pm === 'pnpm' ? 'pnpm add' : 'npm install';
        const remove = pm === 'yarn' ? 'yarn remove' : pm === 'pnpm' ? 'pnpm remove' : 'npm uninstall';
        const update = pm === 'yarn' ? 'yarn upgrade' : pm === 'pnpm' ? 'pnpm update' : 'npm update';

        // Update vulnerable first
        if (vulnerable.length > 0) {
            cmds.push(`# Fix vulnerabilities`);
            cmds.push(`npm audit fix`);
            cmds.push(`npm audit fix --force  # if above doesn't work`);
        }

        // Update outdated
        const outdatedNames = Object.keys(outdated);
        if (outdatedNames.length > 0) {
            cmds.push(`# Update outdated packages`);
            const majorUpdates = outdatedNames.filter(n => {
                const curr = outdated[n].current?.split('.')[0] ?? '0';
                const latest = outdated[n].latest?.split('.')[0] ?? '0';
                return curr !== latest;
            });
            const minorUpdates = outdatedNames.filter(n => !majorUpdates.includes(n));

            if (minorUpdates.length > 0) {
                cmds.push(`${update} ${minorUpdates.join(' ')}`);
            }
            if (majorUpdates.length > 0) {
                cmds.push(`# Major updates (breaking changes possible — test after upgrading):`);
                majorUpdates.forEach(n => {
                    cmds.push(`${install} ${n}@${outdated[n].latest}`);
                });
            }
        }

        // Remove unused
        if (unused.length > 0) {
            cmds.push(`# Remove unused dependencies`);
            cmds.push(`${remove} ${unused.join(' ')}`);
        }

        return cmds;
    },

    // ── Helper: read all source files ──────────────────────────────────────
    _readAllSourceFiles(dir: string, content = ''): string {
        const IGNORE = ['node_modules', '.git', 'dist', 'out', 'build'];
        const SUPPORTED = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte'];
        try {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                if (IGNORE.includes(entry.name)) continue;
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) content = this._readAllSourceFiles(full, content);
                else if (SUPPORTED.includes(path.extname(entry.name))) {
                    try { content += fs.readFileSync(full, 'utf-8') + '\n'; } catch { }
                }
            }
        } catch { }
        return content;
    }
};