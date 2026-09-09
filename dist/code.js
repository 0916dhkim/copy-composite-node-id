"use strict";
(() => {
  // src/ui.html
  var ui_default = '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Copy composite node ID</title>\n    <style>\n      * { box-sizing: border-box; }\n\n      body {\n        margin: 0;\n        padding: 8px;\n        color: var(--figma-color-text);\n        background: var(--figma-color-bg);\n        font: 12px/1.4 Inter, -apple-system, sans-serif;\n      }\n\n      button {\n        width: 100%;\n        height: 32px;\n        border: 0;\n        border-radius: 6px;\n        color: var(--figma-color-text-onbrand);\n        background: var(--figma-color-bg-brand);\n        cursor: pointer;\n        font: inherit;\n        font-weight: 500;\n        display: flex;\n        align-items: center;\n        justify-content: center;\n        gap: 6px;\n        transition: background 0.1s ease;\n      }\n\n      button:hover:not(:disabled) {\n        background: var(--figma-color-bg-brand-hover);\n      }\n\n      button:disabled {\n        color: var(--figma-color-text-disabled);\n        background: var(--figma-color-bg-secondary);\n        cursor: default;\n      }\n\n      button.success {\n        background: var(--figma-color-bg-success, #18a957);\n        color: #fff;\n      }\n\n      #ta {\n        position: absolute;\n        bottom: 0;\n        left: -9999px;\n        opacity: 0;\n        pointer-events: none;\n      }\n    </style>\n  </head>\n  <body>\n    <textarea id="ta" tabindex="-1"></textarea>\n    <button id="copy-btn" type="button" disabled>Select a layer</button>\n\n    <script>\n      let currentPayload = null;\n      let resetTimer = null;\n      const copyBtn = document.getElementById("copy-btn");\n      const ta = document.getElementById("ta");\n\n      function post(message) {\n        console.log("[CopyUI] Posting to plugin:", message);\n        parent.postMessage({ pluginMessage: message }, "*");\n      }\n\n      function execCopy(text) {\n        console.log("[CopyUI] execCopy called. Text length:", text ? text.length : 0);\n        ta.value = text;\n        ta.select();\n        ta.setSelectionRange(0, text.length);\n        let success = false;\n        try {\n          success = document.execCommand("copy");\n          console.log("[CopyUI] execCommand copy result:", success);\n        } catch (e) {\n          console.error("[CopyUI] execCommand error:", e);\n        }\n        if (!success && navigator.clipboard && navigator.clipboard.writeText) {\n          navigator.clipboard.writeText(text);\n          success = true;\n          console.log("[CopyUI] navigator.clipboard.writeText fallback used");\n        }\n        return success;\n      }\n\n      function updateUI(payload) {\n        currentPayload = payload;\n        clearTimeout(resetTimer);\n        copyBtn.classList.remove("success");\n\n        if (payload) {\n          copyBtn.disabled = false;\n          copyBtn.textContent = "Copy composite node ID";\n        } else {\n          copyBtn.disabled = true;\n          copyBtn.textContent = "Select a layer";\n        }\n      }\n\n      copyBtn.addEventListener("click", () => {\n        if (!currentPayload) return;\n        const success = execCopy(currentPayload.text);\n        if (success) {\n          copyBtn.textContent = "\u2713 Copied!";\n          copyBtn.classList.add("success");\n          clearTimeout(resetTimer);\n          resetTimer = setTimeout(() => {\n            copyBtn.classList.remove("success");\n            copyBtn.textContent = "Copy composite node ID";\n          }, 1200);\n        }\n      });\n\n      window.addEventListener("message", (event) => {\n        const message = event.data.pluginMessage;\n        console.log("[CopyUI] Received message from plugin:", message);\n        if (!message) return;\n\n        if (message.type === "selection") {\n          updateUI(message.payload);\n        }\n\n        if (message.type === "copy") {\n          const success = execCopy(message.text);\n          post({ type: "copy-done", success });\n        }\n      });\n\n      console.log("[CopyUI] UI script initialized, sending ready");\n      post({ type: "ready" });\n    <\/script>\n  </body>\n</html>\n';

  // src/code.ts
  function getCopyPayload(node) {
    const id = node.id;
    const fileKey = figma.fileKey;
    const docName = figma.root.name ? encodeURIComponent(figma.root.name) : "";
    const docUrl = fileKey ? `https://www.figma.com/design/${fileKey}/${docName}?node-id=${encodeURIComponent(id)}&m=dev` : "";
    const text = docUrl ? `${docUrl}
${id}` : id;
    return {
      text,
      name: node.name
    };
  }
  function getSelectionPayload() {
    const node = figma.currentPage.selection[0];
    return node ? getCopyPayload(node) : null;
  }
  function showInspectPanel() {
    figma.showUI(ui_default, { themeColors: true, height: 48 });
    const updateSelection = () => {
      figma.ui.postMessage({ type: "selection", payload: getSelectionPayload() });
    };
    figma.ui.onmessage = (message) => {
      if (message.type === "ready") {
        updateSelection();
      }
    };
    figma.on("selectionchange", updateSelection);
  }
  function copySelectedNodeAndClose() {
    try {
      const payload = getSelectionPayload();
      console.log("[CopyPlugin] copySelectedNodeAndClose payload:", payload);
      if (!payload) {
        figma.closePlugin("\u26A0\uFE0F Select a layer first");
        return;
      }
      figma.ui.onmessage = (message) => {
        console.log("[CopyPlugin] onmessage received from UI:", message);
        if (message.type === "copy-done") {
          if (message.success) {
            figma.closePlugin(`\u{1F4CB} Copied composite node ID for "${payload.name}"`);
          } else {
            figma.closePlugin(`\u26A0\uFE0F Clipboard write failed for "${payload.name}"`);
          }
        }
      };
      figma.showUI(ui_default, { width: 0, height: 0 });
      console.log("[CopyPlugin] showUI called, posting copy message");
      figma.ui.postMessage({ type: "copy", text: payload.text });
    } catch (err) {
      console.error("[CopyPlugin] copySelectedNodeAndClose error:", err);
      figma.notify("Error: " + (err?.message || String(err)), { error: true });
    }
  }
  try {
    console.log("[CopyPlugin] Main thread started. command:", figma.command, "mode:", figma.mode, "editorType:", figma.editorType);
    if (figma.command === "open-widget") {
      showInspectPanel();
    } else if (figma.command === "copy") {
      copySelectedNodeAndClose();
    } else if (figma.mode === "inspect") {
      showInspectPanel();
    } else {
      copySelectedNodeAndClose();
    }
  } catch (err) {
    console.error("[CopyPlugin] Top-level error:", err);
    figma.notify("Error: " + (err?.message || String(err)), { error: true });
  }
})();
