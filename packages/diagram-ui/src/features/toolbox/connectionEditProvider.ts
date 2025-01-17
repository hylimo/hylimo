/**
 * Provider for the current connection edit
 */
export interface ConnectionEditProvider {
    /**
     * Gets the current connection edit
     *
     * @returns the current connection edit or undefined if no connection edit is available
     */
    getConnectionEdit(): `connection/${string}` | undefined;
}
