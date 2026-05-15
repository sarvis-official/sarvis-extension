import "dotenv/config";
import { SarvamAIClient } from "sarvamai";

export class SarvamService {
    private client: SarvamAIClient;

    constructor() {
        this.client = new SarvamAIClient({
            apiSubscriptionKey:
                process.env.SARVAM_API_KEY || "",
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
            console.error(
                "Sarvam Error:",
                error
            );

            return "Failed to generate response.";
        }
    }
}