import { finiteNumberType, num } from "@hylimo/core";
import { ContentModule } from "../../contentModule.js";

/**
 * Provides a default margin - the additional (vertical) length that is added to each line on top of its normally calculated borders
 */
export const defaultValuesModule = ContentModule.create(
    "uml/sequence/defaultValues",
    [],
    [],
    [],
    [
        [
            "activityShift",
            "How far on the x axis subsequent simultaneously active activity indicators on the same participant are shifted",
            finiteNumberType,
            num(3)
        ],
        ["activityWidth", "How wide an activity indicator should be", finiteNumberType, num(10)],
        ["minActivityHeight", "Minimum height of an activity indicator", finiteNumberType, num(10)],
        ["strokeMargin", "Margin for strokes", finiteNumberType, num(1)],
        [
            "connectionMargin",
            "Default distance required after a connection between participants",
            finiteNumberType,
            num(20)
        ],
        ["deactivateMargin", "Default distance required after a deactivation", finiteNumberType, num(10)],
        ["destroyingCrossSize", "The width and height of a participant-destruction cross", finiteNumberType, num(20)],
        [
            "externalMessageDiameter",
            "Width and height of the circle of lost and found messages",
            finiteNumberType,
            num(20)
        ],
        ["frameMargin", "Default distance required after a frame", finiteNumberType, num(20)],
        ["fragmentMargin", "Default distance required after a fragment", finiteNumberType, num(20)],
        [
            "externalMessageMargin",
            "How far away on the x axis a lost or found message should be drawn",
            finiteNumberType,
            num(95)
        ],
        ["frameMarginX", "Default margin to apply on the left and right side of frames", finiteNumberType, num(15)],
        ["frameMargin", "Default distance required after a frame", finiteNumberType, num(10)],
        ["frameMarginTop", "Default margin to apply on the top of frames", finiteNumberType, num(30)],
        ["frameMarginBottom", "Default margin to apply on the bottom of frames", finiteNumberType, num(5)],
        ["frameSubtextMargin", "Default horizontal margin for frame subtexts", finiteNumberType, num(10)],
        [
            "eventDefaultMargin",
            "Default margin for events on a participant when no other margin is specified",
            finiteNumberType,
            num(5)
        ],
        ["participantMargin", "How far apart subsequent participants should be", finiteNumberType, num(200)],
        ["initialMargin", "Default distance required after a new participant", finiteNumberType, num(20)]
    ]
);
