import LineBreaker, { Break } from "linebreak";
import { LayoutElement } from "../layoutElement.js";
import { Text, Size, FontWeight, FontStyle, TextLine } from "@hylimo/diagram-common";
import { FontCollection } from "./fontCollection.js";
import { extractFillStyleAttributes } from "../elements/attributes.js";
import { Font } from "fontkit";

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
    layout(text: LayoutElement, fonts: FontCollection, maxWidth: number): TextLayoutResult {
        const layoutInstance = new TextLayoutInstance(text, fonts, maxWidth);
        return layoutInstance.layout();
    }
}

/**
 * Context in which a text element is created
 */
interface TextContext {
    /**
     * The styles applyed to the current span
     */
    styles: any;
    /**
     * The name of the current font
     */
    fontFamily: string;
    /**
     * The current font
     */
    font: Font;
    /**
     * The scaling factor applied to font design units
     */
    scalingFactor: number;
}

/**
 * A text layout instance
 */
class TextLayoutInstance {
    /**
     * The actually used width
     */
    private usedWidth = 0;
    /**
     * The current x offset
     */
    private offsetX = 0;
    /**
     * The current y offset
     */
    private offsetY = 0;
    /**
     * Ascent (and half line gap) of the current line
     */
    private currentAscent = 0;
    /**
     * Descent (and half line gap) of the current line
     */
    private currentDescent = 0;
    /**
     * Finalized text elements
     */
    private readonly elements: Text[] = [];
    /**
     * Whether the current line is empty
     */
    private lineEmpty = true;
    /**
     * Offset for the current text element
     */
    private textOffset = 0;
    /**
     * The text elements in the current line
     */
    private currentTextElements: Text[] = [];
    /**
     * The ascent (and half line gap) of the current font
     */
    private fontAscent = 0;
    /**
     * The descent (and half line gap) of the current font
     */
    private fontDescent = 0;
    /**
     * Context required to add a text element
     */
    private currentTextContext?: TextContext;

    /**
     * Creates a new text layouter instance
     *
     * @param text the text to layout
     * @param fonts font collection of all required fonts
     * @param maxWidth the maximum width available
     */
    constructor(
        private readonly text: LayoutElement,
        private readonly fonts: FontCollection,
        private readonly maxWidth: number
    ) {}

    /**
     * Layouts the text element
     *
     * @returns the layout result
     */
    layout(): TextLayoutResult {
        for (const span of this.text.children as LayoutElement[]) {
            this.layoutSpan(span);
        }
        this.doBreak();
        return {
            elements: this.elements,
            size: {
                width: this.usedWidth,
                height: this.offsetY
            }
        };
    }

