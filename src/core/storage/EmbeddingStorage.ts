export interface EmbeddingRecord {
    id: string;

    file: string;

    content: string;

    embedding: number[];
}

export class EmbeddingStorage {
    private embeddings:
        EmbeddingRecord[] = [];

    add(
        record: EmbeddingRecord
    ) {
        this.embeddings.push(record);
    }

    getAll() {
        return this.embeddings;
    }

    clear() {
        this.embeddings = [];
    }
}