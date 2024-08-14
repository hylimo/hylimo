import { ContainerModule } from "inversify";
import { TYPES } from "sprotty";
import { NavigationMouseListener } from "./navigationMouseListener.js";

/**
 * Navigation module for navigating from canvas elements to the code
 */
export const navigationModule = new ContainerModule((bind, _unbind, _isBound) => {
    bind(NavigationMouseListener).toSelf().inSingletonScope();
    bind(TYPES.MouseListener).toService(NavigationMouseListener);
});
