import { ContainerModule } from "inversify";
import { configureCommand } from "sprotty";
import { MoveMouseListener } from "./moveMouseListener.js";
import { TransactionalMoveCommand } from "./transactionalMoveCommand.js";
import { TYPES } from "../types.js";
import { MoveCursorProvider, SetMoveCursorCommand } from "./cursor.js";

/**
 * Move module for handling transactional move operations
 */
export const moveModule = new ContainerModule((bind, _unbind, isBound) => {
    bind(MoveMouseListener).toSelf().inSingletonScope();
    bind(TYPES.MouseListener).toService(MoveMouseListener);
    bind(TYPES.CreateAndMoveMouseListener).toService(MoveMouseListener);
    bind(MoveCursorProvider).toSelf().inSingletonScope();
    bind(TYPES.MoveCursorProvider).toService(MoveCursorProvider);
    configureCommand({ bind, isBound }, TransactionalMoveCommand);
    configureCommand({ bind, isBound }, SetMoveCursorCommand);
});
