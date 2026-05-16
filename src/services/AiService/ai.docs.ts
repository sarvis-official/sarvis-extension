import { cleanCodeBlock } from '../../utils/patchUtils';
import { post, stripThinkTags } from './ai.base';

export const AiDocsService = {
    async generateReadme(apiKey: string, projectContext: string): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior technical writer. Generate a professional README.md for this project.

Include these sections:
# Project Name
## Description
## Features
## Installation
## Usage (with code examples)
## API Reference (if applicable)
## Contributing
## License

Use markdown. Be specific based on the actual code provided.`
            },
            { role: 'user', content: projectContext }
        ], { max_tokens: 3000, temperature: 0.3 });
        return raw ? stripThinkTags(raw) : null;
    },

    async generateSwaggerDocs(apiKey: string, code: string): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are an API documentation expert. Analyze this code and generate a complete OpenAPI 3.0 (Swagger) YAML specification.

Include:
- All endpoints with paths and methods
- Request body schemas
- Response schemas with status codes
- Parameters (path, query, header)
- Security schemes if applicable

Return only valid YAML. No explanation.`
            },
            { role: 'user', content: code }
        ], { max_tokens: 3000, temperature: 0.2 });
        return raw ? cleanCodeBlock(stripThinkTags(raw)) : null;
    },

    async generateApiDocs(apiKey: string, code: string, language: string): Promise<string | null> {
        const raw = await post<string>(apiKey, [
            {
                role: 'system',
                content: `You are a senior ${language} technical writer. Generate comprehensive API documentation for this code.

Include for each function/class/endpoint:
## Function/Class Name
**Description:** what it does
**Parameters:** name, type, description for each
**Returns:** type and description
**Throws:** errors that can be thrown
**Example:**
\`\`\`
usage example
\`\`\`

Use markdown. Be thorough and accurate.`
            },
            { role: 'user', content: code }
        ], { max_tokens: 3000, temperature: 0.3 });
        return raw ? stripThinkTags(raw) : null;
    },
};
