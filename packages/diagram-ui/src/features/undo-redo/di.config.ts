import { ContainerModule } from "inversify";
import { RemoteUndoRedoKeyListener } from "./remoteUndoRedoKeyListener.js";
import { TYPES } from "sprotty";

/**
 * Module for remote undo and redo actions
 */
export const undoRedoModule = new ContainerModule((bind) => {
    bind(RemoteUndoRedoKeyListener).toSelf().inSingletonScope();
    bind(TYPES.KeyListener).toService(RemoteUndoRedoKeyListener);
});
