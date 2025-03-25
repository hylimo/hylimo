import { ContainerModule } from "inversify";
import { TouchTool } from "./touch-tool.js";
import { TYPES } from "../types.js";
import { PointerTool } from "./pointer-tool.js";

/**
 * Module for code that should eventually be contributed to sprotty
 */
export const contribModule = new ContainerModule((bind) => {
    bind(TouchTool).toSelf().inSingletonScope();
    bind(TYPES.IVNodePostprocessor).toService(TouchTool);
    bind(PointerTool).toSelf().inSingletonScope();
    bind(TYPES.IVNodePostprocessor).toService(PointerTool);
});
