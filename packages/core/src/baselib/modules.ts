import { booleanModule } from "./modules/boolean";
import { commonModule } from "./modules/common";
import { debugModule } from "./modules/debug";
import { objectModule } from "./modules/object";

/**
 * Default baselib modules
 */
export const defaultModules = [objectModule, debugModule, commonModule, booleanModule];
