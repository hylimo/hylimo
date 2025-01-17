import { ContainerModule } from "inversify";
import { TYPES } from "sprotty";
import { MoveEditCanvasContentMouseListener } from "./moveEditCanvasContentMouseListener.js";

/**
 * Module for all kinds of canvas content edit operations, including
 * - moving canvas contents
 * - modifying axis aligned canvas connection segments
 * - resizing canvas elements
 * - rotating canvas elements
 */
export const canvasContentMoveEditModule = new ContainerModule((bind, _unbind, _isBound) => {
    bind(MoveEditCanvasContentMouseListener).toSelf().inSingletonScope();
    bind(TYPES.MouseListener).toService(MoveEditCanvasContentMouseListener);
});
