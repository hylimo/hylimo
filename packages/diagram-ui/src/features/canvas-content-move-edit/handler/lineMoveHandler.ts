import type { Point, TransformedLine } from "@hylimo/diagram-common";
import { DefaultEditTypes, LineEngine, Math2D } from "@hylimo/diagram-common";
import { SharedSettings, type MoveLposEdit } from "@hylimo/diagram-protocol";
import { translate, type Matrix } from "transformation-matrix";
import { MoveHandler, type HandleMoveResult } from "../../move/moveHandler.js";
import { projectPointOnLine } from "../../../base/projectPointOnLine.js";
import { SnapHandler } from "../../snap/snapHandler.js";
import type { SnapElementData, SnapLines } from "../../snap/model.js";
import type { SElement } from "../../../model/sElement.js";
import type { SRoot } from "../../../model/sRoot.js";
import { getSnapElementData, getSnapReferenceData } from "../../snap/snapData.js";
import { filterValidSnaps, getSnapLines, getSnaps, SNAP_TOLERANCE } from "../../snap/snapping.js";

/**
 * Move handler for line point moves
 * Expects relative coordinates to the point in the parent canvas coordinate system.
 */
export class LineMoveHandler extends MoveHandler {
    /**
     * Creats a new LineMoveHandler
     *
     * @param point the id of the point to move
     * @param editPos if true, the position of the point can be modified
     * @param editDist if true, the distance to the line can be modified
     * @param hasSegment if true, the segment index is defined
     * @param line the line on which the point is
     * @param posPrecision the precision to use for rounding the position
     * @param distance the current distance of the point to edit
     * @param transformationMatrix the transformation matrix to apply to obtain the relative position
     */
    constructor(
        private readonly point: string,
        private readonly editPos: boolean,
        private readonly editDist: boolean,
        private readonly hasSegment: boolean,
        private readonly line: TransformedLine,
        private readonly settings: SharedSettings,
        private readonly distance: number | undefined,
        private readonly snapHandler: LineSnapHandler | undefined,
        transformMatrix: Matrix
    ) {
        super(transformMatrix, "cursor-move");
    }

    override handleMove(x: number, y: number): HandleMoveResult {
        if (this.editPos) {
            if (this.snapHandler != undefined) {
                const snapProjection = projectPointOnLine(
                    { x, y },
                    this.line,
                    {
                        settings: {},
                        hasSegment: this.hasSegment
                    },
                    this.editDist ? undefined : (this.distance ?? 0)
                );
                const normal = LineEngine.DEFAULT.getNormalVector(
                    snapProjection.pos,
                    snapProjection.segment,
                    this.line
                );
                const targetPoint = LineEngine.DEFAULT.getPoint(
                    snapProjection.pos,
                    snapProjection.segment,
                    snapProjection.distance,
                    this.line
                );
                const distToLine =
                    Math.abs((x - targetPoint.x) * normal.x + (y - targetPoint.y) * normal.y) /
                    Math.hypot(normal.x, normal.y);
                if (distToLine <= SNAP_TOLERANCE) {
                    
                }
            }
        } else {
        }
        const nearest = projectPointOnLine(
            { x, y },
            this.line,
            {
                settings: this.settings,
                hasSegment: this.hasSegment
            },
            this.editDist ? undefined : (this.distance ?? 0)
        );
        let pos: number | [number, number];
        if (this.hasSegment) {
            pos = [nearest.segment, nearest.relativePos];
        } else {
            pos = nearest.pos;
        }
        const types: MoveLposEdit["types"] = [];
        if (this.editPos) {
            types.push(DefaultEditTypes.MOVE_LPOS_POS);
        }
        if (this.editDist) {
            types.push(DefaultEditTypes.MOVE_LPOS_DIST);
        }
        const edits = [
            {
                types,
                values: { pos, dist: this.editDist ? nearest.distance : 0 },
                elements: [this.point]
            } satisfies MoveLposEdit
        ];
        return { edits };
    }
}

export class LineSnapHandler extends SnapHandler {
    private readonly snapElementData: SnapElementData;

    constructor(
        elements: SElement[],
        ignoredElements: SElement[],
        root: SRoot,
        private readonly originalPoint: Point,
        private readonly line: TransformedLine,
        settings: SharedSettings | undefined
    ) {
        const ignoredElementsSet = new Set<string>();
        for (const element of ignoredElements) {
            ignoredElementsSet.add(element.id);
        }
        const snapElementData = getSnapElementData(root, elements, ignoredElementsSet);
        super(getSnapReferenceData(root, new Set(snapElementData.keys()), ignoredElementsSet), settings);
        this.snapElementData = snapElementData;
    }

    snap(
        pos: number,
        segment: number | undefined,
        distance: number,
        zoom: number,
        editPos: boolean,
        editDist: boolean
    ):
        | {
              snappedPos: number | [number, number];
              snappedDistance: number;
              snapLines: SnapLines | undefined;
          }
        | undefined {
        const targetPoint = LineEngine.DEFAULT.getPoint(pos, segment, distance, this.line);
        const translation = Math2D.sub(targetPoint, this.originalPoint);
        const hasSegment = segment != undefined;
        const snapResult = getSnaps(this.snapElementData, this.referenceData, zoom, translation, {
            snapX: true,
            snapY: true,
            snapGaps: false,
            snapPoints: true,
            snapSize: false
        });
        const snappedPoint = Math2D.add(this.originalPoint, snapResult.snapOffset);
        if (editPos) {
            const nearest = projectPointOnLine(
                snappedPoint,
                this.line,
                {
                    settings: this.settings,
                    hasSegment
                },
                editDist ? undefined : distance
            );
            const actualSnappedPoint = LineEngine.DEFAULT.getPoint(
                nearest.pos,
                nearest.segment,
                nearest.distance,
                this.line
            );
            const newTranslation = Math2D.sub(actualSnappedPoint, this.originalPoint);
            const transform = translate(newTranslation.x, newTranslation.y);
            filterValidSnaps(snapResult, transform);
            if (snapResult.nearestSnapsX.length == 0 && snapResult.nearestSnapsY.length == 0) {
                return undefined;
            }
            const snapLines = getSnapLines(snapResult, transform);
            return {
                snappedPos: hasSegment ? [nearest.segment, nearest.relativePos] : nearest.pos,
                snappedDistance: editDist ? nearest.distance : distance,
                snapLines
            };
        } else if (editDist) {
            const normal = LineEngine.DEFAULT.getNormalVector(pos, segment, this.line);
            let snappedDistance: number | undefined;
            if (snapResult.nearestSnapsX.length > 0 && normal.x != 0) {
                const t = (snappedPoint.x - this.originalPoint.x) / normal.x;
                snappedDistance = t;
            }
            if (snapResult.nearestSnapsY.length > 0 && normal.y != 0) {
                const t = (snappedPoint.y - this.originalPoint.y) / normal.y;
                if (snappedDistance == undefined || Math.abs(t - distance) < Math.abs(snappedDistance - distance)) {
                    snappedDistance = t;
                }
            }
            if (snappedDistance == undefined) {
                return undefined;
            }
            snappedDistance = SharedSettings.roundToLinePointDistancePrecision(this.settings, snappedDistance);
            const newSnappedPoint = LineEngine.DEFAULT.getPoint(pos, segment, snappedDistance, this.line);
            if (Math2D.distance(targetPoint, newSnappedPoint) > SNAP_TOLERANCE) {
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
                snappedPos: hasSegment ? [segment, pos] : pos,
                snappedDistance,
                snapLines
            };
        } else {
            return undefined;
        }
    }
}
