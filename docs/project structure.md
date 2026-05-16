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
