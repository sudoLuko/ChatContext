const outputEl = document.getElementById("output");
const copyBtn = document.getElementById("copy");
const saveBtn = document.getElementById("save");

let latestExport = null;

function setOutput(text) {
  outputEl.textContent = text;
}

function updateButtons(data) {
  const hasTranscript = !!(data && data.transcript);
  const hasJson = !!(data && data.json);
  copyBtn.disabled = !hasTranscript;
  saveBtn.disabled = !hasJson;
}

function queryActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs && tabs[0]);
    });
  });
}

async function fetchChatExport() {
  latestExport = null;

  const tab = await queryActiveTab();
  if (!tab) {
    return { error: "No active tab found." };
  }

  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id, { type: "GET_CHAT_EXPORT" }, (res) => {
      if (chrome.runtime.lastError) {
        resolve({
          error:
            "Cannot reach the page. Open a ChatGPT conversation and refresh."
        });
        return;
      }
      if (!res) {
        resolve({ error: "No conversation captured yet." });
        return;
      }
      latestExport = res;
      resolve({ data: res });
    });
  });
}

async function renderExport() {
  setOutput("Loading…");
  updateButtons(null);
  const { data, error } = await fetchChatExport();
  if (error) {
    setOutput(error);
    updateButtons(null);
    return;
  }

  updateButtons(data);

  if (data.transcript) {
    setOutput(data.transcript);
  } else {
    setOutput("Transcript not available on this page.");
  }
}

copyBtn.onclick = async () => {
  if (copyBtn.disabled) return;
  if (!latestExport) {
    await renderExport();
  }
  if (latestExport && latestExport.transcript) {
    await navigator.clipboard.writeText(latestExport.transcript);
    console.log("📋 Transcript copied");
  } else {
    await navigator.clipboard.writeText("No conversation captured yet.");
  }
};

saveBtn.onclick = async () => {
  if (saveBtn.disabled) return;
  if (!latestExport) {
    await renderExport();
  }
  if (!latestExport || !latestExport.json) {
    setOutput("No conversation captured yet.");
    return;
  }

  const blob = new Blob([JSON.stringify(latestExport.json, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "chat-export.json";
  a.click();
  URL.revokeObjectURL(url);
};

renderExport();
