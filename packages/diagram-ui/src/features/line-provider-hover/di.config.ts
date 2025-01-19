import { ContainerModule } from "inversify";
import { LineProviderHoverKeyListener } from "./lineProviderHoverKeyListener.js";
import { LineProviderHoverMouseListener } from "./lineProviderHoverMouseListener.js";
import { configureCommand, TYPES } from "sprotty";
import { UpdateLineProviderHoverDataCommand } from "./updateLineProviderHoverData.js";

/**
 * Module for updating the UI based on hovering over a line provider and holding shift
 */
export const lineProviderHoverModule = new ContainerModule((bind, _unbind, isBound) => {
    bind(LineProviderHoverMouseListener).toSelf().inSingletonScope();
    bind(TYPES.MouseListener).toService(LineProviderHoverMouseListener);
    bind(LineProviderHoverKeyListener).toSelf().inSingletonScope();
    bind(TYPES.KeyListener).toService(LineProviderHoverKeyListener);
    configureCommand({ bind, isBound }, UpdateLineProviderHoverDataCommand);
});
