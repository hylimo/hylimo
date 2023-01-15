import { ContainerModule } from "inversify";
import { configureCommand } from "sprotty";
import { NoOpBringToFrontCommand } from "./noOpBringToFrontCommand";

/**
 * No-op zorder module
 */
const zorderModule = new ContainerModule((bind, _unbind, isBound) => {
    configureCommand({ bind, isBound }, NoOpBringToFrontCommand);
});

export default zorderModule;
