# Privacy Policy

This extension runs entirely in your browser. It does not collect, transmit, or store data on any external server.

## Data handled
- Reads the currently open ChatGPT conversation to build a transcript/JSON export.
- Stores a temporary export object in the page context (`window.__CHAT_EXPORT__`) for the popup to access.
- Writes to the clipboard only when you click Copy.
- Saves a local JSON file only when you click Save.

## What is not collected
- No analytics, tracking pixels, or third-party scripts.
- No network calls are made by this extension.
- No persistent storage of your conversations beyond the current page session.

## Permissions rationale
- `activeTab`: needed to read the active ChatGPT tab when you click the popup.
- `storage`: reserved for potential lightweight settings; not used for conversation content.
- `clipboardWrite`: used to copy the transcript to your clipboard when requested.

## Contact
If you find a privacy issue, remove the extension and open an issue in the repository.
