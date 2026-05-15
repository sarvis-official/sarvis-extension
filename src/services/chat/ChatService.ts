import { SarvamService } from "../ai/providers/sarvam/SarvamService";

export class ChatService {
  private sarvamService: SarvamService;

  constructor() {
    this.sarvamService = new SarvamService();
  }

  async ask(message: string): Promise<string> {
    return this.sarvamService.sendMessage(message);
  }
}