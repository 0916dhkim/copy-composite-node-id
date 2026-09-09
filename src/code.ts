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
    figma.notify("Select a layer first.", { error: true });
    figma.closePlugin();
    return;
  }

  // A 0x0 offscreen UI is required so the browser DOM allows clipboard focus and copy
  figma.showUI(uiHtml, { visible: true, width: 0, height: 0 });

  let sent = false;
  const sendCopy = () => {
    if (sent) return;
    sent = true;
    figma.ui.postMessage({ type: "copy", text: payload.text });
  };

  sendCopy();

  figma.ui.onmessage = (message) => {
    if (message.type === "ready") {
      sendCopy();
    }

    if (message.type === "copy-result") {
      figma.notify(
        message.success ? `Copied composite node ID for "${payload.name}"` : "Could not copy to clipboard",
        { error: !message.success },
      );
      figma.closePlugin();
    }
  };
}

// When invoked from right-click / menu command, figma.command is "copy".
// When launched from the Dev Mode inspect sidebar, figma.command is empty and figma.mode is "inspect".
if (figma.command === "copy" || figma.mode === "default") {
  copySelectedNodeAndClose();
} else if (figma.mode === "inspect") {
  showInspectPanel();
} else {
  copySelectedNodeAndClose();
}
