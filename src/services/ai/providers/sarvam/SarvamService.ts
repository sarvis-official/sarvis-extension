import { SarvamAIClient } from "sarvamai";

export class SarvamService {
    private client: SarvamAIClient;

    constructor(apiKey: string) {
        this.client = new SarvamAIClient({
            apiSubscriptionKey: apiKey,
        });
    }

    async sendMessage(
        message: string
    ): Promise<string> {
        try {
            const response =
                await this.client.chat.completions({
                    model: "sarvam-m",
                    messages: [
                        {
                            role: "user",
                            content: message,
                        },
                    ],
                });

            const content =
                response.choices?.[0]?.message
                    ?.content || "";

            const cleaned =
                content.replace(
                    /<think>[\s\S]*?<\/think>/gi,
                    ""
                ).trim();

            return cleaned || "No response";
        } catch (error) {
            console.error(
                "Sarvam Error:",
                error
            );

            return "Failed to generate response.";
        }
    }
}