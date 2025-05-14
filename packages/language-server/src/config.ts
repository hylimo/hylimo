import type { DiagramConfig } from "@hylimo/diagram-common";
import type { DynamicLanguageServerConfig, EditorConfig, SharedSettings } from "@hylimo/diagram-protocol";

/**
 * Dynamic configuration for a diagram language server
 */
export class Config implements DynamicLanguageServerConfig {
    /**
     * The configuration for the diagram itself
     */
    readonly diagramConfig: DiagramConfig;
    /**
     * The settings for the language server
     * The are permanent values which can be modified by the user
     */
    readonly settings: SharedSettings;
    /**
     * The configuration for the graphical editor
     */
    readonly editorConfig: EditorConfig;

    /**
     * Creates a new Config object based on the given configuration
     *
     * @param config the configuration to use
     */
    constructor(config: DynamicLanguageServerConfig) {
        this.settings = config.settings;
        this.diagramConfig = config.diagramConfig;
        this.editorConfig = config.editorConfig;
    }

    /**
     * Rounds a value to a specific precision if given
     * If no precision is given, the value is returned unchanged
     *
     * @param value the value to round
     * @param precision the precision to use
     * @returns the rounded value
     */
    roundToPrecision(value: number, precision: number | undefined): number {
        if (precision == undefined) {
            return value;
        }
        return Math.round(value / precision) * precision;
    }

    /**
     * Rounds a value to the translation precision
     *
     * @param value the value to round
     * @returns the rounded value
     */
    roundToTranslationPrecision(value: number): number {
        return this.roundToPrecision(value, this.settings.translationPrecision);
    }

    /**
     * Rounds a value to the resize precision
     *
     * @param value the value to round
     * @returns the rounded value
     */
    roundToResizePrecision(value: number): number {
        return this.roundToPrecision(value, this.settings.resizePrecision);
    }

    /**
     * Rounds a value to the line point pos precision
     *
     * @param value the value to round
     * @returns the rounded value
     */
    roundToLinePointPosPrecision(value: number): number {
        return this.roundToPrecision(value, this.settings.linePointPosPrecision);
    }

    /**
     * Rounds a value to the line point distance precision
     *
     * @param value the value to round
     * @returns the rounded value
     */
    roundToLinePointDistancePrecision(value: number): number {
        return this.roundToPrecision(value, this.settings.linePointDistancePrecision);
    }

    /**
     * Rounds a value to the axis aligned pos precision
     *
     * @param value the value to round
     * @returns the rounded value
     */
    roundToAxisAlignedPosPrecision(value: number): number {
        return this.roundToPrecision(value, this.settings.axisAlignedPosPrecision);
    }

    /**
     * Rounds a value to the rotation precision
     *
     * @param value the value to round
     * @returns the rounded value
     */
    roundToRotationPrecision(value: number): number {
        return this.roundToPrecision(value, this.settings.rotationPrecision);
    }
}
