import { ContainerModule } from "inversify";
import { TYPES } from "sprotty";
import { MoveMouseListener } from "./moveMouseListener";

/**
 * Move module for moving canvas elements
 */
export const moveModule = new ContainerModule((bind, _unbind, _isBound) => {
    bind(MoveMouseListener).toSelf().inSingletonScope();
    bind(TYPES.MouseListener).toService(MoveMouseListener);
});
