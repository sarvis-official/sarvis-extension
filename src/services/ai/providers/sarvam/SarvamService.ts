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

            return (
                response.choices?.[0]?.message
                    ?.content || "No response"
            );
        } catch (error) {
            console.error(error);

            return "Failed to generate response.";
        }
    }
}