import { ChatMessage } from "../types/chat.types";

class ChatState {
    private messages:
        ChatMessage[] = [];

    addMessage(
        message: ChatMessage
    ) {
        this.messages.push(message);
    }

    getMessages() {
        return this.messages;
    }

    clear() {
        this.messages = [];
    }
}

export const chatState =
    new ChatState();