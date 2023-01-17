import { TransactionalAction, TranslationMoveAction } from "@hylimo/diagram-common";
import { TextDocumentEdit } from "vscode-languageserver";
import { Diagram } from "../diagram";
import { TranslationMoveEdit } from "./edits/translationMoveEdit";
import { TransactionalEdit } from "./transactionalEdit";

/**
 * Handles TransactionActions modifying the textdocument
 */
export class TransactionManager {
    /**
     * Current transactionId
     */
    private currentTransactionId?: string;
    /**
     * Current edit handling actions of the same transaction
     */
    private edit?: TransactionalEdit<any>;

    /**
     * Creates a new TransactionManager which handles edits to the specified textDocument
     *
     * @param diagram the associated Diagram
     */
    constructor(private readonly diagram: Diagram) {}

    /**
     * Handles an action. Does currently not support concurrent/interleaved transactions
     *
     * @param action the action to handle
     * @returns the created TextDocumentEdit
     */
    handleAction(action: TransactionalAction): TextDocumentEdit {
        if (this.currentTransactionId != undefined && this.currentTransactionId != action.transactionId) {
            throw new Error("Concurrent transactions are currently not supported");
        }
        this.currentTransactionId = action.transactionId;
        if (this.edit == undefined) {
            this.edit = this.generateTransactionalEdit(action);
        }
        const result = this.edit.applyAction(action);
        if (action.commited) {
            this.currentTransactionId = undefined;
            this.edit = undefined;
        }
        return result;
    }

    /**
     * Generates a TransactionalEdit for the action.
     * Supports TranslationMoveActions.
     *
     * @param action the action to handle
     * @returns the generated TransactionEdit for further actions of this transaction
     */
    private generateTransactionalEdit(action: TransactionalAction): TransactionalEdit<any> {
        if (TranslationMoveAction.is(action)) {
            return new TranslationMoveEdit(action, this.diagram);
        } else {
            throw new Error(`Unknown transaction action: ${action.kind}`);
        }
    }
}
