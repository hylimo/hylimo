import { ContainerModule } from "inversify";
import { SelectMouseListener as SprottySelectMouseListener } from "sprotty";
import { SelectMouseListener } from "./selectMouseListener.js";
import { BoxSelectMouseListener } from "./boxSelectMouseListener.js";
import { TYPES } from "../types.js";

/**
 * Module which slightly changes how select works, depending on the tool
 */
export const selectModule = new ContainerModule((bind, _unbind, _isBound, rebind) => {
    bind(SelectMouseListener).toSelf().inSingletonScope();
    rebind(SprottySelectMouseListener).toService(SelectMouseListener);
    bind(BoxSelectMouseListener).toSelf().inSingletonScope();
    bind(TYPES.MouseListener).toService(BoxSelectMouseListener);
    bind(TYPES.BoxSelectProvider).toService(BoxSelectMouseListener);
});
