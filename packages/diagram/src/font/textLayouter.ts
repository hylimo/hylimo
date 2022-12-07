import { Font } from "fontkit";
import LineBreaker, { Break } from "linebreak";
import { LayoutElement, Size } from "../layout/layoutElement";
import { Text } from "../model/model";
import { FontFamily } from "./font";

/**
 * Result of a text layout process
 */
export interface TextLayoutResult {
    /**
     * Required size for the text elements
     */
    size: Size;
    /**
     * Layout result with position (0,0)
     */
    elements: Text[];
}

/**
 * Layouts all spans of a text element.
 * In the future, this may cache results
 */
export class TextLayouter {
    /**
     * Layouts a text element
     *
     * @param text the element to layout
     * @param fonts all known fonts
     * @param maxWidth the max width
     * @returns the size it needs
     */
    layout(text: LayoutElement, fonts: Map<string, FontFamily>, maxWidth: number): TextLayoutResult {
        let usedMaxWidth = 0;
        let offsetX = 0;
        let offsetY = 0;
        let currentAscent = 0;
        let currentDescent = 0;
        const elements: Text[] = [];
        let lineEmpty = true;
        let textOffset = 0;
        const doBreak = () => {
            offsetX = 0;
            offsetY += currentDescent;
            lineEmpty = true;
            currentAscent = 0;
            currentDescent = 0;
        };
        const addTextElement = (text: string, styles: any) => {
            offsetY += currentAscent;
            elements.push({
                type: "text",
                text,
                fill: styles.fill,
                fontFamily: styles.fontFamily,
                fontSize: styles.fontSize,
                fontWeight: styles.fontWeight,
                fontStyle: styles.fontStyle,
                id: "",
                x: textOffset,
                y: offsetY,
                width: 0,
                height: 0,
                children: []
            });
        };
        for (const span of text.contents as LayoutElement[]) {
            const styles = span.styles;
            const textContent = styles.text as string;
            const breaks: Break[] = [];
            const lineBreaker = new LineBreaker(textContent);
            let lineBreak: Break | null = lineBreaker.nextBreak();
            const fontFamily = fonts.get(styles.fontFamily)!;
            let font: Font;
            if (styles.fontWeight == "bold") {
                if (styles.fontStyle == "italic") {
                    font = fontFamily.boldItalic;
                } else {
                    font = fontFamily.bold;
                }
            } else {
                if (styles.fontStyle == "italic") {
                    font = fontFamily.italic;
                } else {
                    font = fontFamily.normal;
                }
            }
            const scalingFactor = styles.fontSize / font.unitsPerEm;
            const fontAscent = scalingFactor * (font.ascent + font.lineGap / 2);
            const fontDescent = scalingFactor * (-font.descent + font.lineGap / 2);
            const glyphRun = font.layout(textContent);
            let textContentStart = 0;
            let textContentOffset = 0;
            let lastBreakOpportunityTextContentOffset = -1;
            let lastBreakOpportunity = -1;
            let lastBreakOpportunityOffsetX = 0;
            for (let i = 0; i < glyphRun.glyphs.length; i++) {
                const glyph = glyphRun.glyphs[i];
                const advanceWidth = glyph.advanceWidth * scalingFactor;
                if (offsetX + advanceWidth > maxWidth) {
                    if (!lineEmpty) {
                        if (lastBreakOpportunityTextContentOffset >= 0) {
                            usedMaxWidth = Math.max(usedMaxWidth, lastBreakOpportunityOffsetX);
                            addTextElement(
                                textContent.substring(textContentStart, lastBreakOpportunityTextContentOffset + 1),
                                styles
                            );
                            textContentStart = lastBreakOpportunityTextContentOffset + 1;
                        }
                        doBreak();
                        i = lastBreakOpportunity;
                        textContentOffset = lastBreakOpportunityTextContentOffset;
                        continue;
                    } else {
                        if (i == 0) {
                            // first character, do not break
                        } else {
                            currentAscent = Math.max(currentAscent, fontAscent);
                            currentDescent = Math.max(currentDescent, fontDescent);
                            usedMaxWidth = Math.max(usedMaxWidth, offsetX);
                            addTextElement(textContent.substring(textContentStart, i), styles);
                            doBreak();
                            textContentStart = i;
                        }
                    }
                }
                textContentOffset += glyph.codePoints.length;
                offsetX += advanceWidth;
                if (textContentOffset == lineBreak?.position) {
                    lineEmpty = false;
                    lastBreakOpportunity = i;
                    lastBreakOpportunityTextContentOffset = textOffset;
                    lastBreakOpportunityOffsetX = offsetX;
                    currentAscent = Math.max(currentAscent, fontAscent);
                    currentDescent = Math.max(currentDescent, fontDescent);
                    if (lineBreak.required || i == glyphRun.glyphs.length - 1) {
                        usedMaxWidth = Math.max(usedMaxWidth, offsetX);
                        addTextElement(textContent.substring(textContentStart, i + 1), styles);
                        textContentStart = i + 1;
                    }
                    if (lineBreak.required) {
                        doBreak();
                    }
                    lineBreak = lineBreaker.nextBreak();
                }
            }
        }
        doBreak();
        return {
            elements: elements,
            size: {
                width: usedMaxWidth,
                height: offsetY
            }
        };
    }
}
