"use strict";
(() => {
  // src/ui.html
  var ui_default = '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Copy composite node ID</title>\n    <style>\n      * { box-sizing: border-box; }\n\n      body {\n        margin: 0;\n        min-width: 0;\n        color: var(--figma-color-text);\n        background: var(--figma-color-bg);\n        font: 12px/1.4 Inter, sans-serif;\n      }\n\n      main { padding: 12px; }\n\n      .card {\n        border: 1px solid var(--figma-color-border);\n        border-radius: 6px;\n        overflow: hidden;\n      }\n\n      .heading {\n        display: flex;\n        align-items: center;\n        justify-content: space-between;\n        gap: 8px;\n        padding: 10px 12px;\n        border-bottom: 1px solid var(--figma-color-border);\n        font-weight: 600;\n      }\n\n      .badge {\n        padding: 2px 6px;\n        border-radius: 10px;\n        color: var(--figma-color-text-secondary);\n        background: var(--figma-color-bg-secondary);\n        font-size: 10px;\n        font-weight: 500;\n      }\n\n      .details { padding: 10px 12px; }\n\n      .label {\n        margin: 10px 0 3px;\n        color: var(--figma-color-text-secondary);\n        font-size: 11px;\n      }\n\n      .label:first-child { margin-top: 0; }\n\n      .value {\n        overflow-wrap: anywhere;\n        color: var(--figma-color-text);\n        font-family: "Roboto Mono", monospace;\n        font-size: 11px;\n        user-select: text;\n      }\n\n      .name {\n        overflow: hidden;\n        text-overflow: ellipsis;\n        white-space: nowrap;\n        font-family: Inter, sans-serif;\n        font-size: 12px;\n      }\n\n      .actions {\n        display: grid;\n        grid-template-columns: 1fr 1fr;\n        gap: 8px;\n        padding: 10px 12px;\n        border-top: 1px solid var(--figma-color-border);\n      }\n\n      button {\n        min-width: 0;\n        height: 32px;\n        border: 0;\n        border-radius: 5px;\n        color: var(--figma-color-text-onbrand);\n        background: var(--figma-color-bg-brand);\n        cursor: pointer;\n        font: inherit;\n        font-weight: 600;\n      }\n\n      button:hover { background: var(--figma-color-bg-brand-hover); }\n      button:focus-visible { outline: 2px solid var(--figma-color-border-brand-strong); outline-offset: 2px; }\n      button.secondary { color: var(--figma-color-text); background: var(--figma-color-bg-secondary); }\n      button.secondary:hover { background: var(--figma-color-bg-secondary-hover); }\n      button:disabled { color: var(--figma-color-text-disabled); background: var(--figma-color-bg-disabled); cursor: default; }\n\n      .empty { padding: 20px 12px; color: var(--figma-color-text-secondary); text-align: center; }\n      .feedback { min-height: 17px; padding: 0 12px 10px; color: var(--figma-color-text-success); font-size: 11px; }\n      [hidden] { display: none; }\n    </style>\n  </head>\n  <body>\n    <main>\n      <section class="card" aria-live="polite">\n        <div class="heading">Copy composite node ID <span class="badge" id="node-type">No selection</span></div>\n        <div id="empty-state" class="empty">Select a layer to copy its AI link.</div>\n        <div id="node-details" class="details" hidden>\n          <div class="label">Layer</div>\n          <div id="node-name" class="value name"></div>\n          <div class="label">Composite Node ID</div>\n          <div id="node-id" class="value"></div>\n        </div>\n        <div class="actions">\n          <button id="copy-link" type="button" disabled>Copy AI Link</button>\n          <button id="copy-id" class="secondary" type="button" disabled>Copy Node ID</button>\n        </div>\n        <div id="feedback" class="feedback" aria-live="polite"></div>\n      </section>\n    </main>\n    <script>\n      const state = { node: null, feedbackTimer: null };\n      const element = (id) => document.getElementById(id);\n      const nodeType = element("node-type");\n      const emptyState = element("empty-state");\n      const nodeDetails = element("node-details");\n      const copyLink = element("copy-link");\n      const copyId = element("copy-id");\n      const feedback = element("feedback");\n\n      function post(message) {\n        parent.postMessage({ pluginMessage: message }, "*");\n      }\n\n      async function copyText(text) {\n        try {\n          await navigator.clipboard.writeText(text);\n          return true;\n        } catch (_) {\n          const textarea = document.createElement("textarea");\n          textarea.value = text;\n          textarea.setAttribute("readonly", "");\n          textarea.style.cssText = "position:fixed;opacity:0;pointer-events:none";\n          document.body.appendChild(textarea);\n          textarea.select();\n          const copied = document.execCommand("copy");\n          textarea.remove();\n          return copied;\n        }\n      }\n\n      function showFeedback(message, success) {\n        feedback.textContent = message;\n        feedback.style.color = success\n          ? "var(--figma-color-text-success)"\n          : "var(--figma-color-text-danger)";\n        clearTimeout(state.feedbackTimer);\n        state.feedbackTimer = setTimeout(() => { feedback.textContent = ""; }, 1800);\n      }\n\n      function render() {\n        const node = state.node;\n        const hasNode = node !== null;\n        nodeType.textContent = hasNode ? node.type : "No selection";\n        emptyState.hidden = hasNode;\n        nodeDetails.hidden = !hasNode;\n        copyLink.disabled = !hasNode;\n        copyId.disabled = !hasNode;\n        if (hasNode) {\n          element("node-name").textContent = node.name;\n          element("node-id").textContent = node.id;\n        }\n      }\n\n      copyLink.addEventListener("click", async () => {\n        const success = await copyText(state.node.aiLink);\n        showFeedback(success ? "AI link copied" : "Copy failed", success);\n      });\n\n      copyId.addEventListener("click", async () => {\n        const success = await copyText(state.node.id);\n        showFeedback(success ? "Node ID copied" : "Copy failed", success);\n      });\n\n      window.addEventListener("message", async (event) => {\n        const message = event.data.pluginMessage;\n        if (!message) return;\n\n        if (message.type === "selection") {\n          state.node = message.node;\n          render();\n        }\n\n        if (message.type === "copy") {\n          post({ type: "copy-result", success: await copyText(message.text) });\n        }\n      });\n\n      post({ type: "ready" });\n    <\/script>\n  </body>\n</html>\n';

  // src/code.ts
  function getNodeDetails(node) {
    const id = node.id;
    const fileKey = figma.fileKey || "";
    const aiLink = fileKey ? `https://www.figma.com/design/${fileKey}/?node-id=${encodeURIComponent(id)}&m=dev` : id;
    return {
      name: node.name,
      type: node.type,
      id,
      aiLink
    };
  }
  function selectedNodeDetails() {
    const node = figma.currentPage.selection[0];
    return node ? getNodeDetails(node) : null;
  }
  function showInspectPanel() {
    figma.showUI(ui_default, { themeColors: true });
    const updateSelection = () => {
      figma.ui.postMessage({ type: "selection", node: selectedNodeDetails() });
    };
    figma.ui.onmessage = (message) => {
      if (message.type === "ready") {
        updateSelection();
      }
    };
    figma.on("selectionchange", updateSelection);
  }
  function copySelectedNodeAndClose() {
    const node = selectedNodeDetails();
    if (!node) {
      figma.notify("Select a layer before copying its AI link.", { error: true });
      figma.closePlugin();
      return;
    }
    figma.showUI(ui_default, { visible: false, themeColors: true });
    figma.ui.onmessage = (message) => {
      if (message.type === "ready") {
        figma.ui.postMessage({ type: "copy", text: node.aiLink });
      }
      if (message.type === "copy-result") {
        figma.notify(
          message.success ? "AI link copied to clipboard." : "Could not copy the AI link to the clipboard.",
          { error: !message.success }
        );
        figma.closePlugin();
      }
    };
  }
  if (figma.mode === "inspect") {
    showInspectPanel();
  } else if (figma.mode === "codegen") {
    figma.codegen.on("generate", ({ node, language }) => {
      if (language !== "ai-node-link") {
        return [];
      }
      const details = getNodeDetails(node);
      return [
        {
          title: "AI Link",
          language: "PLAINTEXT",
          code: `${details.aiLink}

Composite Node ID: ${details.id}`
        }
      ];
    });
  } else {
    copySelectedNodeAndClose();
  }
})();
