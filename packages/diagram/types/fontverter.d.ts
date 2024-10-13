declare module "fontverter" {
    type Format = "truetype" | "sfnt" | "woff" | "woff2";

    export function convert(buffer: Buffer, toFormat: Format, fromFormat?: Format): Promise<Buffer>;
    export function convert(buffer: Buffer, toFormat: Format, fromFormat?: Format): Promise<Buffer>;
}
