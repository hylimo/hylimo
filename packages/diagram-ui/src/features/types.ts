import { TYPES as SPROTTY_TYPES } from "sprotty";

/**
 * Types for injectable entities
 */
export const TYPES = {
    ...SPROTTY_TYPES,
    TransactionIdProvider: Symbol("TransactionIdProvider"),
    TransactionStateProvider: Symbol("TransactionStateProvider"),
    CreateAndMoveMouseListener: Symbol("CreateAndMoveMouseListener"),
    ConfigManager: Symbol("ConfigManager"),
    ConnectionEditProvider: Symbol("ConnectionEditProvider"),
    MoveCursorProvider: Symbol("MoveCursorProvider")
};
