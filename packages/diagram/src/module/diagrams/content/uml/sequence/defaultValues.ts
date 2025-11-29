import { numberType, num } from "@hylimo/core";
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
            numberType,
            num(3)
        ],
        ["activityWidth", "How wide an activity indicator should be", numberType, num(10)],
        ["minActivityHeight", "Minimum height of an activity indicator", numberType, num(10)],
        ["strokeMargin", "Margin for strokes", numberType, num(1)],
        ["connectionMargin", "Default distance required after a connection between participants", numberType, num(20)],
        ["deactivateMargin", "Default distance required after a deactivation", numberType, num(10)],
        ["destroyingCrossSize", "The width and height of a participant-destruction cross", numberType, num(20)],
        ["externalMessageDiameter", "Width and height of the circle of lost and found messages", numberType, num(20)],
        ["frameMargin", "Default distance required after a frame", numberType, num(20)],
        ["fragmentMargin", "Default distance required after a fragment", numberType, num(20)],
        [
            "externalMessageMargin",
            "How far away on the x axis a lost or found message should be drawn",
            numberType,
            num(95)
        ],
        ["frameMarginX", "Default margin to apply on the left and right side of frames", numberType, num(15)],
        ["frameMargin", "Default distance required after a frame", numberType, num(10)],
        ["frameMarginTop", "Default margin to apply on the top of frames", numberType, num(30)],
        ["frameMarginBottom", "Default margin to apply on the bottom of frames", numberType, num(5)],
        ["frameSubtextMargin", "Default horizontal margin for frame subtexts", numberType, num(10)],
        [
            "eventDefaultMargin",
            "Default margin for events on a participant when no other margin is specified",
            numberType,
            num(5)
        ],
        ["participantMargin", "How far apart subsequent participants should be", numberType, num(200)],
        ["initialMargin", "Default distance required after a new participant", numberType, num(20)]
    ]
);
