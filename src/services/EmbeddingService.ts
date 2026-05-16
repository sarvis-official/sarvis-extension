import * as path from 'path';

export interface CodeChunk {
    filePath: string;
    content: string;
    startLine: number;
    embedding?: number[]; // kept for interface compatibility
}

export const EmbeddingService = {

    // No API call — score by keyword overlap
    async embedText(_apiKey: string, texts: string[]): Promise<number[][]> {
        // Return TF-IDF-style term frequency vectors (local, no API)
        return texts.map(t => this._termVector(t));
    },

    chunkFile(filePath: string, content: string, chunkSize = 5): CodeChunk[] {
        const lines = content.split('\n');
        const chunks: CodeChunk[] = [];
        for (let i = 0; i < lines.length; i += chunkSize) {
            const startLine = i + 1;
            const endLine = Math.min(i + chunkSize, lines.length);
            const numberedLines = lines
                .slice(i, i + chunkSize)
                .map((line, idx) => `${startLine + idx}: ${line}`)  // ← prefix EVERY line with its number
                .join('\n');
            chunks.push({
                filePath,
                content: numberedLines,
                startLine
            });
        }
        return chunks;
    },

    cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) return 0;
        const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
        const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
        const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
        if (magA === 0 || magB === 0) return 0;
        return dot / (magA * magB);
    },

    topK(query: number[], chunks: CodeChunk[], k = 10, queryText = ''): CodeChunk[] {
        const queryLower = queryText.toLowerCase();

        return chunks
            .filter(c => c.embedding)
            .map(c => {
                let score = this.cosineSimilarity(query, c.embedding!);

                // Boost if the filename is mentioned in the query
                const fileName = c.filePath.toLowerCase();
                if (queryLower && fileName.split('/').some(part => queryLower.includes(part))) {
                    score += 0.5; // strong filename boost
                }

                return { chunk: c, score };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, k)
            .map(r => r.chunk);
    },

    // Build a simple term-frequency vector over a shared vocabulary
    _termVector(text: string): number[] {
        const tokens = text.toLowerCase().match(/[a-zA-Z_][a-zA-Z0-9_]*/g) ?? [];
        const freq: Record<string, number> = {};
        for (const t of tokens) freq[t] = (freq[t] ?? 0) + 1;
        // Use a fixed-size hash bucket (512 dims) for speed
        const vec = new Array(512).fill(0);
        for (const [term, count] of Object.entries(freq)) {
            const idx = this._hash(term) % 512;
            vec[idx] += count;
        }
        return vec;
    },

    _hash(str: string): number {
        let h = 5381;
        for (let i = 0; i < str.length; i++) {
            h = ((h << 5) + h) ^ str.charCodeAt(i);
        }
        return Math.abs(h);
    }
};