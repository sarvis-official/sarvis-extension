import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { EmbeddingService, CodeChunk } from './EmbeddingService';
import { SECRET_KEY } from '../types';

const SUPPORTED_EXTENSIONS = [
    // Web
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
    '.html', '.htm', '.css', '.scss', '.sass', '.less',
    '.vue', '.svelte', '.astro',

    // Backend
    '.py', '.rb', '.php', '.java', '.kt', '.kts',
    '.go', '.rs', '.cs', '.fs', '.fsx',
    '.cpp', '.c', '.h', '.hpp', '.cc',
    '.swift', '.m', '.mm',
    '.scala', '.clj', '.cljs',
    '.ex', '.exs', '.erl', '.hrl',
    '.lua', '.r', '.R', '.jl',
    '.dart', '.groovy',

    // Shell / Config
    '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
    '.yaml', '.yml', '.toml', '.ini', '.env', '.conf', '.config',
    '.json', '.jsonc', '.json5',
    '.xml', '.xsl', '.xslt',
    '.dockerfile', '.containerfile',

    // Docs / Markup
    '.md', '.mdx', '.rst', '.txt', '.tex',
    '.csv', '.tsv',

    // Database
    '.sql', '.prisma', '.graphql', '.gql',

    // Other
    '.proto', '.thrift', '.tf', '.hcl',
    '.gradle', '.cmake', '.makefile',
];

const INDEX_FILE = '.sarvis-index.json';

export class IndexService {
    private chunks: CodeChunk[] = [];
    private indexPath: string = '';

    constructor(private context: vscode.ExtensionContext) { }

    private getIndexPath(): string {
        const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        return ws ? path.join(ws, INDEX_FILE) : '';
    }

    async loadOrBuild(): Promise<void> {
        this.indexPath = this.getIndexPath();
        if (!this.indexPath) return;

        if (fs.existsSync(this.indexPath)) {
            const raw = fs.readFileSync(this.indexPath, 'utf-8');
            this.chunks = JSON.parse(raw);
            return;
        }

        await this.buildIndex();
    }

    async buildIndex(): Promise<void> {
        const apiKey = await this.context.secrets.get(SECRET_KEY);
        if (!apiKey) throw new Error('No API key. Cannot build index.');

        const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!ws) return;

        const files = this.walkDir(ws);
        const allChunks: CodeChunk[] = [];

        for (const file of files) {
            const content = fs.readFileSync(file, 'utf-8');
            const relative = path.relative(ws, file);
            allChunks.push(...EmbeddingService.chunkFile(relative, content));
        }

        // Embed in batches of 20
        const batchSize = 20;
        for (let i = 0; i < allChunks.length; i += batchSize) {
            const batch = allChunks.slice(i, i + batchSize);
            const embeddings = await EmbeddingService.embedText('', batch.map(c => c.content));
            batch.forEach((c, idx) => { c.embedding = embeddings[idx]; });
        }

        this.chunks = allChunks;
        if (this.indexPath) {
            fs.writeFileSync(this.indexPath, JSON.stringify(this.chunks));
        }
    }

    // Change search k from 5 to 10:
    async search(apiKey: string, query: string, k = 10): Promise<CodeChunk[]> {
        if (this.chunks.length === 0) await this.loadOrBuild();
        const [queryEmbedding] = await EmbeddingService.embedText('', [query]);
        return EmbeddingService.topK(queryEmbedding, this.chunks, k, query); // ← pass query text
    }
    
    private walkDir(dir: string, results: string[] = []): string[] {
        // Change ignore list to also skip lock files and sarvis index:
        const IGNORE = ['node_modules', '.git', 'dist', 'out', 'build', '.next', '.nuxt', 'coverage', 'package-lock.json', '.sarvis-index.json']; for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (IGNORE.includes(entry.name)) continue;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) this.walkDir(full, results);
            else if (SUPPORTED_EXTENSIONS.includes(path.extname(entry.name))) results.push(full);
        }
        return results;
    }

    get isIndexed(): boolean { return this.chunks.length > 0; }
    get chunkCount(): number { return this.chunks.length; }
}