# Contributing to Sarvis

Thank you for your interest in contributing to Sarvis.

We welcome contributions including bug fixes, improvements, documentation updates, feature suggestions, and performance optimizations.

## Getting Started

### 1. Fork the Repository

Fork the repository and clone it locally.

```bash
git clone https://github.com/sarvis-official/sarvis-extension.git

```


### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development
```bash
npm run watch
```


### Press F5 in VS Code to launch the Extension Development Host.

###  Project Structure

```
src/
│
├── extension.ts
│
├── core/
│   │
│   ├── ai/
│   │   ├── client/
│   │   │   ├── SarvamClient.ts
│   │   │   ├── request.ts
│   │   │   ├── response.ts
│   │   │   └── stream.ts
│   │   │
│   │   ├── prompts/
│   │   │   ├── base.prompt.ts
│   │   │   ├── coding.prompt.ts
│   │   │   ├── review.prompt.ts
│   │   │   ├── debugging.prompt.ts
│   │   │   ├── architecture.prompt.ts
│   │   │   ├── testing.prompt.ts
│   │   │   ├── git.prompt.ts
│   │   │   └── docs.prompt.ts
│   │   │
│   │   ├── parsers/
│   │   │   ├── markdown.parser.ts
│   │   │   ├── code.parser.ts
│   │   │   ├── patch.parser.ts
│   │   │   ├── diff.parser.ts
│   │   │   ├── think.parser.ts
│   │   │   └── json.parser.ts
│   │   │
│   │   └── types.ts
│   │
│   ├── config/
│   │   ├── constants.ts
│   │   ├── commands.ts
│   │   ├── models.ts
│   │   └── settings.ts
│   │
│   ├── storage/
│   │   ├── SecretStorage.ts
│   │   ├── SessionStorage.ts
│   │   ├── WorkspaceStorage.ts
│   │   └── EmbeddingStorage.ts
│   │
│   ├── telemetry/
│   │   ├── logger.ts
│   │   ├── analytics.ts
│   │   └── performance.ts
│   │
│   ├── vscode/
│   │   ├── editor.ts
│   │   ├── workspace.ts
│   │   ├── diagnostics.ts
│   │   ├── commands.ts
│   │   ├── git.ts
│   │   └── terminal.ts
│   │
│   └── utils/
│       ├── fs.ts
│       ├── text.ts
│       ├── debounce.ts
│       ├── throttle.ts
│       ├── markdown.ts
│       └── errors.ts
│
├── features/
│   │
│   ├── chat/
│   │   ├── commands/
│   │   │   └── chat.command.ts
│   │   │
│   │   ├── providers/
│   │   │   └── ChatViewProvider.ts
│   │   │
│   │   ├── services/
│   │   │   ├── chat.service.ts
│   │   │   ├── context.service.ts
│   │   │   ├── attachment.service.ts
│   │   │   └── memory.service.ts
│   │   │
│   │   ├── prompts/
│   │   │   └── chat.prompt.ts
│   │   │
│   │   ├── parsers/
│   │   │   └── chat.parser.ts
│   │   │
│   │   ├── state/
│   │   │   └── chat.state.ts
│   │   │
│   │   ├── media/
│   │   │   ├── chat.css
│   │   │   ├── chat.js
│   │   │   └── icons/
│   │   │
│   │   ├── types/
│   │   │   └── chat.types.ts
│   │   │
│   │   └── index.ts
│   │
│   ├── completion/
│   │   ├── commands/
│   │   ├── providers/
│   │   │   └── InlineCompletionProvider.ts
│   │   ├── services/
│   │   │   ├── completion.service.ts
│   │   │   ├── ranking.service.ts
│   │   │   └── context.service.ts
│   │   ├── prompts/
│   │   ├── parsers/
│   │   ├── state/
│   │   ├── types/
│   │   └── index.ts
│   │
│   ├── debugging/
│   │   ├── commands/
│   │   │   ├── debug.command.ts
│   │   │   ├── terminal.command.ts
│   │   │   └── diagnostics.command.ts
│   │   ├── providers/
│   │   │   ├── DiagnosticCodeActionProvider.ts
│   │   │   └── ErrorExplainerProvider.ts
│   │   ├── services/
│   │   │   ├── debug.service.ts
│   │   │   ├── rootcause.service.ts
│   │   │   ├── diagnostics.service.ts
│   │   │   └── terminal.service.ts
│   │   ├── prompts/
│   │   ├── parsers/
│   │   ├── panels/
│   │   │   ├── debug.panel.ts
│   │   │   ├── rootcause.panel.ts
│   │   │   └── testresult.panel.ts
│   │   ├── types/
│   │   └── index.ts
│   │
│   ├── review/
│   │   ├── commands/
│   │   ├── providers/
│   │   │   └── SaveReviewProvider.ts
│   │   ├── services/
│   │   │   ├── review.service.ts
│   │   │   ├── prreview.service.ts
│   │   │   ├── diffreview.service.ts
│   │   │   └── risk.service.ts
│   │   ├── prompts/
│   │   ├── parsers/
│   │   ├── panels/
│   │   │   ├── review.panel.ts
│   │   │   └── pr.panel.ts
│   │   ├── types/
│   │   └── index.ts
│   │
│   ├── testing/
│   │   ├── commands/
│   │   ├── services/
│   │   │   ├── testgeneration.service.ts
│   │   │   ├── testrunner.service.ts
│   │   │   └── autofix.service.ts
│   │   ├── prompts/
│   │   ├── parsers/
│   │   ├── panels/
│   │   ├── types/
│   │   └── index.ts
│   │
│   ├── git/
│   │   ├── commands/
│   │   ├── services/
│   │   │   ├── commit.service.ts
│   │   │   ├── changelog.service.ts
│   │   │   ├── standup.service.ts
│   │   │   ├── pr.service.ts
│   │   │   └── summary.service.ts
│   │   ├── prompts/
│   │   ├── parsers/
│   │   ├── panels/
│   │   │   ├── changelog.panel.ts
│   │   │   ├── standup.panel.ts
│   │   │   └── pr.panel.ts
│   │   ├── types/
│   │   └── index.ts
│   │
│   ├── architecture/
│   ├── performance/
│   ├── security/
│   ├── dependency/
│   ├── complexity/
│   ├── deadcode/
│   ├── snippets/
│   ├── migration/
│   ├── memory/
│   ├── learning/
│   ├── templates/
│   ├── docs/
│   ├── voice/
│   ├── interview/
│   ├── diagrams/
│   └── todo/
│
├── shared/
│   │
│   ├── ui/
│   │   ├── panels/
│   │   │   ├── BasePanel.ts
│   │   │   ├── MarkdownPanel.ts
│   │   │   └── DiffPanel.ts
│   │   │
│   │   ├── webview/
│   │   │   ├── base.css
│   │   │   ├── theme.css
│   │   │   └── webview.ts
│   │   │
│   │   └── icons/
│   │
│   ├── types/
│   │   ├── ai.types.ts
│   │   ├── vscode.types.ts
│   │   └── shared.types.ts
│   │
│   └── constants/
│       ├── ui.constants.ts
│       └── app.constants.ts
│
├── adapters/
│   ├── vscode/
│   └── intellij/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── mocks/
│
└── media/
    ├── icon.svg
    ├── logo.svg
    └── screenshots/

```

### Contribution Guidelines
1. Follow clean code principles
2. Keep code modular and reusable
3. Use TypeScript best practices
4. Maintain consistent formatting
5. Avoid unnecessary dependencies
6. Ensure all builds pass before submitting PRs
7. Pull Request Process
8. Create a new branch
9. git checkout -b feature/your-feature-name
10. Commit changes clearly
11. git commit -m "Add feature"
12. Push branch
13. git push origin feature/your-feature-name
14. Open a Pull Request
15. Reporting Issues

### When reporting issues include:

1. VS Code version
2. Extension version
3. Operating system
4. Error logs/screenshots
5. Steps to reproduce
6. Feature Requests

### Feature suggestions are welcome through GitHub Issues.
