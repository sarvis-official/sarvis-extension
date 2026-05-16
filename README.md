# Sarvis AI — VS Code Extension

> Your intelligent AI coding assistant, powered by [Sarvam AI](https://sarvam.ai) and built into VS Code.

---

## Features

### AI Chat Sidebar
Ask Sarvis anything — explain code, fix bugs, write functions, or just brainstorm. The chat sidebar is always a click away and automatically includes your current file as context.

### Inline Code Completions
Sarvis watches as you type and suggests intelligent completions in real time, right inside your editor.

### Fix with Sarvis AI
Select any block of code, right-click, and choose **"Fix with Sarvis AI"** to get an improved version shown as a diff — review before you accept.

### Secure API Key Storage
Your Sarvam API key is stored securely using VS Code's built-in secret storage — never in plain text.

---

## Getting Started

### 1. Install the Extension
Install from the VS Code Marketplace or from a `.vsix` file:
```
Extensions panel → ••• → Install from VSIX
```

### 2. Set Your API Key
Open the Command Palette (`Ctrl+Shift+P`) and run:
```
Sarvis: Set API Key
```
Or click the **⚙** button in the Sarvis sidebar.

Get your Sarvam API key at [sarvam.ai](https://sarvam.ai).

### 3. Start Chatting
Click the **S** icon in the Activity Bar to open the Sarvis sidebar and start asking questions!

---
## Shortcut
Shortcut          Command
Ctrl+Shift+G      Generate Code
Ctrl+Shift+D      Debug Error
Ctrl+Shift+U      Generate Tests
Ctrl+Shift+E      Explain Code

Ctrl+Shift+A      Ask Codebase

Ctrl+Shift+I      Index Codebase
When do you need to run it?
Situation                                Run Index?
First time using Sarvis on a project    ✅ Yes
Added new files to the project          ✅ Yes
Deleted/renamed files                   ✅ Yes
Changed code inside existing files      ✅ Yes
Just asking questions (already indexed) ❌ 

Ctrl+Shift+F      Fix Terminal Error

Ctrl+Shift+X      Generate Terminal Command

---

## Usage

| Action | How |
|---|---|
| Open chat | Click **S** icon in Activity Bar |
| Send message | Type and press `Enter` |
| New line in input | `Shift + Enter` |
| Clear chat | Click **↺** button |
| Set / update API key | Click **⚙** button or `Ctrl+Shift+P` → `Sarvis: Set API Key` |
| Fix selected code | Select code → Right click → `Fix with Sarvis AI` |

---

## Requirements

- VS Code `^1.85.0`
- A valid [Sarvam AI](https://sarvam.ai) API key

---

## Privacy

- Your API key is stored using VS Code's encrypted secret storage
- Code context is only sent when you actively send a message
- No data is stored or logged by this extension

---

## Known Issues & Feedback

Found a bug or have a feature request?  
[Open an issue on GitHub](https://github.com/AkashKobal/sarvis/issues)

---

## License

MIT License — free to use, modify, and distribute.

---

## Credits

| Role | Person / Org |
|---|---|
| **Created by** | [Sarvium](https://sarvium.com) |
| **Developed by** | [Akash Kobal](https://github.com/AkashKobal) |
| **Powered by** | [Sarvam AI](https://sarvam.ai) |

---

<p align="center">
  Built with ❤️ by <a href="https://sarvium.com">Sarvium</a> &nbsp;|&nbsp; Developed by <a href="https://github.com/AkashKobal">Akash Kobal</a>
</p>