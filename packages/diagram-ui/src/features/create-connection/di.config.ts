import { ContainerModule } from "inversify";
import { CreateConnectionVNodePostprocessor } from "./createConnectionVNodePostprocessor.js";
import { CreateConnectionMouseListener } from "./createConnectionMouseListener.js";
import { TYPES } from "../types.js";
import { configureCommand } from "sprotty";
import { UpdateCreateConnectionHoverDataCommand } from "./updateCreateConnectionHoverData.js";

/**
 * Module for creating connections graphically
 */
export const createConnectionModule = new ContainerModule((bind, _unbind, isBound) => {
    bind(CreateConnectionMouseListener).toSelf().inSingletonScope();
    bind(TYPES.MouseListener).toService(CreateConnectionMouseListener);
    bind(CreateConnectionVNodePostprocessor).toSelf().inSingletonScope();
    bind(TYPES.IVNodePostprocessor).toService(CreateConnectionVNodePostprocessor);
    configureCommand({ bind, isBound }, UpdateCreateConnectionHoverDataCommand);
});
