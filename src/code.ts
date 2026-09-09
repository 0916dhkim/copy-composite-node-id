import uiHtml from "./ui.html";

type CopyPayload = {
  text: string;
  name: string;
};

function getCopyPayload(node: SceneNode): CopyPayload {
  const id = node.id;
  const fileKey = figma.fileKey || "";
  const docUrl = fileKey
    ? `https://www.figma.com/design/${fileKey}/?node-id=${encodeURIComponent(id)}&m=dev`
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

  // An invisible iframe provides browser clipboard access for quick actions.
  figma.showUI(uiHtml, { visible: false, themeColors: true });
  figma.ui.onmessage = (message) => {
    if (message.type === "ready") {
      figma.ui.postMessage({ type: "copy", text: payload.text });
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

if (figma.mode === "inspect") {
  showInspectPanel();
} else {
  copySelectedNodeAndClose();
}
