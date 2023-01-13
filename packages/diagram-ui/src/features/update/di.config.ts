import { ContainerModule } from "inversify";
import { configureCommand } from "sprotty";
import { UpdateModelCommand } from "./update-model";

/**
 * Module which configers the UpdateModelCommand
 */
const updateModule = new ContainerModule((bind, _unbind, isBound) => {
    configureCommand({ bind, isBound }, UpdateModelCommand);
});

export default updateModule;
