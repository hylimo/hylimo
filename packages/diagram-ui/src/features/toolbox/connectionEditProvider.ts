/**
 * Provider for the current connection edit
 */
export interface ConnectionEditProvider {
    /**
     * The current connection edit or undefined if no connection edit is available
     */
    readonly connectionEdit: `connection/${string}` | undefined;
}
