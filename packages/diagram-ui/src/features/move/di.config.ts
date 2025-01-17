import { ContainerModule } from "inversify";
import { configureCommand, TYPES as SPROTTY_TYPES } from "sprotty";
import { MoveMouseListener } from "./moveMouseListener.js";
import { TransactionalMoveCommand } from "./transactionalMoveCommand.js";
import { TYPES } from "../types.js";

/**
 * Move module for handling transactional move operations
 */
export const moveModule = new ContainerModule((bind, _unbind, isBound) => {
    bind(MoveMouseListener).toSelf().inSingletonScope();
    bind(SPROTTY_TYPES.MouseListener).toService(MoveMouseListener);
    bind(TYPES.CreateAndMoveMouseListener).toService(MoveMouseListener);
    configureCommand({ bind, isBound }, TransactionalMoveCommand);
});
