import { IView, IViewArgs, RenderingContext, svg, TYPES, ViewerOptions } from "sprotty";
import { injectable, inject } from "inversify";
import { Attrs, VNode } from "snabbdom";
import { SRoot } from "../model/sRoot.js";
import { ConnectionCreationPreview } from "../features/connection-creation/connectionCreationPreview.js";
import { SCanvasPoint } from "../model/canvas/sCanvasPoint.js";
import { LineEngine } from "@hylimo/diagram-common";
import { toSVG } from "transformation-matrix";

/**
 * IView that is the parent which handles
 */
@injectable()
export class SRootView implements IView {
    /**
     * Viewer options, used to get id of viewer element
     */
    @inject(TYPES.ViewerOptions) protected options!: ViewerOptions;

    render(model: Readonly<SRoot>, context: RenderingContext, _args?: IViewArgs | undefined): VNode {
        if (context.targetKind == "hidden") {
            return svg("svg", { class: { hylimo: true } });
        }
        const transform = `scale(${model.zoom}) translate(${-model.scroll.x},${-model.scroll.y})`;
        return svg(
            "svg",
            {
                class: {
                    hylimo: true
                },
                attrs: this.generateAttributes(model, context)
            },
            svg("style", null, model.generateStyle(this.options.baseDiv)),
            this.renderDefs(),
            svg(
                "g",
                {
                    attrs: {
                        transform
                    },
                    class: {
                        "sprotty-root": true
                    }
                },
                ...context.renderChildren(model, undefined),
                this.renderCreateConnection(model)
            )
        );
    }

    /**
     * Generates the attributes for the SVG element
     * If the targetKind is not "main", the viewBox attribute is set to the canvas bounds
     *
     * @param model the SRoot model
     * @param context the rendering context
     * @returns the attributes for the SVG element
     */
    private generateAttributes(model: Readonly<SRoot>, context: RenderingContext): Attrs {
        const attrs: Attrs = {};
        if (context.targetKind != "main") {
            const bounds = model.rootBounds;
            attrs["viewBox"] = `${bounds.position.x} ${bounds.position.y} ${bounds.size.width} ${bounds.size.height}`;
        }
        return attrs;
    }

    /**
     * Renders the defs section of the SVG
     *
     * @returns the VNode for the defs section
     */
    private renderDefs(): VNode {
        return svg(
            "defs",
            null,
            svg(
                "marker",
                {
                    attrs: {
                        id: "arrow",
                        viewBox: "0 0 10 10",
                        refX: 9,
                        refY: 5,
                        markerWidth: 6,
                        markerHeight: 6,
                        markerUnits: "strokeWidth",
                        orient: "auto-start-reverse"
                    }
                },
                svg("path", {
                    attrs: {
                        d: "M 0 0 L 10 5 L 0 10 z",
                        fill: "var(--diagram-layout-color)"
                    }
                })
            )
        );
    }

    /**
     * Renders the create connection preview
     *
     * @param model the SRoot model
     * @returns the rendered create connection preview
     */
    private renderCreateConnection(model: Readonly<SRoot>): VNode | undefined {
        if (model.connectionCreationPreviewProvider?.isVisible !== true || model.selectedElements.length > 0) {
            return undefined;
        }
        const preview = model.connectionCreationPreviewProvider.provider();
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
    private renderCreateConnectionStartSymbol(preview: ConnectionCreationPreview): VNode {
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
                        [ConnectionCreationPreview.CLASS]: true,
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
    private renderCreateConnectionSymbolArrow(preview: ConnectionCreationPreview): VNode[] {
        const normal = LineEngine.DEFAULT.getNormalVector(preview.position, undefined, preview.line);
        const rotation = Math.atan2(normal.y, normal.x) * (180 / Math.PI);
        return [
            svg("path", {
                attrs: {
                    d: "M 12 0 L 42 0 m -10 -10 l 10 10 l -10 10",
                    transform: `rotate(${rotation})`
                },
                class: {
                    [ConnectionCreationPreview.CLASS]: true,
                    "create-connection-arrow": true
                }
            }),
            svg("path", {
                attrs: {
                    d: "M 0 0 L 42 0",
                    transform: `rotate(${rotation})`
                },
                class: {
                    [ConnectionCreationPreview.CLASS]: true,
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
    private renderCreateConnectionOutline(preview: ConnectionCreationPreview): VNode {
        const path = LineEngine.DEFAULT.getSvgPath(preview.line.line);
        return svg("path", {
            attrs: {
                d: path,
                transform: toSVG(preview.line.transform)
            },
            class: {
                [ConnectionCreationPreview.CLASS]: true,
                "create-connection-outline": true
            }
        });
    }
}
