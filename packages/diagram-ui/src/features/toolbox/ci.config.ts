import { ContainerModule } from "inversify";
import { configureActionHandler, TYPES } from "sprotty";
import { Toolbox } from "./toolbox.js";
import { SetModelAction, UpdateModelAction } from "sprotty-protocol";
import { EditorConfigUpdatedAction, TransactionalAction } from "@hylimo/diagram-protocol";

/**
 * Toolbox module
 */
export const toolboxModule = new ContainerModule((bind, _unbind, isBound) => {
    const context = { bind, isBound };
    bind(Toolbox).toSelf().inSingletonScope();
    bind(TYPES.IUIExtension).toService(Toolbox);
    configureActionHandler(context, UpdateModelAction.KIND, Toolbox);
    configureActionHandler(context, SetModelAction.KIND, Toolbox);
    configureActionHandler(context, TransactionalAction.KIND, Toolbox);
    configureActionHandler(context, EditorConfigUpdatedAction.KIND, Toolbox);
});
