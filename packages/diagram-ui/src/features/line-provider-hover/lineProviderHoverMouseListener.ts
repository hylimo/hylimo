import { injectable } from "inversify";
import { findParentByFeature, MouseListener, SModelElementImpl } from "sprotty";
import { Action } from "sprotty-protocol";
import { SCanvasElement } from "../../model/canvas/sCanvasElement.js";
import { SCanvasConnection } from "../../model/canvas/sCanvasConnection.js";
import { UpdateLineProviderHoverDataAction } from "./updateLineProviderHoverData.js";
import { LineProviderHoverData } from "./lineProviderHoverData.js";
import { LineEngine } from "@hylimo/diagram-common";
import { applyToPoint } from "transformation-matrix";
import { isLineProvider } from "./lineProvider.js";

/**
 * Mouse listener for updating the line provider hover UI based on mouse movements
 */
@injectable()
export class LineProviderHoverMouseListener extends MouseListener {
    override mouseMove(target: SModelElementImpl, event: MouseEvent): Action[] {
        const lineProvider = findParentByFeature(target, isLineProvider);
        if (lineProvider == undefined) {
            return [];
        }
        const action: UpdateLineProviderHoverDataAction = {
            kind: UpdateLineProviderHoverDataAction.KIND,
            isVisible: event.shiftKey,
            providerWithTarget: {
                target: lineProvider.id,
                provider: () => this.generateData(event, lineProvider)
            }
        };
        return [action];
    }

    override mouseOver(target: SModelElementImpl): Action[] {
        const lineProvider = findParentByFeature(target, isLineProvider);
        if (lineProvider != undefined) {
            return [];
        }
        const action: UpdateLineProviderHoverDataAction = {
            kind: UpdateLineProviderHoverDataAction.KIND,
            isVisible: false,
            providerWithTarget: null
        };
        return [action];
    }

    /**
     * Provides the line provider hover data based on the current mouse position and the target element.
     *
     * @param event provider for the mouse position
     * @param target the target element
     * @returns the line provider hover data
     */
    private generateData(event: MouseEvent, target: SCanvasElement | SCanvasConnection): LineProviderHoverData {
        const context = target.parent;
        const line = target.root.layoutEngine.layoutLine(target, context.id);
        const point = applyToPoint(context.getMouseTransformationMatrix(), { x: event.pageX, y: event.pageY });
        const projectionResult = LineEngine.DEFAULT.projectPoint(point, line);
        return {
            line,
            projectionResult,
            position: projectionResult.pos
        };
    }
}
