import type { PluginMessageEvent } from "./types";
import type { Shape } from "@penpot/plugin-types";

const centerShape = (shape: Shape) => {
  shape.x = penpot.viewport.center.x;
  shape.y = penpot.viewport.center.y;
};
const selectShape = (shape: Shape) => {
  penpot.selection = [shape];
};

penpot.ui.open("Iconify.uno", `?theme=${penpot.theme}`);

penpot.ui.onMessage((message: PluginMessageEvent) => {
  if (message.type === "create-text") {
    const shape = penpot.createText(message.content);
    if (shape) {
      centerShape(shape);
      selectShape(shape);
    }
  } else if (message.type === "create-svg") {
    const svg = message.content;
    const shapeName = message.data.icon;
    const shapeSize = message.data.size;
  }
});
penpot.on("themechange", (theme) => {
  sendMessage({ type: "theme", content: theme });
});

function sendMessage(message: PluginMessageEvent) {
  penpot.ui.sendMessage(message);
}
