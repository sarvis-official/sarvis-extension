# Sarvis Extension

AI-powered developer assistant extension built for modern editors.

Sarvis is a scalable and extensible AI coding assistant designed initially for VS Code, with future support planned for IntelliJ, Cursor, desktop applications, and cloud-based workflows.

---

# Features

## Current

- AI Chat Interface
- Sidebar Webview UI
- Multi-Provider AI Architecture
- Streaming Ready Architecture
- Modular Service Layer
- VS Code Extension Support
- React-based Webview UI
- Open Source Ready Structure

---

## Planned

- Workspace Context Awareness
- File & Code Selection Context
- Markdown Rendering
- Syntax Highlighting
- Multi-Conversation Support
- AI Agents & Tools
- Terminal Integration
- Diff Preview Editing
- IntelliJ Support
- Local LLM Support
- Cloud Sync

---

# Architecture

Sarvis follows a scalable layered architecture:

```txt
src/
├── core/          # Shared reusable core logic
├── services/      # Business logic
├── adapters/      # IDE integrations
├── providers/     # VS Code providers
├── webview/       # React frontend
└── commands/      # Extension commands
```

This separation allows future support for multiple IDEs without rewriting the core system.

---

# Tech Stack

## Backend / Extension

- TypeScript
- VS Code Extension API
- Node.js

## Frontend

- React
- Tailwind CSS
- Webview API

## AI

- OpenAI
- Gemini
- Future multi-model support

## Tooling

- Webpack
- ESLint
- Prettier
- GitHub Actions

---

# Goals

Sarvis aims to become:

- Fast
- Modular
- Extensible
- Multi-IDE
- Open Source
- AI-native

The project focuses on maintainable architecture first, then advanced AI capabilities.

---

# Installation

## Clone Repository

```bash
git clone https://github.com/your-username/sarvis-extension.git
```

---

## Install Dependencies

```bash
yarn install
```

---

## Run Development Extension

```bash
yarn dev
```

Press:

```txt
F5
```

to launch the Extension Development Host.

---

# Environment Variables

Create a `.env` file:

```env
OPENAI_API_KEY=your_api_key
GEMINI_API_KEY=your_api_key
```

---

# Project Structure

```txt
sarvis-extension/
├── src/
│   ├── core/
│   ├── services/
│   ├── adapters/
│   ├── providers/
│   ├── webview/
│   └── commands/
│
├── assets/
├── scripts/
├── tests/
└── .github/
```

---

# Development Philosophy

Sarvis follows:

- DRY principles
- Modular architecture
- Adapter-based integrations
- Service-oriented design
- Clean separation of concerns
- Scalability-first development

---

# Roadmap

## v0.1.0

- Basic chatbot
- Sidebar UI
- AI integration
- Streaming architecture

## v0.2.0

- Markdown rendering
- Syntax highlighting
- Conversation persistence

## v0.3.0

- Workspace context
- File awareness
- Selected code context

## v0.4.0

- AI tools
- Terminal execution
- Diff preview editing

## v1.0.0

- Stable marketplace release
- Multi-model support
- IntelliJ adapter
- Production-ready architecture

---

# Contributing

Contributions are welcome.

Please read:

```txt
CONTRIBUTING.md
```

before submitting pull requests.

---

# Security

Please report vulnerabilities responsibly.

See:

```txt
SECURITY.md
```

for details.

---

# License

MIT License

---

# Future Vision

Sarvis is designed to evolve into a universal AI workspace capable of connecting:

- IDEs
- Local tools
- Cloud services
- AI providers
- Development workflows

while maintaining a clean and scalable architecture.

---

# Author

Built by Akash for developers who want powerful AI tooling with scalable architecture.