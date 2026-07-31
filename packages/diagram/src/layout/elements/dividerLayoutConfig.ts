import type { FullObject } from "@hylimo/core";
import { nullType } from "@hylimo/core";
import type { Element, Point, Size, Stroke } from "@hylimo/diagram-common";
import { Path } from "@hylimo/diagram-common";
import type { LayoutElement, SizeConstraints } from "../layoutElement.js";
import { ContentCardinality } from "../layoutElement.js";
import type { Layout } from "../engine/layout.js";
import { ElementLayoutConfig } from "./elementLayoutConfig.js";
import {
    extractStrokeStyleAttributes,
    marginStyleAttributes,
    strokeStyleAttributes,
    visibilityStyleAttributes
} from "./attributes.js";
import { getContentLayoutConfig } from "./layout/contentLayout.js";
import { ShapeLayoutConfig } from "./shapeLayoutConfig.js";
import type { DividerAxis, DividerDash } from "../shape/divider.js";
import { buildDividerGeometry, dividerRuns, paintDivider } from "../shape/divider.js";
import type { ShapeLayoutState } from "./shapeLayoutConfig.js";

/**
 * The stroke styles a divider takes. A rule is a straight run with no corners to join, and it ends
 * where the shape's border does — a cap reaching past that is geometry the shape has no room for —
 * so the three attributes describing those are left undeclared rather than accepted and overruled.
 */
const dividerStrokeAttributes = strokeStyleAttributes.filter(
    (attribute) => !["strokeLineJoin", "strokeLineCap", "strokeMiterLimit"].includes(attribute.name)
);

/**
 * Layout config for the `divider`: a rule drawn across the interior of a shape, terminating exactly
 * at its border and at every decoration it meets.
 *
 * A divider is only ever a direct child of a `shape`, which the content-type whitelist enforces
 * statically — `container` does not admit one, so a divider nested one level down inside a shape is
 * already a type error and no parent walk is needed. From that it follows that the divider knows its
 * shape (its parent) and its orientation (the shape's own flow direction) without either being
 * declared.
 *
 * It extends {@link ElementLayoutConfig} directly rather than {@link StyledElementLayoutConfig},
 * because flex, size and alignment are not merely ignored here: a rule has no size of its own to
 * give, it spans whatever the shape leaves it. {@link Layout.applyStyles} only ever reads the
 * attributes a config declares, so those styles are genuinely absent rather than silently dropped.
 * The divider's own stroke styles are its appearance, and it has no fill — it is a stroke, not a
 * region.
 */
export class DividerLayoutConfig extends ElementLayoutConfig {
    override type = "divider";
    override idGroup = "d";

    /**
     * Creates a new DividerLayoutConfig
     */
    constructor() {
        super(
            [],
            [...visibilityStyleAttributes, ...marginStyleAttributes, ...dividerStrokeAttributes],
            nullType,
            ContentCardinality.None
        );
    }

    /**
     * Measures the divider, which takes its thickness along the flow of the shape and nothing at all
     * across it: a box takes the largest of its children there, and a rule must never be the thing
     * that makes its shape wider or taller.
     *
     * @param _layout performs the layout
     * @param element the divider to measure
     * @param _constraints defines min and max size
     * @returns the calculated size
     */
    override measure(_layout: Layout, element: LayoutElement, _constraints: SizeConstraints): Size {
        const axis = this.axis(element);
        const styles = element.styles;
        styles.strokeWidth = styles.stroke ? (styles.strokeWidth ?? 1) : 0;
        const thickness = styles.strokeWidth as number;
        return axis === "horizontal" ? { width: 0, height: thickness } : { width: thickness, height: 0 };
    }

