import { ContainerModule } from "inversify";
import { TYPES } from "sprotty";
import { SplitCanvasSegmentMouseListener } from "./splitCanvasSegmentMouseListener.js";
import { MoveEditCanvasContentMouseListener } from "./moveEditCanvasContentMouseListener.js";

/**
 * Module for all kinds of canvas content edit operations, including
 * - moving canvas contents
 * - modifying axis aligned canvas connection segments
 * - resizing canvas elements
 * - rotating canvas elements
 * - splitting canvas connection segments into two parts
 */
export const canvasContentEditModule = new ContainerModule((bind, _unbind, _isBound) => {
    bind(SplitCanvasSegmentMouseListener).toSelf().inSingletonScope();
    bind(TYPES.MouseListener).toService(SplitCanvasSegmentMouseListener);
    bind(MoveEditCanvasContentMouseListener).toSelf().inSingletonScope();
    bind(TYPES.MouseListener).toService(MoveEditCanvasContentMouseListener);
});
