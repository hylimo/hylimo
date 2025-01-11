import { ContainerModule } from "inversify";
import { configureCommand, TYPES } from "sprotty";
import { ConnectionCreationMouseListener } from "./connectionCreationMouseListener.js";
import { ConnectionCreationKeyListener } from "./connectionCreationKeyListener.js";
import { UpdateConnectionPreviewCommand } from "./updateConnectionPreview.js";

/**
 * Module for updating the connection creation preview
 */
export const connectionCreationModule = new ContainerModule((bind, _unbind, isBound) => {
    bind(ConnectionCreationMouseListener).toSelf().inSingletonScope();
    bind(TYPES.MouseListener).toService(ConnectionCreationMouseListener);
    bind(ConnectionCreationKeyListener).toSelf().inSingletonScope();
    bind(TYPES.KeyListener).toService(ConnectionCreationKeyListener);
    configureCommand({ bind, isBound }, UpdateConnectionPreviewCommand);
});
