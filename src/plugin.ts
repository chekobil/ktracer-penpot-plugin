import type { PluginMessageEvent } from "./types";
import type { Shape } from "@penpot/plugin-types";

const centerShape = (shape: Shape) => {
  shape.x = penpot.viewport.center.x;
  shape.y = penpot.viewport.center.y;
};
const selectShape = (shape: Shape) => {
  penpot.selection = [shape];
};

penpot.ui.open("KTracer", `?theme=${penpot.theme}`, {
  width: 460,
  height: 660,
});

penpot.ui.onMessage((message: PluginMessageEvent) => {
  if (message.type === "create-svg") {
    const svg = message?.content;
    const name = message.data?.name ?? "Image";
    if (!svg) return;
    const shape = penpot.createShapeFromSvg(svg);
    if (shape) {
      shape.name = name;
      shape.proportionLock = true;
      shape.constraintsHorizontal = "scale";
      shape.constraintsVertical = "scale";
      centerShape(shape);
      selectShape(shape);
      sendMessage({ type: "svg-created" });
    }
  }
});

penpot.on("themechange", (theme) => {
  sendMessage({ type: "theme", content: theme });
});

function sendMessage(message: PluginMessageEvent) {
  penpot.ui.sendMessage(message);
}
