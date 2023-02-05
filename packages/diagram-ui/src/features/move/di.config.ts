import { ContainerModule } from "inversify";
import { configureCommand, TYPES } from "sprotty";
import { LineMoveCommand } from "./lineMoveCommand";
import { MoveMouseListener } from "./moveMouseListener";
import { TranslationMoveCommand } from "./translationMoveCommand";

/**
 * Move module for moving canvas elements
 */
export const moveModule = new ContainerModule((bind, _unbind, isBound) => {
    bind(MoveMouseListener).toSelf().inSingletonScope();
    bind(TYPES.MouseListener).toService(MoveMouseListener);
    configureCommand({ bind, isBound }, TranslationMoveCommand);
    configureCommand({ bind, isBound }, LineMoveCommand);
});
