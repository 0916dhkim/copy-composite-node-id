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
    console.log("[CopyPlugin] Started. Command:", figma.command, "Mode:", figma.mode, "Selection count:", figma.currentPage.selection.length);

    figma.showUI(uiHtml, {
      width: 260,
      height: 48,
      title: "Copy composite node ID",
      themeColors: true,
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
        figma.notify(`📋 Copied composite node ID for "${message.name || "selection"}"`);
      }
    };

    // Send selection immediately AND on ready AND on selection changes
    updateSelection();
    figma.on("selectionchange", updateSelection);
  } catch (err: any) {
    console.error("[CopyPlugin] Error opening widget:", err);
    figma.notify("Error: " + (err?.message || String(err)), { error: true });
  }
}

run();
