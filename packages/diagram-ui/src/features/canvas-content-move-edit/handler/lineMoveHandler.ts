import type { Point, ProjectionResult, TransformedLine } from "@hylimo/diagram-common";
import { DefaultEditTypes, LineEngine, Math2D } from "@hylimo/diagram-common";
import { SharedSettings, type MoveLposEdit } from "@hylimo/diagram-protocol";
import { translate, type Matrix } from "transformation-matrix";
import { type HandleMoveResult } from "../../move/moveHandler.js";
import { findOptimalDistanceFromLine, projectPointOnLine } from "../../../base/projectPointOnLine.js";
import { SnapHandler } from "../../snap/snapHandler.js";
import type { SnapElementData, SnapLines, SnapResult } from "../../snap/model.js";
import type { SElement } from "../../../model/sElement.js";
import type { SRoot } from "../../../model/sRoot.js";
import { getSnapElementData, getSnapReferenceData } from "../../snap/snapData.js";
import { filterValidSnaps, getSnapDistance, getSnapLines, getSnaps, SNAP_TOLERANCE } from "../../snap/snapping.js";
import type { SModelElementImpl } from "sprotty";
import { findViewportZoom } from "../../../base/findViewportZoom.js";
import { SnapMoveHandler } from "../../snap/snapMoveHandler.js";

/**
 * Result of a position or distance edit operation
 * Contains the calculated position, distance, and any snap guide lines to display
 */
interface LineEditResult {
    /**
     * The position on the line
     * Can be either a single number (absolute position) or a tuple of [segment, relative position]
     */
    pos: number | [number, number];

    /**
     * The distance from the line
     */
    dist: number;

    /**
     * Visual guide lines to display for the snap, if any
     */
    snapLines: SnapLines | undefined;
}

/**
 * Move handler for line point moves
 * Expects relative coordinates to the point in the parent canvas coordinate system.
 * Handles both position editing (moving along the line) and distance editing (moving perpendicular to the line).
 * Supports snapping to improve precision during editing operations.
 */
export class LineMoveHandler extends SnapMoveHandler<LineSnapHandler> {
    /**
     * True if the pos is defined relative to a segment
     */
    private readonly hasSegment: boolean;

    /**
     * Creates a new LineMoveHandler
     *
     * @param point the id of the point to move
     * @param editPos if true, the position of the point can be modified
     * @param editDist if true, the distance to the line can be modified
     * @param line the line on which the point is
     * @param settings the shared settings containing precision values
     * @param initialPos the initial position of the point on the line
     * @param initialDistance the current distance of the point to edit
     * @param elements elements to consider for snapping
     * @param ignoredElements elements to ignore when snapping
     * @param root the root element of the diagram
     * @param originalPoint the original point position before moving
     * @param snappingEnabled whether snapping is enabled
     * @param transformMatrix the transformation matrix to apply to obtain the relative position
     */
    constructor(
        private readonly point: string,
        private readonly editPos: boolean,
        private readonly editDist: boolean,
        private readonly line: TransformedLine,
        private readonly settings: SharedSettings,
        private readonly initialPos: number | [number, number],
        private readonly initialDistance: number | undefined,
        elements: SElement[],
        ignoredElements: Set<string>,
        root: SRoot,
        originalPoint: Point,
        snappingEnabled: boolean,
        transformMatrix: Matrix
    ) {
        const snapHandler = new LineSnapHandler(elements, ignoredElements, root, originalPoint, line, settings);
        super(snapHandler, snappingEnabled, transformMatrix, "cursor-move");
        this.hasSegment = Array.isArray(initialPos);
    }

    override handleMove(x: number, y: number, event: MouseEvent, target: SModelElementImpl): HandleMoveResult {
        let pos: number | [number, number] | undefined;
        let dist: number | undefined;
        let snapLines: SnapLines | undefined;
        const root = target.root as SRoot;

        if (this.isSnappingEnabled(event)) {
            this.snapHandler.updateReferenceData(root);
        }

        if (this.editPos) {
            const result = this.handlePositionEdit(x, y, root, event);
            pos = result.pos;
            dist = result.dist;
            snapLines = result.snapLines;
        } else {
            const result = this.handleDistanceEdit(x, y, root, event);
            pos = result.pos;
            dist = result.dist;
            snapLines = result.snapLines;
        }

        return this.createEditResult(pos, dist, snapLines);
    }

