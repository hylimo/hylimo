import { injectable } from "inversify";

/**
 * Transaction id provider
 */
@injectable()
export class TransactionIdProvider {
    private idCounter = 0;

    /**
     * Generates a new unique transaction id
     *
     * @returns the generated id
     */
    generateId(): string {
        this.idCounter++;
        return this.idCounter.toString();
    }
}
