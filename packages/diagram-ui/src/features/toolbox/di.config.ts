import { ContainerModule } from "inversify";
import { configureActionHandler } from "sprotty";
import { Toolbox } from "./toolbox.js";
import { SelectAction, SelectAllAction, SetModelAction, UpdateModelAction } from "sprotty-protocol";
import { EditorConfigUpdatedAction, TransactionalAction } from "@hylimo/diagram-protocol";
import { TYPES } from "../types.js";
import { ToolState } from "./toolState.js";
import { SetToolAction } from "./setToolAction.js";

/**
 * Toolbox module
 */
export const toolboxModule = new ContainerModule((bind, _unbind, isBound) => {
    const context = { bind, isBound };
    bind(ToolState).toSelf().inSingletonScope();
    bind(Toolbox).toSelf().inSingletonScope();
    bind(TYPES.IUIExtension).toService(Toolbox);
    bind(TYPES.ConnectionEditProvider).toService(Toolbox);
    bind(TYPES.ToolTypeProvider).toService(ToolState);
    configureActionHandler(context, UpdateModelAction.KIND, Toolbox);
    configureActionHandler(context, SetModelAction.KIND, Toolbox);
    configureActionHandler(context, TransactionalAction.KIND, Toolbox);
    configureActionHandler(context, EditorConfigUpdatedAction.KIND, Toolbox);
    configureActionHandler(context, SetToolAction.KIND, Toolbox);
    configureActionHandler(context, SelectAction.KIND, Toolbox);
    configureActionHandler(context, SelectAllAction.KIND, Toolbox);
});