    /**
     * Handles editing the position of a point
     * Processes position editing logic, including attempting to snap the position if a snap handler is available
     * Falls back to direct projection if snapping isn't available or doesn't produce valid results
     *
     * @param x the x coordinate
     * @param y the y coordinate
     * @param root the root element
     * @param event the causing mouse event
     * @returns the position, distance, and snap lines
     */
    private handlePositionEdit(x: number, y: number, root: SRoot, event: MouseEvent): LineEditResult {
        let pos: number | [number, number] | undefined = undefined;
        let dist: number | undefined = undefined;
        let snapLines: SnapLines | undefined = undefined;

        if (this.isSnappingEnabled(event)) {
            const snapResult = this.trySnapPosition(x, y, root);
            if (snapResult != undefined) {
                pos = snapResult.pos;
                dist = snapResult.dist;
                snapLines = snapResult.snapLines;
            }
        }

        if (pos == undefined || dist == undefined) {
            const nearest = this.calculateNearestPoint(x, y);
            if (this.hasSegment) {
                pos = [nearest.segment, nearest.relativePos];
            } else {
                pos = nearest.pos;
            }
            dist = nearest.distance;
        }

        return { pos, dist, snapLines };
    }

    /**
     * Attempts to snap a position to the grid or other snap targets
     * Performs projection and proximity checking to determine if snapping should be applied
     *
     * @param x the x coordinate of the mouse position
     * @param y the y coordinate of the mouse position
     * @param root the root element containing the viewport information
     * @returns the snapped position data if snapping was successful, undefined otherwise
     */
    private trySnapPosition(x: number, y: number, root: SRoot): LineEditResult | undefined {
        const snapProjection = projectPointOnLine(
            { x, y },
            this.line,
            {
                settings: {},
                hasSegment: this.hasSegment
            },
            this.editDist ? undefined : (this.initialDistance ?? 0)
        );

        const normal = LineEngine.DEFAULT.getNormalVector(snapProjection.pos, snapProjection.segment, this.line);

        const targetPoint = LineEngine.DEFAULT.getPoint(
            snapProjection.pos,
            undefined,
            snapProjection.distance,
            this.line
        );

        const distToLine =
            Math.abs((x - targetPoint.x) * normal.y - (y - targetPoint.y) * normal.x) / Math.hypot(normal.x, normal.y);
        if (distToLine <= SNAP_TOLERANCE) {
            const zoom = findViewportZoom(root);
            const [segment, position] = this.hasSegment
                ? [snapProjection.segment, snapProjection.relativePos]
                : [undefined, snapProjection.pos];

            const snapResult = this.snapHandler!.snap(
                position,
                segment,
                snapProjection.distance,
                zoom,
                this.editPos,
                this.editDist
            );

            if (snapResult != undefined) {
                return {
                    pos: snapResult.pos,
                    dist: snapResult.dist,
                    snapLines: snapResult.snapLines
                };
            }
        }

        return undefined;
    }

    /**
     * Calculates the nearest point on the line to the given coordinates
     *
     * @param x the x coordinate
     * @param y the y coordinate
     * @returns the projected point data including position, segment, and distance
     */
    private calculateNearestPoint(x: number, y: number) {
        return projectPointOnLine(
            { x, y },
            this.line,
            {
                settings: this.settings,
                hasSegment: this.hasSegment
            },
            this.editDist ? undefined : (this.initialDistance ?? 0)
        );
    }

    /**
     * Handles editing the distance of a point from a line
     * When position editing is disabled, this allows moving a point perpendicular to the line
     * Can also apply snapping to the distance value if a snap handler is available
     *
     * @param x the x coordinate of the mouse position
     * @param y the y coordinate of the mouse position
     * @param root the root element containing the viewport information
     * @param event the causing mouse event
     * @returns the position, calculated distance, and any snap guide lines
     */
    private handleDistanceEdit(x: number, y: number, root: SRoot, event: MouseEvent): LineEditResult {
        const pos = this.initialPos;
        const [segment, position] = Array.isArray(pos) ? pos : [undefined, pos ?? 0];
        let dist = findOptimalDistanceFromLine(position, segment, this.line, { x, y });
        let snapLines: SnapLines | undefined = undefined;

        if (this.isSnappingEnabled(event)) {
            const snapResult = this.snapHandler.snap(
                position,
                segment,
                dist,
                findViewportZoom(root),
                this.editPos,
                this.editDist
            );

            if (snapResult != undefined) {
                dist = snapResult.dist;
                snapLines = snapResult.snapLines;
            }
        }

        return { pos, dist, snapLines };
    }

