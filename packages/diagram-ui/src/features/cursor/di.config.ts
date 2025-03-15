import { ContainerModule } from "inversify";
import { configureCommand } from "sprotty";
import { TYPES } from "../types.js";
import { CursorProvider, UpdateCursorCommand } from "./cursor.js";

/**
 * Module for global cursor handling
 */
export const cursorModule = new ContainerModule((bind, _unbind, isBound) => {
    bind(CursorProvider).toSelf().inSingletonScope();
    bind(TYPES.MoveCursorProvider).toService(CursorProvider);
    configureCommand({ bind, isBound }, UpdateCursorCommand);
});
