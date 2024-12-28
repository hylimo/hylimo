import { ContainerModule } from "inversify";
import { TYPES } from "../types.js";
import { TransactionIdProvider } from "./transactionIdProvider.js";
import { TransactionStateProvider } from "./transactionStateProvider.js";
import { configureActionHandler } from "sprotty";
import { TransactionalAction } from "@hylimo/diagram-protocol";

/**
 * Transaction module
 */
export const transactionModule = new ContainerModule((bind, _unbind, isBound) => {
    bind(TransactionIdProvider).toSelf().inSingletonScope();
    bind(TYPES.TransactionIdProvider).toService(TransactionIdProvider);
    bind(TransactionStateProvider).toSelf().inSingletonScope();
    bind(TYPES.TransactionStateProvider).toService(TransactionStateProvider);
    configureActionHandler({ bind, isBound }, TransactionalAction.KIND, TransactionStateProvider);
});
