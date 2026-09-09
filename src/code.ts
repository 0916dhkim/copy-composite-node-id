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
  const payload = getSelectionPayload();
  if (!payload) {
    figma.closePlugin("⚠️ Select a layer first");
    return;
  }

  let closed = false;
  const finish = () => {
    if (closed) return;
    closed = true;
    figma.closePlugin(`📋 Copied composite node ID for "${payload.name}"`);
  };

  figma.ui.onmessage = (message) => {
    if (message.type === "copy-done") {
      finish();
    }
  };

  figma.showUI(uiHtml, { width: 0, height: 0 });
  figma.ui.postMessage({ type: "copy", text: payload.text });

  // Safety fallback so plugin never hangs
  setTimeout(finish, 350);
}

// When invoked from right-click:
// - "Copy link + node ID" sets figma.command = "copy"
// - "Open inspect widget" sets figma.command = "open-widget"
// When launched directly from Dev Mode Plugins sidebar, figma.command is empty and figma.mode is "inspect".
if (figma.command === "open-widget") {
  showInspectPanel();
} else if (figma.command === "copy") {
  copySelectedNodeAndClose();
} else if (figma.mode === "inspect") {
  showInspectPanel();
} else {
  copySelectedNodeAndClose();
}
