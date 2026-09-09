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

function run(): void {
  try {
    figma.showUI(uiHtml, {
      width: 260,
      height: 48,
      title: "Copy composite node ID",
      themeColors: true,
    });

    const updateSelection = () => {
      figma.ui.postMessage({ type: "selection", payload: getSelectionPayload() });
    };

    figma.ui.onmessage = (message) => {
      if (message.type === "ready") {
        updateSelection();
      }
      if (message.type === "copied") {
        figma.notify(`📋 Copied composite node ID for "${message.name || "selection"}"`);
        figma.closePlugin();
      }
    };

    figma.on("selectionchange", updateSelection);
  } catch (err: any) {
    console.error("[CopyPlugin] Error opening widget:", err);
    figma.notify("Error: " + (err?.message || String(err)), { error: true });
  }
}

run();