    /**
     * Lays out the divider as the runs it is drawn as, in the coordinate space of the shape it sits
     * in — that is where the shape's own geometry was solved, and a rule terminating against it has
     * to be measured there rather than translated in afterwards.
     *
     * The span handed to {@link dividerRuns} is the extent the divider itself was given: the free
     * intervals it may bleed into are the ones it actually reaches, not every interval at this height.
     *
     * @param layout performs the layout
     * @param element the divider to lay out
     * @param position offset in current context
     * @param size the size of the divider
     * @param id the id of the divider
     * @returns the rule, or nothing where the shape leaves it no room
     */
    override layout(layout: Layout, element: LayoutElement, position: Point, size: Size, id: string): Element[] {
        if (element.isHidden) {
            return [];
        }
        const shape = this.shape(element);
        const state = shape.shapeLayoutState as ShapeLayoutState | undefined;
        const stroke = element.styles.stroke;
        if (state == undefined || stroke == undefined) {
            return [];
        }
        const axis = this.axis(element);
        const { laidOut, origin } = state;
        const thickness = (element.styles.strokeWidth as number | undefined) ?? 0;
        const coordinate =
            axis === "horizontal" ? position.y + size.height / 2 - origin.y : position.x + size.width / 2 - origin.x;
        const span =
            axis === "horizontal"
                ? { from: position.x - origin.x, to: position.x + size.width - origin.x }
                : { from: position.y - origin.y, to: position.y + size.height - origin.y };
        const geometry = layout.engine.dividerCache.getOrCompute(
            {
                path: laidOut.path,
                decoration: laidOut.decorationPath.length > 0 ? laidOut.decorationPath : undefined,
                stroke: state.stroke,
                axis
            },
            () => buildDividerGeometry(laidOut.path, laidOut.decorationPath || undefined, state.stroke, axis)
        );
        const runs = dividerRuns(geometry, axis, coordinate, thickness, span);
        if (runs.length === 0) {
            return [];
        }
        const styleAttributes = extractStrokeStyleAttributes(element.styles);
        const painting = paintDivider(geometry, runs, coordinate, thickness, this.dash(styleAttributes.stroke));
        if (painting.path.length === 0) {
            return [];
        }
        const result: Path = {
            type: Path.TYPE,
            id,
            ...origin,
            ...laidOut.size,
            ...styleAttributes,
            path: painting.path,
            clip: painting.clip,
            clipFill: painting.clipFill,
            children: [],
            edits: element.edits
        };
        return [result];
    }

    override getChildren(): FullObject[] {
        return [];
    }

    /**
     * Reads the dash pattern out of a stroke, so the area a dashed rule covers can be worked out
     * dash by dash
     *
     * @param stroke the stroke the divider is painted with
     * @returns the dash pattern, or undefined for a solid stroke
     */
    private dash(stroke: Stroke | undefined): DividerDash | undefined {
        if (stroke?.dash == undefined) {
            return undefined;
        }
        return { length: stroke.dash, gap: stroke.dashSpace ?? stroke.dash };
    }

    /**
     * Resolves the shape a divider belongs to, which is always its parent.
     *
     * The content-type whitelist already makes anything else a type error, so this can only fail if
     * a content type is one day widened to admit a divider where it does not belong — which is
     * exactly why it fails loudly instead of rendering nonsense.
     *
     * @param element the divider to resolve the shape of
     * @returns the shape the divider sits in
     * @throws Error if the divider is not a direct child of a shape
     */
    private shape(element: LayoutElement): LayoutElement {
        const parent = element.parent;
        if (parent == undefined) {
            throw new Error("a divider must be a direct child of a shape, but it has no parent");
        }
        if (!(parent.layoutConfig instanceof ShapeLayoutConfig)) {
            throw new Error(
                `a divider must be a direct child of a shape, but its parent is a ${parent.layoutConfig.type}`
            );
        }
        return parent;
    }

    /**
     * The axis a divider runs along, taken from the flow direction of the shape it sits in: a `vbox`
     * stacks its contents vertically, so a rule between two of them is horizontal, and the other way
     * round for an `hbox`. A `stack` has no flow at all, so a divider has no defined position in one.
     *
     * @param element the divider to get the axis of
     * @returns the axis the divider runs along
     * @throws Error if the shape has no flow direction
     */
    private axis(element: LayoutElement): DividerAxis {
        const layout = getContentLayoutConfig(this.shape(element)).type;
        if (layout === "vbox") {
            return "horizontal";
        }
        if (layout === "hbox") {
            return "vertical";
        }
        throw new Error(`a divider has no defined position in a shape laid out as '${layout}'`);
    }
}
