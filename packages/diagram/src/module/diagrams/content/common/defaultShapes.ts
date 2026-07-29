import { ContentModule } from "../contentModule.js";

/**
 * Module providing the `defaultShapes` object: a set of ready-made shape definitions for the
 * generic `shape` element, curated for software-engineering diagrams. Each entry is an object with
 * a `path` (and, for compound shapes, a stroke-only `decoration`) whose coordinates are affine in
 * the box (`w`, `h`) and the `cornerRounding` style (`r`). Pass one as the `shape` attribute, e.g.
 * `shape(shape = scope.defaultShapes.rect, cornerRounding = 8) { ... }`.
 *
 * The outlines start at the center-right and split their sides where needed so the derived
 * connection outline docks correctly; a corner authored with an `r`-radius arc collapses to a sharp
 * corner when `cornerRounding` is 0. Docking is parametrised by segment count, and the outline keeps
 * one segment per authored path segment, so every `Position` has to fall on a segment boundary: the
 * eight of them divide the outline into eighths, which is why the note — whose fold needs a segment
 * of its own in the last eighth — carries three collinear splits per side rather than one, and why
 * the database, whose rims are one arc each, splits its two sides in half around the center.
 *
 * What a `Position` has to fall on is a segment boundary, not the middle of a side, so a side may be
 * split anywhere that keeps the count per eighth right. Where a side is shortened or offset — the
 * chevron's bottom edge, which its notch cuts short at one end, and the 3D box's edges, which its
 * depth pushes apart — the four cardinals are therefore put where the center lines leave the outline
 * rather than at the midpoints of those sides. The two differ by half the shortening, and only the
 * center lines make a connection between two aligned shapes come out straight.
 *
 * The note's fold and the 3D box's depth are the two features with a fixed size (20 each, as a UML
 * note's dog-ear and a UML node's perspective offset are constants, not a share of the shape): their
 * constants make those outlines meaningful only from about twice that in each direction, which the
 * `comment` and `node` elements guarantee with a minimum height.
 */
export const defaultShapesModule = ContentModule.create(
    "common/defaultShapes",
    [],
    [],
    `
        scope.defaultShapes = [
            rect = [
                path = "M w,h/2 L w,h-r A r,r 0 0,1 w-r,h L w/2,h L r,h A r,r 0 0,1 0,h-r L 0,h/2 L 0,r A r,r 0 0,1 r,0 L w/2,0 L w-r,0 A r,r 0 0,1 w,r L w,h/2 Z"
            ],
            ellipse = [
                path = "M w,h/2 A w/2,h/2 0 0,1 w/2,h A w/2,h/2 0 0,1 0,h/2 A w/2,h/2 0 0,1 w/2,0 A w/2,h/2 0 0,1 w,h/2 Z"
            ],
            circle = [
                path = "M w,h/2 A w/2,h/2 0 0,1 w/2,h A w/2,h/2 0 0,1 0,h/2 A w/2,h/2 0 0,1 w/2,0 A w/2,h/2 0 0,1 w,h/2 Z"
            ],
            diamond = [
                path = "M w,h/2 L w/2,h L 0,h/2 L w/2,0 Z"
            ],
            hexagon = [
                path = "M w,h/2 L w-0.25h,h L w/2,h L 0.25h,h L 0,h/2 L 0.25h,0 L w/2,0 L w-0.25h,0 Z"
            ],
            parallelogram = [
                path = "M w-0.125h,h/2 L w-0.25h,h L 0.5w-0.125h,h L 0,h L 0.125h,h/2 L 0.25h,0 L 0.5w+0.125h,0 L w,0 Z"
            ],
            note = [
                path = "M w,h/2 L w,0.75h L w,h L 0.75w,h L w/2,h L 0.25w,h L 0,h L 0,0.75h L 0,h/2 L 0,0.25h L 0,0 L 0.25w,0 L w/2,0 L 0.75w-10,0 L w-20,0 L w,20 L w,h/2 Z",
                decoration = "M w-20,0 L w-20,20 L w,20"
            ],
            box3d = [
                path = "M w,h/2 L w,h-20 L w-20,h L 0.75w-10,h L w/2,h L 0.25w,h L 0,h L 0,0.75h "
                    + "L 0,h/2 L 0,20 L 20,0 L 0.25w+10,0 L w/2,0 L 0.75w,0 L w,0 L w,0.25h L w,h/2 Z",
                decoration = "M 0,20 L w-20,20 L w,0 M w-20,20 L w-20,h"
            ],
            database = [
                path = "M w,h/2 L w,h-0.16h A w/2,0.16h 0 0,1 0,h-0.16h L 0,h/2 L 0,0.16h A w/2,0.16h 0 0,1 w,0.16h L w,h/2 Z",
                decoration = "M 0,0.16h A w/2,0.16h 0 0,0 w,0.16h"
            ],
            chevron = [
                path = "M w,h/2 L w-h/2,h L w/2,h L 0,h L h/2,h/2 L 0,0 L w/2,0 L w-h/2,0 Z"
            ],
            chevronStart = [
                path = "M w,h/2 L w-h/2,h L w/2,h L 0,h L 0,h/2 L 0,0 L w/2,0 L w-h/2,0 Z"
            ],
            chevronEnd = [
                path = "M w,h/2 L w,h L w/2,h L 0,h L h/2,h/2 L 0,0 L w/2,0 L w,0 Z"
            ]
        ]
    `
);
