import { Point } from "@hylimo/diagram-common";
import { SChildElement } from "sprotty";
import { PositionProvider } from "../../features/layout/positionProvider";
import { SCanvas } from "./canvas";

/**
 * Base model for all canvas points
 */
export abstract class SCanvasPoint extends SChildElement implements PositionProvider {
    override parent!: SCanvas;
    /**
     * The provided position
     */
    abstract position: Point;
}
