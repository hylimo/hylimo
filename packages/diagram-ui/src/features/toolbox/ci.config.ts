import { ContainerModule } from "inversify";
import { configureActionHandler, TYPES as SPROTTY_TYPES } from "sprotty";
import { Toolbox } from "./toolbox.js";
import { SetModelAction, UpdateModelAction } from "sprotty-protocol";
import { EditorConfigUpdatedAction, TransactionalAction } from "@hylimo/diagram-protocol";
import { TYPES } from "../types.js";

/**
 * Toolbox module
 */
export const toolboxModule = new ContainerModule((bind, _unbind, isBound) => {
    const context = { bind, isBound };
    bind(Toolbox).toSelf().inSingletonScope();
    bind(SPROTTY_TYPES.IUIExtension).toService(Toolbox);
    bind(TYPES.ConnectionEditProvider).toService(Toolbox);
    configureActionHandler(context, UpdateModelAction.KIND, Toolbox);
    configureActionHandler(context, SetModelAction.KIND, Toolbox);
    configureActionHandler(context, TransactionalAction.KIND, Toolbox);
    configureActionHandler(context, EditorConfigUpdatedAction.KIND, Toolbox);
});
