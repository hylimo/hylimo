import { ContainerModule } from "inversify";
import { configureCommand, TYPES as SPROTTY_TYPES } from "sprotty";
import { CreateAndMoveMouseListener } from "./createAndMoveMouseListener.js";
import { CreateAndMoveCommand } from "./createAndMoveCommand.js";
import { TYPES } from "../types.js";

/**
 * Move module for create actions
 */
export const createAndMoveModule = new ContainerModule((bind, _unbind, isBound) => {
    bind(CreateAndMoveMouseListener).toSelf().inSingletonScope();
    bind(SPROTTY_TYPES.MouseListener).toService(CreateAndMoveMouseListener);
    bind(TYPES.CreateAndMoveMouseListener).toService(CreateAndMoveMouseListener);
    configureCommand({ bind, isBound }, CreateAndMoveCommand);
});
