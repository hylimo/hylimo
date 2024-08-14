import { ContainerModule } from "inversify";
import { configureCommand } from "sprotty";
import { ResetCanvasBoundsCommand } from "./resetCanvasBoundsCommand.js";

/**
 * Move module for  resetting the canvas bounds
 */
export const resetCanvasBoundsModule = new ContainerModule((bind, _unbind, isBound) => {
    configureCommand({ bind, isBound }, ResetCanvasBoundsCommand);
});
