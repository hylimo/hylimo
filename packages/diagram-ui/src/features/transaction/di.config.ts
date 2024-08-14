import { ContainerModule } from "inversify";
import { TYPES } from "../types.js";
import { TransactionIdProvider } from "./transactionIdProvider.js";

/**
 * Transaction module
 */
export const transactionModule = new ContainerModule((bind, _unbind, _isBound) => {
    bind(TransactionIdProvider).toSelf().inSingletonScope();
    bind(TYPES.TransactionIdProvider).toService(TransactionIdProvider);
});
