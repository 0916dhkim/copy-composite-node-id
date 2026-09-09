import uiHtml from "./ui.html";

type NodeDetails = {
  name: string;
  type: string;
  id: string;
  aiLink: string;
};

function getNodeDetails(node: SceneNode): NodeDetails {
  const id = node.id;
  const fileKey = figma.fileKey || "";
  const aiLink = fileKey
    ? `https://www.figma.com/design/${fileKey}/?node-id=${encodeURIComponent(id)}&m=dev`
    : id;
  return {
    name: node.name,
    type: node.type,
    id,
    aiLink,
  };
}

function selectedNodeDetails(): NodeDetails | null {
  const node = figma.currentPage.selection[0];
  return node ? getNodeDetails(node) : null;
}

function showInspectPanel(): void {
  figma.showUI(uiHtml, { themeColors: true });

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

function copySelectedNodeAndClose(): void {
  const node = selectedNodeDetails();
  if (!node) {
    figma.notify("Select a layer before copying its AI link.", { error: true });
    figma.closePlugin();
    return;
  }

  // An invisible iframe provides browser clipboard access for quick actions.
  figma.showUI(uiHtml, { visible: false, themeColors: true });
  figma.ui.onmessage = (message) => {
    if (message.type === "ready") {
      figma.ui.postMessage({ type: "copy", text: node.aiLink });
    }

    if (message.type === "copy-result") {
      figma.notify(
        message.success ? "AI link copied to clipboard." : "Could not copy the AI link to the clipboard.",
        { error: !message.success },
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
        code: `${details.aiLink}\n\nComposite Node ID: ${details.id}`,
      },
    ];
  });
} else {
  copySelectedNodeAndClose();
}