    /**
     * Creates the edit result from the position, distance, and snap lines
     * Builds the appropriate edit objects based on the current edit mode and provided values
     *
     * @param pos the calculated position (may be undefined if no valid position was found)
     * @param dist the calculated distance (may be undefined if no valid distance was found)
     * @param snapLines visual snap guides to display
     * @returns the handle move result containing the edits to apply
     */
    private createEditResult(
        pos: number | [number, number] | undefined,
        dist: number | undefined,
        snapLines: SnapLines | undefined
    ): HandleMoveResult {
        const types: MoveLposEdit["types"] = [];
        if (this.editPos) {
            types.push(DefaultEditTypes.MOVE_LPOS_POS);
        }
        if (this.editDist) {
            types.push(DefaultEditTypes.MOVE_LPOS_DIST);
        }
        const finalPos = this.editPos ? (pos ?? this.initialPos) : this.initialPos;
        const edits = [
            {
                types,
                values: {
                    pos: finalPos,
                    dist: (this.editDist ? dist : this.initialDistance) ?? 0
                },
                elements: [this.point]
            } satisfies MoveLposEdit
        ];
        return { edits, snapLines };
    }
}

/**
 * Snap handler specialized for line points
 * Provides snapping functionality when moving points on a line, handling both position and distance snapping
 * Works with the overall snapping system to provide consistent behavior across the diagram
 */
class LineSnapHandler extends SnapHandler {
    /**
     * Intitial snap element data for a drag vector (0, 0)
     */
    private readonly snapElementData: SnapElementData;

    /**
     * Creates a new LineSnapHandler
     *
     * @param elements elements to consider for snapping
     * @param ignoredElements elements to ignore when snapping
     * @param root the root element of the diagram
     * @param originalPoint the original point position before moving
     * @param line the line on which the point is located
     * @param settings settings containing precision and other configuration values
     */
    constructor(
        elements: SElement[],
        ignoredElements: Set<string>,
        root: SRoot,
        private readonly originalPoint: Point,
        private readonly line: TransformedLine,
        settings: SharedSettings | undefined
    ) {
        const snapElementData = getSnapElementData(root, elements, ignoredElements);
        super(getSnapReferenceData(root, new Set(snapElementData.keys()), ignoredElements), settings);
        this.snapElementData = snapElementData;
    }

    /**
     * Attempts to snap a point on a line based on the provided parameters
     * This is the main snapping logic for line points, handling both position and distance snapping
     *
     * @param pos the position on the line
     * @param segment the segment index if using segment-based positioning, undefined otherwise
     * @param distance the current distance from the line
     * @param zoom the current zoom level of the viewport
     * @param editPos whether position editing is enabled
     * @param editDist whether distance editing is enabled
     * @returns the snap result if snapping was successful, undefined otherwise
     */
    snap(
        pos: number,
        segment: number | undefined,
        distance: number,
        zoom: number,
        editPos: boolean,
        editDist: boolean
    ): LineEditResult | undefined {
        const targetPoint = LineEngine.DEFAULT.getPoint(pos, segment, distance, this.line);
        const translation = Math2D.sub(targetPoint, this.originalPoint);
        const hasSegment = segment != undefined;
        const snapResult = this.calculateSnapResult(zoom, translation);
        const snappedPoint = Math2D.add(this.originalPoint, snapResult.snapOffset);
        if (editPos) {
            return this.handlePositionSnap(distance, hasSegment, editDist, snapResult, snappedPoint);
        } else if (editDist) {
            return this.handleDistanceSnap(pos, segment, distance, targetPoint, snapResult, snappedPoint, zoom);
        } else {
            return undefined;
        }
    }

    /**
     * Calculates the snap result for the given translation
     * Configures and calls the snapping system with appropriate parameters for line point snapping
     *
     * @param zoom the current zoom level of the viewport
     * @param translation the translation vector from the original point
     * @returns the snap result containing snap targets and offset information
     */
    private calculateSnapResult(zoom: number, translation: Point) {
        return getSnaps(this.snapElementData, this.referenceData, zoom, translation, {
            snapX: true,
            snapY: true,
            snapGaps: false,
            snapPoints: true,
            snapSize: false
        });
    }

    /**
     * Handles snapping when editing a point's position
     * Processes the snapped point, creates appropriate transformations, and verifies the snap is valid
     *
     * @param distance the current distance from the line
     * @param hasSegment whether segment-based positioning is being used
     * @param editDist whether distance editing is enabled
     * @param snapResult the snap result from the snapping system
     * @param snappedPoint the snapped point coordinates
     * @returns the snap result with position and distance information if valid, undefined otherwise
     */
    private handlePositionSnap(
        distance: number,
        hasSegment: boolean,
        editDist: boolean,
        snapResult: SnapResult,
        snappedPoint: Point
    ): LineEditResult | undefined {
        const nearest = projectPointOnLine(
            snappedPoint,
            this.line,
            {
                settings: this.settings,
                hasSegment
            },
            editDist ? undefined : distance
        );

        const snappedTransform = this.calculateSnappedTransform(nearest);

        filterValidSnaps(snapResult, snappedTransform);
        if (snapResult.nearestSnapsX.length == 0 && snapResult.nearestSnapsY.length == 0) {
            return undefined;
        }

        const snapLines = getSnapLines(snapResult, snappedTransform);
        return {
            pos: hasSegment ? [nearest.segment, nearest.relativePos] : nearest.pos,
            dist: editDist ? nearest.distance : distance,
            snapLines
        };
    }