    /**
     * Layouts a single span
     *
     * @param span the span to layout
     */
    private layoutSpan(span: LayoutElement) {
        const styles = span.styles;
        const textContent = styles.text as string;
        const lineBreaker = new LineBreaker(textContent + " ");
        let lineBreak: Break | null = lineBreaker.nextBreak();
        const { font, id: fontFamily } = this.fonts.getFont(
            styles.fontFamily,
            styles.fontWeight ?? FontWeight.Normal,
            styles.fontStyle ?? FontStyle.Normal
        );
        const scalingFactor = styles.fontSize / font.unitsPerEm;
        this.currentTextContext = { styles, fontFamily, font, scalingFactor };
        this.fontAscent = scalingFactor * (font.ascent + font.lineGap / 2);
        this.fontDescent = scalingFactor * (-font.descent + font.lineGap / 2);
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
            if (this.offsetX + advanceWidth > this.maxWidth) {
                if (!this.lineEmpty) {
                    if (lastBreakOpportunityTextContentOffset > 0) {
                        this.offsetX = lastBreakOpportunityOffsetX;
                        this.addTextElement(
                            textContent.substring(textContentStart, lastBreakOpportunityTextContentOffset)
                        );
                        textContentStart = lastBreakOpportunityTextContentOffset;
                    }
                    this.doBreak();
                    i = lastBreakOpportunity;
                    textContentOffset = lastBreakOpportunityTextContentOffset;
                    continue;
                } else if (i > 0) {
                    this.addTextElement(textContent.substring(textContentStart, i));
                    this.doBreak();
                    textContentStart = i;
                }
            }
            textContentOffset += glyph.codePoints.length;
            this.offsetX += advanceWidth;
            if (textContentOffset == lineBreak?.position) {
                this.lineEmpty = false;
                lastBreakOpportunity = i;
                lastBreakOpportunityTextContentOffset = textContentOffset;
                lastBreakOpportunityOffsetX = this.offsetX;
                if (lineBreak.required) {
                    this.addTextElement(textContent.substring(textContentStart, i + 1));
                    textContentStart = i + 1;
                    this.doBreak();
                }
                lineBreak = lineBreaker.nextBreak();
            }
        }
        this.addTextElement(textContent.substring(textContentStart, textContent.length));
        if (lineBreak != null && lineBreak.required) {
            this.doBreak();
        }
    }

    /**
     * Insert a line break
     */
    private doBreak() {
        this.offsetX = 0;
        this.offsetY += this.currentAscent;
        for (const elementToAdd of this.currentTextElements) {
            elementToAdd.y = this.offsetY;
            this.elements.push(elementToAdd);
        }
        this.currentTextElements = [];
        this.offsetY += this.currentDescent;
        this.lineEmpty = true;
        this.currentAscent = 0;
        this.currentDescent = 0;
        this.textOffset = 0;
    }

    /**
     * Adds a new text element to the current line
     * Uses the font and styles from the {@link currentTextContext}
     *
     * @param text the text to add
     * @param width the width of the text element
     */
    private addTextElement(text: string) {
        const { styles, fontFamily } = this.currentTextContext!;
        this.usedWidth = Math.max(this.usedWidth, this.offsetX);
        this.currentAscent = Math.max(this.currentAscent, this.fontAscent);
        this.currentDescent = Math.max(this.currentDescent, this.fontDescent);
        const width = this.offsetX - this.textOffset;
        this.currentTextElements.push({
            type: Text.TYPE,
            text,
            ...extractFillStyleAttributes(styles),
            fontFamily,
            fontSize: styles.fontSize,
            underline: width > 0 ? this.extractUnderline() : undefined,
            strikethrough: width > 0 ? this.extractStrikethrough() : undefined,
            id: "",
            x: this.textOffset,
            y: this.offsetY,
            width,
            height: 0,
            children: [],
            edits: {}
        });
        this.lineEmpty = false;
        this.textOffset = this.offsetX;
    }

    /**
     * Extracts the underline from the current text context
     *
     * @returns the underline or undefined if no underline is present
     */
    private extractUnderline(): TextLine | undefined {
        const font = this.currentTextContext!.font;
        return this.extractLine("underline", font.underlinePosition, font.underlineThickness);
    }

    /**
     * Extracts the strikethrough from the current text context
     *
     * @returns the strikethrough or undefined if no strikethrough is present
     */
    private extractStrikethrough(): TextLine | undefined {
        const font = this.currentTextContext!.font;
        return this.extractLine("strikethrough", font["OS/2"].yStrikeoutPosition, font["OS/2"].yStrikeoutSize);
    }

    /**
     * Extracts a line (underline or strikethrough) from the current text context
     *
     * @param styleName the name of the style
     * @param fontPos the position of the line in the font
     * @param fontThickness the thickness of the line in the font
     * @returns the line or undefined if the line is not present
     */
    private extractLine(styleName: string, fontPos: number, fontThickness: number): TextLine | undefined {
        const { styles, scalingFactor } = this.currentTextContext!;
        const line: string | boolean = styles[styleName];
        if (line == undefined || line === false) {
            return undefined;
        }
        const color = line === true ? styles.fill : line;
        const lineWidth = styles[styleName + "Width"] ?? fontThickness * scalingFactor;
        return {
            color,
            width: lineWidth,
            y: -fontPos * scalingFactor + lineWidth / 2,
            opacity: styles[styleName + "Opacity"] ?? 1,
            dash: styles[styleName + "Dash"],
            dashSpace: styles[styleName + "DashSpace"]
        };
    }
}
