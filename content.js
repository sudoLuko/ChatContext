function extractMarkdownText(markdownEl) {
  const blocks = [];

  markdownEl.querySelectorAll(
    'p, li, h1, h2, h3, h4, pre'
  ).forEach(node => {
    const text = node.textContent.trim();
    if (text) blocks.push(text);
  });

  return blocks.join('\n\n');
}


function extractTables(markdownEl) {
  const tables = [];

  markdownEl.querySelectorAll("table").forEach(table => {
    const rows = [];

    table.querySelectorAll("tr").forEach(tr => {
      const cells = [];

      tr.querySelectorAll("th, td").forEach(cell => {
        const text = cell.textContent.trim();
        if (text) cells.push(text);
      });

      if (cells.length) rows.push(cells);
    });

    if (rows.length) tables.push(rows);
  });

  return tables;
}


function waitForArticles(callback) {
  const articles = document.querySelectorAll("article[data-turn]");
  if (articles.length === 0) {
    requestAnimationFrame(() => waitForArticles(callback));
    return;
  }
  callback([...articles]);
}

function normalizeText(text) {
  return text
    .replace(/\u200B/g, "")       // zero-width spaces
    .replace(/\n{3,}/g, "\n\n")   // collapse excessive newlines
    .replace(/[ \t]+/g, " ")      // normalize spaces
    .trim();
}


function extractArticles(articles) {
  const conversation = [];
  const seen = new Set(); 

  articles.forEach(a => {
    const role = a.dataset.turn;
    if (!role) return;

    let text = "";
    let tables = null;

    if (role === "user") {
      const el = a.querySelector(".whitespace-pre-wrap");
      if (el) text = el.innerText.trim();
    }

    if (role === "assistant") {
      const markdown = a
        .querySelector('[data-message-author-role="assistant"]')
        ?.querySelector('.markdown');

      if (markdown) {
        text = extractMarkdownText(markdown);
        tables = extractTables(markdown);
      }
    }

    if (!text && (!tables || !tables.length)) return;

    // Deduplicate (especially code blocks)
    const normalized = normalizeText(text);
    const key = role + "::" + normalized;
    if (seen.has(key)) return;
    seen.add(key);

    conversation.push({
      role,
      id: a.dataset.turnId || null,
      text: normalized,
      tables: tables && tables.length ? tables : null
    });
  });

  return conversation;
}

function buildExport(conversation) {
  return {
    meta: {
      source: "chat.openai.com",
      exportedAt: new Date().toISOString(),
      readme: {
        purpose:
          "This JSON is a structured export of a conversational session between a human user and an AI assistant.",
        perspective:
          "Interpret this content as if you are the AI assistant that participated in the conversation.",
        "context": [
            "Each message represents a turn in the original conversation.",
            "Messages are ordered chronologically.",
            "User messages reflect prompts, questions, or instructions given to you.",
            "Assistant messages reflect your prior responses to the user.",
            "The content has been extracted directly from the rendered conversation interface and normalized."
        ],
        "content_structure": [
            "The `messages` array contains the canonical conversation history.",
            "Each message has a `role` (`user` or `assistant`) and `content` (plain text).",
            "If present, `tables` contain structured data that was originally displayed as HTML tables.",
            "Tables are intentionally separated from prose and should be interpreted as supplemental data.",
            "LaTeX or mathematical expressions may appear inline in `content` or separately if preserved."
        ],
        "intended_use": [
            "Use this conversation as prior context for continuation, analysis, summarization, or reasoning.",
            "Assume continuity of identity: you are the same assistant that produced the assistant messages.",
            "Do not treat this as third-party dialogue; treat it as your own conversational memory.",
            "If responding to new user input, remain consistent with prior answers, tone, and technical assumptions."
        ],
        "limitations": [
            "This dump reflects what was visible at extraction time and may omit UI-only elements.",
            "Formatting has been normalized for clarity and machine readability.",
            "Do not assume hidden system prompts beyond what is explicitly present."
        ]
      }
    },
    messages: conversation,
  };
}


function dedupeTextBlocks(text) {
  const seen = new Set();
  const out = [];

  // split on double newlines
  for (const block of text.split(/\n\s*\n/)) {
    const normalized = block
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    if (!normalized) continue;
    if (seen.has(normalized)) continue;

    seen.add(normalized);
    out.push(block.trim());
  }

  return out.join("\n\n");
}


function buildContextTranscript(messages) {
  const lines = [
    "SYSTEM CONTEXT — PRIOR CONVERSATION",
    "",
    "The following is a complete transcript of a prior conversation between a human user and you (the AI assistant).",
    "",
    "This transcript is provided as conversational context, not as data for analysis.",
    "Assume continuity of identity: you are the same assistant that authored the assistant messages below.",
    "Treat all assistant messages as your own prior responses.",
    "Do not explain, summarize, or comment on the structure unless explicitly asked.",
    "Use this solely das context and continue naturally from the last user message.",
    "",
    "BEGIN CONVERSATION"
  ];

  for (const m of messages) {
    lines.push("", `${m.role.toUpperCase()}:`, m.text);
  }

  lines.push(
    "",
    "END CONVERSATION",
    "",
    "The user will now continue the conversation below."
  );

  return lines.join("\n");
}


waitForArticles((articles) => {
  let conversation = extractArticles(articles);

  for (const m of conversation) {
    if (m.text) {
      m.text = dedupeTextBlocks(m.text);
    }
  }

  const exportJSON = buildExport(conversation);
  const transcript = buildContextTranscript(conversation);

  console.log("Transcript preview:", transcript.slice(0, 200));

  window.__CHAT_EXPORT__ = {
    json: exportJSON,
    transcript
  };

  console.log("✅ Chat export ready");
});


chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_CHAT_EXPORT") {
    sendResponse(window.__CHAT_EXPORT__ || null);
  }
});
