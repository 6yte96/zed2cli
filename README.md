# OpenCode Zed AI Plugin

This plugin bridges **OpenCode** with **Zed's private AI API**, allowing you to use **Claude Sonnet 4.6** directly within OpenCode with full agentic capabilities (file reading, writing, terminal execution, etc.).

## 🚀 Features

- **Claude Sonnet 4.6**: High-speed, high-reasoning model from Anthropic via Zed.
- **Full Agentic Support**: Maps OpenCode's tools (terminal, read_file, etc.) to Zed's protocol.
- **Clean UI**: Automatically hides internal reasoning and XML tags in collapsible subtasks.
- **Secure Auth**: Uses your intercepted Zed Session Token stored safely in OpenCode.

## 🛠️ Installation

### 1. Create the Plugin Folder
Navigate to your OpenCode configuration directory (usually `~/.config/opencode`) and create the plugin structure:

```bash
cd $HOME/.config/opencode
mkdir -p node_modules/opencode-zed-ai
```

### 2. Add Plugin Files
Download or create the following files inside `node_modules/opencode-zed-ai/`:

- `index.mjs` (The main proxy script)
- `package.json` (Plugin metadata)

**Example `package.json` for the plugin:**
```json
{
  "name": "opencode-zed-ai",
  "version": "1.0.0",
  "main": "./index.mjs",
  "type": "module"
}
```

### 3. Register the Plugin in OpenCode
Edit your global OpenCode configuration file located at `~/.config/opencode/config.json`. Add the plugin and the provider definition:

```json
{
  "plugin": ["opencode-zed-ai"],
  "provider": {
    "zed-ai": {
      "name": "Zed AI",
      "api": "anthropic",
      "models": {
        "claude": {
          "name": "Claude Sonnet 4.6 (Zed)",
          "limit": {
            "context": 200000,
            "output": 64000
          },
          "capabilities": {
            "temperature": true,
            "reasoning": true,
            "attachment": true,
            "toolcall": true,
            "input": { "text": true, "image": true, "pdf": true },
            "output": { "text": true }
          }
        }
      }
    }
  }
}
```

## 🔑 Authentication

To use Zed's API, you need to intercept your **Zed Session Token**.

1.  Open Zed and capture the network traffic (using tools like Fiddler, Proxyman, or Burp).
2.  Look for a request to `cloud.zed.dev`.
3.  Copy the `Authorization: Bearer eyJ...` token.
4.  In your terminal, run the following OpenCode command:

```bash
opencode providers login --provider zed-ai
```

5.  Paste your token when prompted.

## 🖱️ Usage

Once installed and logged in, you can select the model inside OpenCode:

1.  Type `/models` in the OpenCode TUI.
2.  Select `zed-ai/claude`.
3.  Start chatting! You can now ask it to perform tasks like:
    - *"Run netstat and tell me what ports are open"*
    - *"Analyze the code in src/index.js"*
    - *"Create a new test file for my API"*

## ⚠️ Troubleshooting

- **401 Unauthorized**: Your Zed token has expired or is invalid. Intercept a fresh token and run the login command again.
- **400 Bad Request**: Ensure your `config.json` matches the schema provided above exactly.
- **Model not showing**: Ensure the folder name is `opencode-zed-ai` and it is located inside the `node_modules` folder of your OpenCode config directory.

---
*Disclaimer: This is an unofficial plugin and is not affiliated with Zed or Anthropic.*
