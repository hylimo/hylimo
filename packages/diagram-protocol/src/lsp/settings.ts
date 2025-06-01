/**
 * Shared settings for the language server and diagram editor.
 */
export interface SharedSettings {
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

export namespace SharedSettings {
    /**
     * Rounds a value to a specific precision if given
     * If no precision is given, the value is returned unchanged
     *
     * @param value the value to round
     * @param precision the precision to use
     * @returns the rounded value
     */
    export function roundToPrecision(value: number, precision: number | undefined): number {
        if (precision == undefined) {
            return value;
        }
        return Math.round(value / precision) * precision;
    }

    /**
     * Rounds a value to the translation precision
     *
     * @param settings the shared settings
     * @param value the value to round
     * @returns the rounded value
     */
    export function roundToTranslationPrecision(settings: SharedSettings, value: number): number {
        return roundToPrecision(value, settings.translationPrecision);
    }

    /**
     * Rounds a value to the resize precision
     *
     * @param settings the shared settings
     * @param value the value to round
     * @returns the rounded value
     */
    export function roundToResizePrecision(settings: SharedSettings, value: number): number {
        return roundToPrecision(value, settings.resizePrecision);
    }

    /**
     * Rounds a value to the line point pos precision
     *
     * @param settings the shared settings
     * @param value the value to round
     * @returns the rounded value
     */
    export function roundToLinePointPosPrecision(settings: SharedSettings, value: number): number {
        return roundToPrecision(value, settings.linePointPosPrecision);
    }

    /**
     * Rounds a value to the line point distance precision
     *
     * @param settings the shared settings
     * @param value the value to round
     * @returns the rounded value
     */
    export function roundToLinePointDistancePrecision(settings: SharedSettings, value: number): number {
        return roundToPrecision(value, settings.linePointDistancePrecision);
    }

    /**
     * Rounds a value to the axis aligned pos precision
     * Also clamps the value to the range [-1, 1]
     *
     * @param settings the shared settings
     * @param value the value to round
     * @returns the rounded value
     */
    export function roundToAxisAlignedPosPrecision(settings: SharedSettings, value: number): number {
        return Math.max(Math.min(roundToPrecision(value, settings.axisAlignedPosPrecision), 1), -1);
    }

    /**
     * Rounds a value to the rotation precision
     *
     * @param settings the shared settings
     * @param value the value to round
     * @returns the rounded value
     */
    export function roundToRotationPrecision(settings: SharedSettings, value: number): number {
        return roundToPrecision(value, settings.rotationPrecision);
    }
}
