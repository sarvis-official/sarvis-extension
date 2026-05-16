export class SessionStorage {
    private store =
        new Map<string, unknown>();

    set<T>(
        key: string,
        value: T
    ) {
        this.store.set(key, value);
    }

    get<T>(
        key: string
    ): T | undefined {
        return this.store.get(
            key
        ) as T;
    }

    delete(key: string) {
        this.store.delete(key);
    }

    clear() {
        this.store.clear();
    }
}