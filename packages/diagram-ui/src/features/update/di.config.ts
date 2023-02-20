import { ContainerModule } from "inversify";
import { configureCommand } from "sprotty";
import { IncrementalUpdateModelCommand } from "./incrementalUpdateModel";
import { UpdateModelCommand } from "./updateModel";

/**
 * Module which configers the UpdateModelCommand
 */
export const updateModule = new ContainerModule((bind, _unbind, isBound) => {
    configureCommand({ bind, isBound }, UpdateModelCommand);
    configureCommand({ bind, isBound }, IncrementalUpdateModelCommand);
});
