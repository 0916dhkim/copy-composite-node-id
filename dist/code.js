"use strict";
(() => {
  // src/ui.html
  var ui_default = '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Copy composite node ID</title>\n    <style>\n      * { box-sizing: border-box; }\n\n      body {\n        margin: 0;\n        padding: 8px;\n        color: var(--figma-color-text);\n        background: var(--figma-color-bg);\n        font: 12px/1.4 Inter, -apple-system, sans-serif;\n      }\n\n      button {\n        width: 100%;\n        height: 32px;\n        border: 0;\n        border-radius: 6px;\n        color: var(--figma-color-text-onbrand);\n        background: var(--figma-color-bg-brand);\n        cursor: pointer;\n        font: inherit;\n        font-weight: 500;\n        display: flex;\n        align-items: center;\n        justify-content: center;\n        gap: 6px;\n        transition: background 0.1s ease;\n      }\n\n      button:hover:not(:disabled) {\n        background: var(--figma-color-bg-brand-hover);\n      }\n\n      button:disabled {\n        color: var(--figma-color-text-disabled);\n        background: var(--figma-color-bg-secondary);\n        cursor: default;\n      }\n\n      button.success {\n        background: var(--figma-color-bg-success, #18a957);\n        color: #fff;\n      }\n    </style>\n  </head>\n  <body>\n    <button id="copy-btn" type="button" disabled>Select a layer</button>\n\n    <script>\n      let currentPayload = null;\n      let resetTimer = null;\n      const copyBtn = document.getElementById("copy-btn");\n\n      function post(message) {\n        parent.postMessage({ pluginMessage: message }, "*");\n      }\n\n      async function copyText(text) {\n        try {\n          await navigator.clipboard.writeText(text);\n          return true;\n        } catch (_) {\n          const textarea = document.createElement("textarea");\n          textarea.value = text;\n          textarea.setAttribute("readonly", "");\n          textarea.style.cssText = "position:fixed;opacity:0;pointer-events:none";\n          document.body.appendChild(textarea);\n          textarea.select();\n          const copied = document.execCommand("copy");\n          textarea.remove();\n          return copied;\n        }\n      }\n\n      function updateUI(payload) {\n        currentPayload = payload;\n        clearTimeout(resetTimer);\n        copyBtn.classList.remove("success");\n\n        if (payload) {\n          copyBtn.disabled = false;\n          copyBtn.textContent = "Copy composite node ID";\n        } else {\n          copyBtn.disabled = true;\n          copyBtn.textContent = "Select a layer";\n        }\n      }\n\n      copyBtn.addEventListener("click", async () => {\n        if (!currentPayload) return;\n        const success = await copyText(currentPayload.text);\n        if (success) {\n          copyBtn.textContent = "\u2713 Copied!";\n          copyBtn.classList.add("success");\n          clearTimeout(resetTimer);\n          resetTimer = setTimeout(() => {\n            copyBtn.classList.remove("success");\n            copyBtn.textContent = "Copy composite node ID";\n          }, 1200);\n        }\n      });\n\n      window.addEventListener("message", async (event) => {\n        const message = event.data.pluginMessage;\n        if (!message) return;\n\n        if (message.type === "selection") {\n          updateUI(message.payload);\n        }\n\n        if (message.type === "copy") {\n          post({ type: "copy-result", success: await copyText(message.text) });\n        }\n      });\n\n      post({ type: "ready" });\n    <\/script>\n  </body>\n</html>\n';

  // src/code.ts
  function getCopyPayload(node) {
    const id = node.id;
    const fileKey = figma.fileKey || "";
    const docUrl = fileKey ? `https://www.figma.com/design/${fileKey}/?node-id=${encodeURIComponent(id)}&m=dev` : "";
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
    const payload = getSelectionPayload();
    if (!payload) {
      figma.notify("Select a layer first.", { error: true });
      figma.closePlugin();
      return;
    }
    figma.showUI(ui_default, { visible: false, themeColors: true });
    figma.ui.onmessage = (message) => {
      if (message.type === "ready") {
        figma.ui.postMessage({ type: "copy", text: payload.text });
      }
      if (message.type === "copy-result") {
        figma.notify(
          message.success ? `Copied composite node ID for "${payload.name}"` : "Could not copy to clipboard",
          { error: !message.success }
        );
        figma.closePlugin();
      }
    };
  }
  if (figma.mode === "inspect") {
    showInspectPanel();
  } else {
    copySelectedNodeAndClose();
  }
})();
