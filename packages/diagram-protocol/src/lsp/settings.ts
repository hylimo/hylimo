/**
 * The settings for the language server
 */
export interface LanguageServerSettings {
    /**
     * The precision of absolute/relative points
     */
    translationPrecision?: number;
    /**
     * The precision for resizing canvas elements
     */
    resizePrecision?: number;
    /**
     * The precision for the pos of a line point
     */
    linePointPosPrecision?: number;
    /**
     * The precision for the distance of a line point
     */
    linePointDistancePrecision?: number;
    /**
     * The precision for the pos of an axis aligned segment
     */
    axisAlignedPosPrecision?: number;
    /**
     * The precision of the roation of an element
     */
    rotationPrecision?: number;
}
