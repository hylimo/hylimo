import type { MarkerLayoutInformation, Point } from "@hylimo/diagram-common";
import { LineEngine } from "@hylimo/diagram-common";
import { inject, injectable } from "inversify";
import type { VNode } from "snabbdom";
import type { IView, IViewArgs, RenderingContext } from "sprotty";
import { svg } from "sprotty";
import type { SCanvasConnection } from "../../model/canvas/sCanvasConnection.js";
import { SCanvasConnectionSegment } from "../../model/canvas/sCanvasConnectionSegment.js";
import type { SMarker } from "../../model/canvas/sMarker.js";
import { extractStrokeAttriabutes } from "@hylimo/diagram-render-svg";
import { EditableCanvasContentView } from "./editableCanvasContentView.js";
import { renderPoint } from "./canvasPointView.js";
import { findViewportZoom } from "../../base/findViewportZoom.js";
import { TYPES } from "../../features/types.js";
import type { KeyState } from "../../features/key-state/keyState.js";

/**
 * IView that represents a CanvasConnection
 */
@injectable()
export class CanvasConnectionView extends EditableCanvasContentView implements IView {
    /**
     * The key state used to determine if the shift key is pressed
     */
    @inject(TYPES.KeyState) protected readonly keyState!: KeyState;

    render(
        model: Readonly<SCanvasConnection>,
        context: RenderingContext,
        _args?: IViewArgs | undefined
    ): VNode | undefined {
        const segments = model.children.filter(
            (child) => child instanceof SCanvasConnectionSegment
        ) as SCanvasConnectionSegment[];
        const childMarkers = this.renderMarkers(model, context);
        const { path, childControlElements } = this.renderPathAndControlElements(model, segments);
        const childPaths: VNode[] = [];
        if (model.stroke != undefined) {
            childPaths.push(...this.renderConnectionPath(model, path));
        }
        const createConnectionPreview = this.renderCreateConnection(model);
        const splitSegmentPreview = this.renderSplitSegmentPreview(model);
        return svg(
            "g.selectable.canvas-connection",
            null,
            ...childPaths,
            ...childMarkers,
            ...childControlElements,
            createConnectionPreview,
            splitSegmentPreview
        );
    }

    /**
     * Renders the path of the connection
     * Renders a visisble path and an invisible path for selection
     *
     * @param model the model of the connection
     * @param path the path string
     * @returns the rendered path elements
     */
    private renderConnectionPath(model: Readonly<SCanvasConnection>, path: string): VNode[] {
        return [
            svg("path", {
                attrs: {
                    d: path,
                    ...extractStrokeAttriabutes(model),
                    fill: "none"
                }
            }),
            svg("path.select-canvas-connection", {
                attrs: {
                    d: path
                }
            })
        ];
    }

    /**
     * Renders the path segment and child control elements if necessary
     *
     * @param model the model of the connection
     * @param endPos the end position ignoring the markers
     * @returns the path string and the child control elements
     */
    private renderPathAndControlElements(model: Readonly<SCanvasConnection>, segments: SCanvasConnectionSegment[]) {
        const layout = model.layout;
        const childControlElements: VNode[] = [];
        const showControlElements = model.showControlElements;
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            if (showControlElements) {
                childControlElements.push(...segment.generateControlViewElements(model, layout.segments[i]));
            }
        }
        return { path: layout.path, childControlElements };
    }

    /**
     * Renders the marker at the start and end of the connection
     *
     * @param model the model of the connection
     * @param segments the segments of the connection
     * @param context rendering context
     * @returns the new start and end pos of the connection (without the markers), and the childMarkers
     */
    private renderMarkers(model: Readonly<SCanvasConnection>, context: RenderingContext): VNode[] {
        const startMarker = model.startMarker;
        const endMarker = model.endMarker;
        const childMarkers: VNode[] = [];
        if (endMarker != undefined) {
            const renderInformation = model.layout.endMarker!;
            childMarkers.push(this.renderMarker(endMarker, renderInformation, context));
        }
        if (startMarker != undefined) {
            const renderInformation = model.layout.startMarker!;
            childMarkers.push(this.renderMarker(startMarker, renderInformation, context));
        }
        return childMarkers;
    }

    /**
     * Renders a marker
     *
     * @param marker the marker to render
     * @param markerLayout required information for rendering
     * @param position the position of the marker
     * @param context rendering context
     * @returns the rendered marker
     */
    private renderMarker(marker: SMarker, markerLayout: MarkerLayoutInformation, context: RenderingContext): VNode {
        const rotation = markerLayout.rotation;
        const { x, y } = markerLayout.position;
        return svg(
            "g",
            {
                attrs: {
                    transform: `translate(${x},${y}) rotate(${rotation})`
                }
            },
            context.renderElement(marker)
        );
    }

    /**
     * Renders a preview point for splitting a segment of the connection
     *
     * @param model the model of the connection
     * @returns the rendered preview point if available
     */
    private renderSplitSegmentPreview(model: Readonly<SCanvasConnection>): VNode | undefined {
        const provider = model.splitPreviewDataProvider;
        if (provider == undefined || !model.selected || !this.keyState.isShiftPressed) {
            return undefined;
        }
        const projectionResult = provider();
        const line = model.line;
        const segment = model.index.getById(
            line.line.segments[projectionResult.segment].origin
        ) as SCanvasConnectionSegment;
        if (!segment.canSplitSegment()) {
            return undefined;
        }
        return this.renderPreviewPoint(LineEngine.DEFAULT.getPoint(projectionResult.pos, undefined, 0, line), model);
    }

    /**
     * Renders a preview point
     *
     * @param point the position of the preview point
     * @param model the model of the connection
     * @returns the rendered preview point
     */
    private renderPreviewPoint({ x, y }: Point, model: Readonly<SCanvasConnection>): VNode | undefined {
        return svg("g.split-canvas-connetion-preview", null, ...renderPoint({ x, y }, findViewportZoom(model), true));
    }
}
