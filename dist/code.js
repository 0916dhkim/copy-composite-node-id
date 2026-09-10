"use strict";
(() => {
  // src/ui.html
  var ui_default = '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Copy composite node ID</title>\n    <style>\n      * { box-sizing: border-box; }\n\n      body {\n        margin: 0;\n        padding: 8px;\n        color: var(--figma-color-text);\n        background: var(--figma-color-bg);\n        font: 12px/1.4 Inter, -apple-system, sans-serif;\n        overflow: hidden;\n      }\n\n      button {\n        width: 100%;\n        height: 32px;\n        border: 0;\n        border-radius: 6px;\n        color: var(--figma-color-text-onbrand);\n        background: var(--figma-color-bg-brand);\n        cursor: pointer;\n        font: inherit;\n        font-weight: 500;\n        display: flex;\n        align-items: center;\n        justify-content: center;\n        gap: 6px;\n        transition: background 0.1s ease;\n      }\n\n      button:hover:not(:disabled) {\n        background: var(--figma-color-bg-brand-hover);\n      }\n\n      button:disabled {\n        color: var(--figma-color-text-disabled);\n        background: var(--figma-color-bg-secondary);\n        cursor: default;\n      }\n\n      button.success {\n        background: var(--figma-color-bg-success, #18a957);\n        color: #fff;\n      }\n    </style>\n  </head>\n  <body>\n    <button id="copy-btn" type="button" disabled>Select a layer</button>\n\n    <script>\n      let currentPayload = null;\n      let resetTimer = null;\n      const copyBtn = document.getElementById("copy-btn");\n\n      function post(message) {\n        console.log("[CopyUI] Posting to plugin:", message);\n        parent.postMessage({ pluginMessage: message }, "*");\n      }\n\n      function execCopy(text) {\n        console.log("[CopyUI] execCopy called. Text length:", text ? text.length : 0);\n        const copyFrom = document.createElement("textarea");\n        copyFrom.textContent = text;\n        copyFrom.style.position = "fixed";\n        copyFrom.style.left = "0";\n        copyFrom.style.top = "0";\n        copyFrom.style.width = "10px";\n        copyFrom.style.height = "10px";\n        copyFrom.style.opacity = "0.01";\n        document.body.appendChild(copyFrom);\n\n        copyFrom.focus({ preventScroll: true });\n        copyFrom.select();\n\n        let success = false;\n        try {\n          success = document.execCommand("copy");\n          console.log("[CopyUI] execCommand copy result:", success);\n        } catch (e) {\n          console.error("[CopyUI] execCommand error:", e);\n        }\n\n        document.body.removeChild(copyFrom);\n\n        if (!success && navigator.clipboard && navigator.clipboard.writeText) {\n          navigator.clipboard.writeText(text);\n          success = true;\n          console.log("[CopyUI] navigator.clipboard.writeText fallback used");\n        }\n        return success;\n      }\n\n      function updateUI(payload) {\n        console.log("[CopyUI] updateUI received payload:", payload);\n        currentPayload = payload;\n        clearTimeout(resetTimer);\n        copyBtn.classList.remove("success");\n\n        if (payload) {\n          copyBtn.disabled = false;\n          copyBtn.textContent = "Copy composite node ID";\n        } else {\n          copyBtn.disabled = true;\n          copyBtn.textContent = "Select a layer";\n        }\n      }\n\n      copyBtn.addEventListener("click", () => {\n        console.log("[CopyUI] Button clicked. currentPayload:", currentPayload);\n        if (!currentPayload) {\n          console.warn("[CopyUI] Click ignored: no layer selected");\n          return;\n        }\n        const success = execCopy(currentPayload.text);\n        if (success) {\n          copyBtn.textContent = "\u2713 Copied!";\n          copyBtn.classList.add("success");\n          clearTimeout(resetTimer);\n          resetTimer = setTimeout(() => {\n            copyBtn.classList.remove("success");\n            copyBtn.textContent = "Copy composite node ID";\n          }, 1200);\n          post({ type: "copied", name: currentPayload.name });\n        } else {\n          copyBtn.textContent = "Copy failed";\n          clearTimeout(resetTimer);\n          resetTimer = setTimeout(() => {\n            copyBtn.textContent = "Copy composite node ID";\n          }, 1500);\n        }\n      });\n\n      window.addEventListener("message", (event) => {\n        const message = event.data.pluginMessage;\n        console.log("[CopyUI] Received message from plugin:", message);\n        if (!message) return;\n\n        if (message.type === "selection") {\n          updateUI(message.payload);\n        }\n\n        if (message.type === "copy") {\n          const success = execCopy(message.text);\n          post({ type: "copy-done", success });\n        }\n      });\n\n      console.log("[CopyUI] UI script initialized, sending ready");\n      post({ type: "ready" });\n    <\/script>\n  </body>\n</html>\n';

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
  function run() {
    try {
      console.log("[CopyPlugin] Started. Command:", figma.command, "Mode:", figma.mode, "Selection count:", figma.currentPage.selection.length);
      figma.showUI(ui_default, {
        width: 260,
        height: 48,
        title: "Copy composite node ID",
        themeColors: true
      });
      const updateSelection = () => {
        const payload = getSelectionPayload();
        console.log("[CopyPlugin] Sending selection to UI:", payload ? payload.name : "null");
        figma.ui.postMessage({ type: "selection", payload });
      };
      figma.ui.onmessage = (message) => {
        console.log("[CopyPlugin] Received message from UI:", message);
        if (message.type === "ready") {
          updateSelection();
        }
        if (message.type === "copied") {
          figma.notify(`\u{1F4CB} Copied composite node ID for "${message.name || "selection"}"`);
        }
      };
      updateSelection();
      figma.on("selectionchange", updateSelection);
    } catch (err) {
      console.error("[CopyPlugin] Error opening widget:", err);
      figma.notify("Error: " + (err?.message || String(err)), { error: true });
    }
  }
  run();
})();
