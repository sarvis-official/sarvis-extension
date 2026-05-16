import { ChatMessage } from "../types/chat.types";

export class MemoryService {
    private memory:
        ChatMessage[] = [];

    add(
        message: ChatMessage
    ) {
        this.memory.push(message);
    }

    getRecent(limit = 10) {
        return this.memory.slice(-limit);
    }

    clear() {
        this.memory = [];
    }
}