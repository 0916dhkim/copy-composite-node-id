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
  try {
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
  } catch (err: any) {
    console.error("[CopyPlugin] Error opening inspect panel:", err);
    figma.notify("Error: " + (err?.message || String(err)), { error: true });
  }
}

showInspectPanel();
