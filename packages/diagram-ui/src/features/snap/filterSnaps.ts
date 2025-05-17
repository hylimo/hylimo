import { applyToPoint, decomposeTSR, type Matrix } from "transformation-matrix";
import { GapSnapDirection, SnapType, type Snap } from "./model.js";
import { SNAP_TOLERANCE } from "./snapping.js";

/**
 * Filters the X-axis snaps that are valid within the snap tolerance.
 *
 * @param snaps the snaps to filter
 * @param transform the transform to apply
 * @returns the valid snaps
 */
export function filterValidSnapsX(snaps: Snap[], transform: Matrix): Snap[] {
    const { scale } = decomposeTSR(transform);
    return snaps.filter((snap) => {
        let distance: number;
        if (snap.type === SnapType.POINT) {
            distance = applyToPoint(transform, snap.point).x - snap.referencePoint.x;
        } else if (snap.type === SnapType.GAP) {
            const gap = snap.gap;
            let x: number;
            let targetX: number;
            if (snap.direction === GapSnapDirection.CENTER_HORIZONTAL) {
                x = snap.bounds.position.x + snap.bounds.size.width / 2;
                targetX = gap.startSide[0].x + gap.length / 2;
            } else if (snap.direction === GapSnapDirection.SIDE_LEFT) {
                x = snap.bounds.position.x + snap.bounds.size.width;
                targetX = gap.startBounds.position.x - gap.length;
            } else {
                x = snap.bounds.position.x;
                targetX = gap.endBounds.position.x + gap.endBounds.size.width + gap.length;
            }
            distance = applyToPoint(transform, { x, y: 0 }).x - targetX;
        } else {
            distance = snap.bounds.size.width * scale.sx - snap.targetBounds.size.width;
        }
        return Math.abs(distance) < SNAP_TOLERANCE;
    });
}

/**
 * Filters the Y-axis snaps that are valid within the snap tolerance.
 *
 * @param snaps the snaps to filter
 * @param transform the transform to apply
 * @returns the valid snaps
 */
export function filterValidSnapsY(snaps: Snap[], transform: Matrix): Snap[] {
    const { scale } = decomposeTSR(transform);
    return snaps.filter((snap) => {
        let distance: number;
        if (snap.type === SnapType.POINT) {
            distance = applyToPoint(transform, snap.point).y - snap.referencePoint.y;
        } else if (snap.type === SnapType.GAP) {
            const gap = snap.gap;
            let y: number;
            let targetY: number;
            if (snap.direction === GapSnapDirection.CENTER_VERTICAL) {
                y = snap.bounds.position.y + snap.bounds.size.height / 2;
                targetY = gap.startSide[0].y + gap.length / 2;
            } else if (snap.direction === GapSnapDirection.SIDE_TOP) {
                y = snap.bounds.position.y + snap.bounds.size.height;
                targetY = gap.startBounds.position.y - gap.length;
            } else {
                y = snap.bounds.position.y;
                targetY = gap.endBounds.position.y + gap.endBounds.size.height + gap.length;
            }
            distance = applyToPoint(transform, { x: 0, y }).y - targetY;
        } else {
            distance = snap.bounds.size.height * scale.sy - snap.targetBounds.size.height;
        }
        return Math.abs(distance) < SNAP_TOLERANCE;
    });
}
