import { ContainerModule } from "inversify";
import { TYPES } from "../types.js";
import { SplitCanvasSegmentMouseListener } from "./splitCanvasSegmentMouseListener.js";
import { configureCommand } from "sprotty";
import { UpdateSplitConnectionPreviewDataCommand } from "./updateSplitConnectionPreviewData.js";

/**
 * Module for splitting canvas connection segments into two parts using an edit
 */
export const splitCanvasSegmentModule = new ContainerModule((bind, _unbind, isBound) => {
    bind(SplitCanvasSegmentMouseListener).toSelf().inSingletonScope();
    bind(TYPES.MouseListener).toService(SplitCanvasSegmentMouseListener);
    configureCommand({ bind, isBound }, UpdateSplitConnectionPreviewDataCommand);
});
