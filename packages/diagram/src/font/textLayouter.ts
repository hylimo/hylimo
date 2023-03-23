import { Font } from "fontkit";
import LineBreaker, { Break } from "linebreak";
import { LayoutElement } from "../layout/layoutElement";
import { Text, Size, FontFamily } from "@hylimo/diagram-common";

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
        let currentTextElements: Text[] = [];
        let fontAscent = 0;
        let fontDescent = 0;
        const doBreak = () => {
            offsetX = 0;
            offsetY += currentAscent;
            for (const elementToAdd of currentTextElements) {
                elementToAdd.y = offsetY;
                elements.push(elementToAdd);
            }
            currentTextElements = [];
            offsetY += currentDescent;
            lineEmpty = true;
            currentAscent = 0;
            currentDescent = 0;
            textOffset = 0;
        };
        const addTextElement = (text: string, styles: any) => {
            usedMaxWidth = Math.max(usedMaxWidth, offsetX);
            currentAscent = Math.max(currentAscent, fontAscent);
            currentDescent = Math.max(currentDescent, fontDescent);
            currentTextElements.push({
                type: Text.TYPE,
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
            lineEmpty = false;
            textOffset = offsetX;
        };
        for (const span of text.contents as LayoutElement[]) {
            const styles = span.styles;
            const textContent = styles.text as string;
            const lineBreaker = new LineBreaker(textContent + " ");
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
            fontAscent = scalingFactor * (font.ascent + font.lineGap / 2);
            fontDescent = scalingFactor * (-font.descent + font.lineGap / 2);
            const glyphRun = font.layout(textContent);
            let textContentStart = 0;
            let textContentOffset = 0;
            let lastBreakOpportunityTextContentOffset = 0;
            let lastBreakOpportunity = -1;
            let lastBreakOpportunityOffsetX = 0;
            for (let i = 0; i < glyphRun.glyphs.length; i++) {
                const glyph = glyphRun.glyphs[i];
                let advanceWidth: number;
                if (textContent[textContentOffset] === "\n") {
                    advanceWidth = 0;
                } else {
                    advanceWidth = glyph.advanceWidth * scalingFactor;
                }
                if (offsetX + advanceWidth > maxWidth) {
                    if (!lineEmpty) {
                        if (lastBreakOpportunityTextContentOffset > 0) {
                            offsetX = lastBreakOpportunityOffsetX;
                            addTextElement(
                                textContent.substring(textContentStart, lastBreakOpportunityTextContentOffset),
                                styles
                            );
                            textContentStart = lastBreakOpportunityTextContentOffset;
                        }
                        doBreak();
                        i = lastBreakOpportunity;
                        textContentOffset = lastBreakOpportunityTextContentOffset;
                        continue;
                    } else if (i > 0) {
                        addTextElement(textContent.substring(textContentStart, i), styles);
                        doBreak();
                        textContentStart = i;
                    }
                }
                textContentOffset += glyph.codePoints.length;
                offsetX += advanceWidth;
                if (textContentOffset == lineBreak?.position) {
                    lineEmpty = false;
                    lastBreakOpportunity = i;
                    lastBreakOpportunityTextContentOffset = textContentOffset;
                    lastBreakOpportunityOffsetX = offsetX;
                    if (lineBreak.required) {
                        addTextElement(textContent.substring(textContentStart, i + 1), styles);
                        textContentStart = i + 1;
                        doBreak();
                    }
                    lineBreak = lineBreaker.nextBreak();
                }
            }
            addTextElement(textContent.substring(textContentStart, textContent.length), styles);
            if (lineBreak && lineBreak.required) {
                doBreak();
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
