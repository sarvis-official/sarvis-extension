import { buildChatRequest } from "./request";
import {
    ChatCompletionRequest,
    ChatCompletionResponse,
} from "./response";

export class SarvamClient {
    private apiKey: string;

    private readonly baseUrl =
        "https://api.sarvam.ai/v1";

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async chat(
        request: ChatCompletionRequest,
        signal?: AbortSignal
    ): Promise<string> {
        const response = await fetch(
            `${this.baseUrl}/chat/completions`,
            {
                method: "POST",

                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    "Content-Type":
                        "application/json",
                },

                body: JSON.stringify(
                    buildChatRequest(request)
                ),

                signal,
            }
        );

        if (!response.ok) {
            throw new Error(
                `Sarvam API Error ${response.status}: ${await response.text()}`
            );
        }

        const data: ChatCompletionResponse =
            await response.json();

        return (
            data.choices?.[0]?.message
                ?.content || ""
        );
    }
}