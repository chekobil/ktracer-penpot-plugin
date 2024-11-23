import type { PluginMessageEvent } from "./types";
import type { Shape, Board, FlexLayout } from "@penpot/plugin-types";

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
    const shapeSize = Number(message.data.size);
    const shapeScale = Number(message.data.scale);
    let board: Board;
    let flex: FlexLayout;
    if (
      penpot.selection?.length === 1 &&
      penpot.selection[0]?.type === "board"
    ) {
      board = penpot.selection[0];
    } else {
      board = penpot.createBoard();
      board.name = "icon-collection";
      board.resize(300, 160);
      centerShape(board);
      flex = board.addFlexLayout();
      flex.dir = "row";
      flex.wrap = "wrap"; // not working
      flex.alignItems = "center";
      flex.alignContent = "start";
      flex.justifyContent = "start";
      flex.rowGap = 6;
      flex.columnGap = 6;
      flex.topPadding = 10;
      flex.bottomPadding = 10;
      flex.leftPadding = 10;
      flex.rightPadding = 10;
    }
    if (board.flex) board.flex.wrap = "wrap"; // working
    //console.log("FLEX::", flex);

    selectShape(board);
    // shapes.push(board);
    const shape = penpot.createShapeFromSvg(svg);
    if (shape) {
      shape.name = shapeName;
      shape.proportionLock = true;
      shape.constraintsHorizontal = "scale";
      shape.constraintsVertical = "scale";
      shape.children.forEach((child) => {
        // SCALE strokes, the same scale the shape is transformed from the viewBox
        if (child.type === "path" && child.strokes?.length) {
          const newStrokes: Shape["strokes"] = [];
          const currentStrokes = [...child.strokes];
          currentStrokes?.forEach((stroke) => {
            if (stroke.strokeWidth) {
              const newStroke = parseFloat(
                Number(stroke.strokeWidth / shapeScale).toFixed(2)
              );
              stroke.strokeWidth = newStroke;
            }
            newStrokes.push(stroke);
          });
          child.strokes = [...newStrokes];
          // console.log("SHAPE::", shapeScale, newStrokes, child.strokes);
        }
      });

      board.appendChild(shape);
      shape.resize(shapeSize, shapeSize);
    }
  }
});
penpot.on("themechange", (theme) => {
  sendMessage({ type: "theme", content: theme });
});

function sendMessage(message: PluginMessageEvent) {
  penpot.ui.sendMessage(message);
}
