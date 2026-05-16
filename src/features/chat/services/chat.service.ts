import { SarvamClient } from "../../../core/ai/client/SarvamClient";
import { parseChatResponse } from "../parsers/chat.parser";
import { buildChatPrompt } from "../prompts/chat.prompt";
import { ChatMessage } from "../types/chat.types";

export class ChatService {
    private client:
        SarvamClient;

    constructor(apiKey: string) {
        this.client =
            new SarvamClient(apiKey);
    }


    async sendMessage(
        message: string,
        history: ChatMessage[],
        context?: string
    ) {
        const prompt =
            buildChatPrompt(
                message,
                context
            );

        /*
         |--------------------------------------------------------------------------
         | Build clean alternating history
         |--------------------------------------------------------------------------
         */

        const cleanedHistory: ChatMessage[] =
            [];

        for (const item of history) {
            const content =
                item.content?.trim();

            if (!content) {
                continue;
            }

            /*
             |--------------------------------------------------------------------------
             | Only allow user/assistant
             |--------------------------------------------------------------------------
             */

            if (
                item.role !== "user" &&
                item.role !== "assistant"
            ) {
                continue;
            }

            /*
             |--------------------------------------------------------------------------
             | Prevent duplicate roles
             |--------------------------------------------------------------------------
             */

            const last =
                cleanedHistory[
                cleanedHistory.length - 1
                ];

            if (
                last &&
                last.role === item.role
            ) {
                continue;
            }

            cleanedHistory.push({
                role: item.role,
                content,
            });
        }

        /*
         |--------------------------------------------------------------------------
         | Ensure first message is user
         |--------------------------------------------------------------------------
         */

        if (
            cleanedHistory.length > 0 &&
            cleanedHistory[0].role !==
            "user"
        ) {
            cleanedHistory.shift();
        }

        /*
         |--------------------------------------------------------------------------
         | Final messages
         |--------------------------------------------------------------------------
         */

        const messages: ChatMessage[] = [
            ...cleanedHistory,

            {
                role: "user",
                content: prompt,
            },
        ];

        console.log(
            "FINAL_MESSAGES",
            messages
        );

        const response =
            await this.client.chat({
                messages,
            });

        return parseChatResponse(
            response
        );
    }
}