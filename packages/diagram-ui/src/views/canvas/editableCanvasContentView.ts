import { injectable } from "inversify";
import { VNode } from "snabbdom";
import { svg } from "sprotty";
import { SCanvasElement } from "../../model/canvas/sCanvasElement.js";
import { CreateConnectionData } from "../../features/create-connection/createConnectionData.js";
import { LineEngine } from "@hylimo/diagram-common";
import { SCanvasPoint } from "../../model/canvas/sCanvasPoint.js";
import { toSVG } from "transformation-matrix";
import { SCanvasConnection } from "../../model/canvas/sCanvasConnection.js";

/**
 * Base class for CanvasElementView and CanvasConnectionView
 */
@injectable()
export abstract class EditableCanvasContentView {
    /**
     * Renders the create connection preview
     *
     * @param model the SRoot model
     * @returns the rendered create connection preview
     */
    protected renderCreateConnection(model: Readonly<SCanvasElement | SCanvasConnection>): VNode | undefined {
        if (model.createConnectionProvider?.isVisible !== true || model.selected) {
            return undefined;
        }
        const preview = model.createConnectionProvider.provider();
        return svg(
            "g",
            null,
            this.renderCreateConnectionOutline(preview),
            this.renderCreateConnectionStartSymbol(preview)
        );
    }

    /**
     * Renders the start symbol for the create connection preview
     * Consists of a point on the outline and an arrow pointing in the direction of the connection
     *
     * @param preview the connection creation preview
     * @returns the rendered start symbol
     */
    private renderCreateConnectionStartSymbol(preview: CreateConnectionData): VNode {
        const position = LineEngine.DEFAULT.getPoint(preview.position, undefined, 0, preview.line);
        return svg(
            "g",
            {
                attrs: {
                    transform: `translate(${position.x}, ${position.y})`
                }
            },
            svg(
                "g",
                {
                    class: {
                        "create-connection": true,
                        selectable: true
                    }
                },
                svg("line", {
                    attrs: {
                        "stroke-width": SCanvasPoint.POINT_SIZE
                    },
                    class: {
                        [CreateConnectionData.CLASS]: true,
                        "create-connection-point": true
                    }
                }),
                ...this.renderCreateConnectionSymbolArrow(preview)
            )
        );
    }

    /**
     * Renders the arrow symbol for the create connection preview.
     * Consists of a visible arrow and a transparent hover line to make it easier to hit the arrow
     *
     * @param preview the connection creation preview
     * @returns the rendered arrow symbol and hover line
     */
    private renderCreateConnectionSymbolArrow(preview: CreateConnectionData): VNode[] {
        const normal = LineEngine.DEFAULT.getNormalVector(preview.position, undefined, preview.line);
        const rotation = Math.atan2(normal.y, normal.x) * (180 / Math.PI);
        return [
            svg("path", {
                attrs: {
                    d: "M 12 0 L 32 0 m -8 -8 l 8 8 l -8 8",
                    transform: `rotate(${rotation})`
                },
                class: {
                    [CreateConnectionData.CLASS]: true,
                    "create-connection-arrow": true
                }
            }),
            svg("path", {
                attrs: {
                    d: "M 0 0 L 32 0",
                    transform: `rotate(${rotation})`
                },
                class: {
                    [CreateConnectionData.CLASS]: true,
                    "create-connection-hover-line": true
                }
            })
        ];
    }

    /**
     * Renders the create connection outline
     *
     * @param preview the connection creation preview
     * @returns the rendered create connection outline
     */
    private renderCreateConnectionOutline(preview: CreateConnectionData): VNode {
        const path = LineEngine.DEFAULT.getSvgPath(preview.line.line);
        return svg("path", {
            attrs: {
                d: path,
                transform: toSVG(preview.line.transform)
            },
            class: {
                "create-connection-outline": true
            }
        });
    }
}
