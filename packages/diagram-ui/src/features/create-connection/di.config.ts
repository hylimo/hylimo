import { ContainerModule } from "inversify";
import { TYPES } from "sprotty";
import { CreateConnectionVNodePostprocessor } from "./createConnectionVNodePostprocessor.js";
import { CreateConnectionMouseListener } from "./createConnectionMouseListener.js";

/**
 * Module for creating connections graphically
 */
export const createConnectionModule = new ContainerModule((bind) => {
    bind(CreateConnectionMouseListener).toSelf().inSingletonScope();
    bind(TYPES.MouseListener).toService(CreateConnectionMouseListener);
    bind(CreateConnectionVNodePostprocessor).toSelf().inSingletonScope();
    bind(TYPES.IVNodePostprocessor).toService(CreateConnectionVNodePostprocessor);
});
