import { ContainerModule } from "inversify";
import { SnapLinesStateManager } from "./snapLinesStateManager.js";
import { TYPES } from "../types.js";
import { configureActionHandler } from "sprotty";
import { UpdateSnapLinesAction } from "./updateSnapLines.js";
import { TransactionalAction } from "@hylimo/diagram-protocol";

/**
 * Module for snapping elements
 */
export const snapModule = new ContainerModule((bind, _unbind, isBound) => {
    bind(SnapLinesStateManager).toSelf().inSingletonScope();
    bind(TYPES.SnapLinesStateManager).toService(SnapLinesStateManager);
    configureActionHandler({ bind, isBound }, UpdateSnapLinesAction.KIND, SnapLinesStateManager);
    configureActionHandler({ bind, isBound }, TransactionalAction.KIND, SnapLinesStateManager);
});
