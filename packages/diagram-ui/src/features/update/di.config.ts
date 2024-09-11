import { ContainerModule } from "inversify";
import { configureCommand } from "sprotty";
import { IncrementalUpdateModelCommand } from "./incrementalUpdateModel.js";
import { UpdateModelCommand } from "./updateModel.js";

/**
 * Module which configures the UpdateModelCommand
 */
export const updateModule = new ContainerModule((bind, _unbind, isBound) => {
    configureCommand({ bind, isBound }, UpdateModelCommand);
    configureCommand({ bind, isBound }, IncrementalUpdateModelCommand);
});
