import { ContainerModule } from "inversify";
import { TYPES } from "../types.js";
import { configureCommand } from "sprotty";
import { KeyStateKeyListener } from "./keyStateKeyListener.js";
import { KeyState } from "./keyState.js";
import { UpdateKeyStateCommand } from "./updateKeyState.js";

/**
 * Module for global key state
 */
export const keyStateModule = new ContainerModule((bind, _unbind, isBound) => {
    bind(KeyStateKeyListener).toSelf().inSingletonScope();
    bind(TYPES.KeyListener).toService(KeyStateKeyListener);
    bind(KeyState).toSelf().inSingletonScope();
    bind(TYPES.KeyState).toService(KeyState);
    configureCommand({ bind, isBound }, UpdateKeyStateCommand);
});
