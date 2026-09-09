import uiHtml from "./ui.html";

type CopyPayload = {
  text: string;
  name: string;
};

function getCopyPayload(node: SceneNode): CopyPayload {
  const id = node.id;
  const fileKey = figma.fileKey;
  const docName = figma.root.name ? encodeURIComponent(figma.root.name) : "";
  const docUrl = fileKey
    ? `https://www.figma.com/design/${fileKey}/${docName}?node-id=${encodeURIComponent(id)}&m=dev`
    : "";
  const text = docUrl ? `${docUrl}\n${id}` : id;
  return {
    text,
    name: node.name,
  };
}

function getSelectionPayload(): CopyPayload | null {
  const node = figma.currentPage.selection[0];
  return node ? getCopyPayload(node) : null;
}

function showInspectPanel(): void {
  figma.showUI(uiHtml, { themeColors: true, height: 48 });

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

function copySelectedNodeAndClose(): void {
  try {
    const payload = getSelectionPayload();
    console.log("[CopyPlugin] copySelectedNodeAndClose payload:", payload);
    if (!payload) {
      figma.closePlugin("⚠️ Select a layer first");
      return;
    }

    figma.ui.onmessage = (message) => {
      console.log("[CopyPlugin] onmessage received from UI:", message);
      if (message.type === "copy-done") {
        if (message.success) {
          figma.closePlugin(`📋 Copied composite node ID for "${payload.name}"`);
        } else {
          figma.closePlugin(`⚠️ Clipboard write failed for "${payload.name}"`);
        }
      }
    };

    figma.showUI(uiHtml, { width: 0, height: 0 });
    console.log("[CopyPlugin] showUI called, posting copy message");
    figma.ui.postMessage({ type: "copy", text: payload.text });
  } catch (err: any) {
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
} catch (err: any) {
  console.error("[CopyPlugin] Top-level error:", err);
  figma.notify("Error: " + (err?.message || String(err)), { error: true });
}
