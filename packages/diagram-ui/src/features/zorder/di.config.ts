import { ContainerModule } from "inversify";
import { configureCommand } from "sprotty";
import { NoOpBringToFrontCommand } from "./noOpBringToFrontCommand.js";

/**
 * No-op zorder module
 */
export const zorderModule = new ContainerModule((bind, _unbind, isBound) => {
    configureCommand({ bind, isBound }, NoOpBringToFrontCommand);
});