    /**
     * Calculates the transformation for a snapped point
     * Creates a transformation matrix based on the difference between the snapped point and the original point
     *
     * @param nearest the point projection data containing position and distance information
     * @returns a transformation matrix that would move the original point to the snapped position
     */
    private calculateSnappedTransform(nearest: ProjectionResult) {
        const actualSnappedPoint = LineEngine.DEFAULT.getPoint(nearest.pos, undefined, nearest.distance, this.line);
        const newTranslation = Math2D.sub(actualSnappedPoint, this.originalPoint);
        return translate(newTranslation.x, newTranslation.y);
    }

    /**
     * Handles snapping when editing a point's distance from the line
     * Processes distance snapping logic, computes appropriate transformations, and validates the result
     *
     * @param pos the position on the line
     * @param segment the segment index if using segment-based positioning, undefined otherwise
     * @param distance the current distance from the line
     * @param targetPoint the original target point
     * @param snapResult the snap result from the snapping system
     * @param snappedPoint the snapped point coordinates
     * @param zoom the current zoom level of the viewport
     * @returns the snap result with position and distance information if valid, undefined otherwise
     */
    private handleDistanceSnap(
        pos: number,
        segment: number | undefined,
        distance: number,
        targetPoint: Point,
        snapResult: SnapResult,
        snappedPoint: Point,
        zoom: number
    ): LineEditResult | undefined {
        const normal = LineEngine.DEFAULT.getNormalVector(pos, segment, this.line);
        const pointOnLine = LineEngine.DEFAULT.getPoint(pos, segment, 0, this.line);
        const snappedDistance = this.calculateSnappedDistance(pointOnLine, normal, distance, snapResult, snappedPoint);

        if (snappedDistance == undefined) {
            return undefined;
        }

        const roundedDistance = SharedSettings.roundToLinePointDistancePrecision(this.settings, snappedDistance);
        const newSnappedPoint = LineEngine.DEFAULT.getPoint(pos, segment, roundedDistance, this.line);

        if (Math2D.distance(targetPoint, newSnappedPoint) > getSnapDistance(zoom)) {
            return undefined;
        }

        const newTranslation = Math2D.sub(newSnappedPoint, this.originalPoint);
        const transform = translate(newTranslation.x, newTranslation.y);

        filterValidSnaps(snapResult, transform);
        if (snapResult.nearestSnapsX.length == 0 && snapResult.nearestSnapsY.length == 0) {
            return undefined;
        }

        const snapLines = getSnapLines(snapResult, transform);
        return {
            pos: segment != undefined ? [segment, pos] : pos,
            dist: roundedDistance,
            snapLines
        };
    }

    /**
     * Calculates the snapped distance based on the normal vector and snap result
     * Projects the snap offset onto the normal vector to determine the appropriate distance value
     * Handles cases for both x and y axis snapping, choosing the best result
     *
     * @param pointOnLine the point on the line at the given position
     * @param normal the normal vector to the line at the given position
     * @param distance the current distance from the line
     * @param snapResult the snap result from the snapping system
     * @param snappedPoint the snapped point coordinates
     * @returns the calculated distance value if a valid snap was found, undefined otherwise
     */
    private calculateSnappedDistance(
        pointOnLine: Point,
        normal: Point,
        distance: number,
        snapResult: SnapResult,
        snappedPoint: Point
    ): number | undefined {
        let snappedDistance: number | undefined;

        if (snapResult.nearestSnapsX.length > 0 && normal.x != 0) {
            const t = (snappedPoint.x - pointOnLine.x) / normal.x / Math2D.length(normal);
            snappedDistance = t;
        }

        if (snapResult.nearestSnapsY.length > 0 && normal.y != 0) {
            const t = (snappedPoint.y - pointOnLine.y) / normal.y / Math2D.length(normal);
            if (snappedDistance == undefined || Math.abs(t - distance) < Math.abs(snappedDistance - distance)) {
                snappedDistance = t;
            }
        }

        return snappedDistance;
    }
}
