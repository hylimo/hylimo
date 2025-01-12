import { ContainerModule } from "inversify";
import { configureCommand, TYPES } from "sprotty";
import { CreateConnectionMouseListener } from "./createConnectionMouseListener.js";
import { CreateConnectionKeyListener } from "./createConnectionKeyListener.js";
import { UpdateCreateConnectionDataCommand } from "./updateCreateConnectionData.js";
import { CreateConnectionVNodePostprocessor } from "./createConnectionVNodePostprocessor.js";

/**
 * Module for creating connections graphically
 */
export const createConnectionModule = new ContainerModule((bind, _unbind, isBound) => {
    bind(CreateConnectionMouseListener).toSelf().inSingletonScope();
    bind(TYPES.MouseListener).toService(CreateConnectionMouseListener);
    bind(CreateConnectionKeyListener).toSelf().inSingletonScope();
    bind(TYPES.KeyListener).toService(CreateConnectionKeyListener);
    bind(CreateConnectionVNodePostprocessor).toSelf().inSingletonScope();
    bind(TYPES.IVNodePostprocessor).toService(CreateConnectionVNodePostprocessor);
    configureCommand({ bind, isBound }, UpdateCreateConnectionDataCommand);
});
