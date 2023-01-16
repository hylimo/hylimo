import { ContainerModule } from "inversify";
import { TYPES } from "../types";
import { TransactionIdProvider } from "./transactionIdProvider";

/**
 * Transaction module
 */
const transactionModule = new ContainerModule((bind, _unbind, isBound) => {
    bind(TransactionIdProvider).toSelf().inSingletonScope();
    bind(TYPES.TransactionIdProvider).toService(TransactionIdProvider);
});

export default transactionModule;
