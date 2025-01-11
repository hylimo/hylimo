import { findParentByFeature, MouseListener, SModelElementImpl } from "sprotty";
import { Action } from "sprotty-protocol";
import { SCanvasElement } from "../../model/canvas/sCanvasElement.js";
import { SCanvasConnection } from "../../model/canvas/sCanvasConnection.js";
import { UpdateConnectionPreviewAction } from "./updateConnectionPreview.js";
import { ConnectionCreationPreview } from "./connectionCreationPreview.js";
import { LineEngine } from "@hylimo/diagram-common";
import { applyToPoint } from "transformation-matrix";

/**
 * Mouse listener for updating the connection creation preview based on mouse movements
 */
export class ConnectionCreationMouseListener extends MouseListener {
    override mouseMove(target: SModelElementImpl, event: MouseEvent): Action[] {
        const lineProvider = findParentByFeature(target, isLineProvider);
        if (lineProvider == undefined) {
            return [];
        }
        const action: UpdateConnectionPreviewAction = {
            kind: UpdateConnectionPreviewAction.KIND,
            isVisible: event.shiftKey,
            provider: () => this.createPreview(event, lineProvider)
        };
        return [action];
    }

    override mouseOver(target: SModelElementImpl, event: MouseEvent): Action[] {
        const lineProvider = findParentByFeature(target, isLineProvider);
        if (
            lineProvider != undefined ||
            (event.target as HTMLElement).classList.contains(ConnectionCreationPreview.CLASS)
        ) {
            return [];
        }
        const action: UpdateConnectionPreviewAction = {
            kind: UpdateConnectionPreviewAction.KIND,
            isVisible: false,
            provider: null
        };
        return [action];
    }

    /**
     * Creates a connection creation preview based on the current mouse position and the target element.
     *
     * @param event provider for the mouse position
     * @param target the target element
     * @returns the connection creation preview
     */
    private createPreview(event: MouseEvent, target: SCanvasElement | SCanvasConnection): ConnectionCreationPreview {
        const root = target.root;
        const line = root.layoutEngine.layoutLine(target, root.id);
        const point = applyToPoint(root.getMouseTransformationMatrix(), { x: event.pageX, y: event.pageY });
        const nearest = LineEngine.DEFAULT.projectPoint(point, line);
        return {
            startElementEditExpression: target.editExpression!,
            line,
            position: nearest.pos
        };
    }
}

/**
 * Finds the line provider for the given target element
 * Returns true if the element is a canvas element or connection with an edit expression
 *
 * @param target the target element
 * @returns the line provider or undefined
 */
function isLineProvider(element: SModelElementImpl): element is SCanvasElement | SCanvasConnection {
    return (
        (element instanceof SCanvasElement || element instanceof SCanvasConnection) &&
        element.editExpression != undefined
    );
}
