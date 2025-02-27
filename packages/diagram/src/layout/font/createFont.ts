import { Buffer } from "buffer/index.js";
import { Font, create } from "fontkit";

/**
 * Creates a font from the provided source
 *
 * @param source the source of the font (either a buffer or a base64 encoded string)
 * @returns the created font
 */
export function createFont(source: string | Buffer): Font {
    let buffer: Buffer;
    if (typeof source === "string") {
        buffer = Buffer.from(source, "base64");
    } else {
        buffer = source;
    }
    return create(buffer as any) as Font;
}
