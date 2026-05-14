# Contributing to Sarvis Extension

Thank you for contributing to Sarvis.

This project is focused on building a scalable, extensible, and modern AI-powered developer assistant for multiple IDEs and development environments.

We welcome contributions from developers of all experience levels.

---

# Table of Contents

- Development Setup
- Project Architecture
- Folder Structure
- Development Workflow
- Branch Naming
- Commit Convention
- Pull Request Guidelines
- Coding Standards
- Testing
- Reporting Bugs
- Suggesting Features

---

# Development Setup

## 1. Fork The Repository

Click the `Fork` button on GitHub.

---

## 2. Clone Your Fork

```bash
git clone https://github.com/your-username/sarvis-extension.git
```

---

## 3. Navigate Into The Project

```bash
cd sarvis-extension
```

---

## 4. Install Dependencies

```bash
yarn install
```

---

## 5. Setup Environment Variables

Create a `.env` file:

```env
OPENAI_API_KEY=your_api_key
GEMINI_API_KEY=your_api_key
```

---

## 6. Start Development

```bash
yarn dev
```

Press:

```txt
F5
```

to launch the VS Code Extension Development Host.

---

# Project Architecture

Sarvis follows a layered and scalable architecture.

```txt
src/
├── core/        -> shared reusable logic
├── services/    -> business logic
├── adapters/    -> IDE integrations
├── providers/   -> VS Code providers
├── webview/     -> frontend UI
├── commands/    -> extension commands
└── tests/       -> testing
```

---

# Architectural Principles

The project is built around:

- Separation of concerns
- Reusable business logic
- Adapter-based IDE integrations
- Modular service architecture
- Scalability-first design
- DRY principles
- Clean code practices

---

# Important Development Rules

## Keep VS Code APIs Isolated

Do NOT tightly couple VS Code APIs with core business logic.

Good:

```txt
src/adapters/vscode/
```

Bad:

```txt
core/services directly importing vscode
```

This separation allows future support for:

- IntelliJ
- Cursor
- Desktop applications
- Web applications

---

# Folder Responsibilities

## `core/`

Reusable logic shared across the entire application.

Examples:

- types
- interfaces
- utilities
- constants

---

## `services/`

Business logic layer.

Examples:

- AI services
- chat logic
- storage handling
- configuration management

---

## `adapters/`

IDE-specific implementations.

Examples:

- VS Code integration
- future IntelliJ integration

---

## `webview/`

Frontend React application.

Examples:

- chat UI
- components
- hooks
- styles

---

# Branch Naming Convention

Use descriptive branch names.

## Feature

```txt
feature/chat-streaming
```

## Bug Fix

```txt
fix/sidebar-scroll
```

## Refactor

```txt
refactor/ai-service
```

---

# Commit Convention

Sarvis uses conventional commits.

## Types

```txt
feat:
fix:
refactor:
docs:
test:
build:
ci:
style:
perf:
```

---

## Examples

```bash
feat: add streaming chat support

fix: resolve webview memory leak

docs: update README architecture section

refactor: simplify chat service
```

---

# Pull Request Guidelines

Before creating a pull request:

- Ensure code builds successfully
- Run lint checks
- Follow existing architecture patterns
- Keep pull requests focused
- Add screenshots for UI changes
- Avoid unrelated refactors

---

# Pull Request Checklist

- [ ] Code builds successfully
- [ ] Lint passes
- [ ] Tests pass
- [ ] No unnecessary dependencies added
- [ ] Documentation updated if needed
- [ ] Architecture patterns respected

---

# Coding Standards

## TypeScript

- Use strict typing
- Avoid `any`
- Prefer interfaces for contracts
- Keep functions small and reusable

---

## React

- Use functional components
- Prefer hooks
- Keep components modular
- Avoid deeply nested logic

---

## Naming Conventions

```txt
*.service.ts
*.provider.ts
*.adapter.ts
*.types.ts
*.command.ts
```

---

# Testing

## Run Tests

```bash
yarn test
```

---

## Lint

```bash
yarn lint
```

---

## Format

```bash
yarn prettier
```

---

# Reporting Bugs

Please create a GitHub issue with:

- Clear description
- Steps to reproduce
- Expected behavior
- Screenshots/logs if applicable

Use the provided issue templates.

---

# Suggesting Features

Feature requests are welcome.

When suggesting a feature:

- Explain the problem
- Describe the proposed solution
- Consider scalability and architecture impact

---

# Areas Open For Contribution

Examples:

- UI improvements
- AI integrations
- Markdown rendering
- Performance optimizations
- Testing
- Documentation
- IntelliJ adapter groundwork
- Local model integrations

---

# Security

Do NOT expose:

- API keys
- user secrets
- sensitive data

Please read:

```txt
SECURITY.md
```

before reporting vulnerabilities.

---

# Community

We aim to build a respectful and collaborative open-source community.

Please read:

```txt
CODE_OF_CONDUCT.md
```

before contributing.

---

# License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

# Thank You

Every contribution helps improve Sarvis and move the project closer toward becoming a scalable AI-native developer platform.