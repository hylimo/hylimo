import { Base64 } from "js-base64";
import { deflate, inflate } from "pako";

/**
 * Supported serialization types.
 */
export type SerializationType = "pako" | "base64";

/**
 * Serialize the data using the specified serialization type.
 * Does NOT support the "plain" serialization type.
 *
 * @param data the UTF-8 encoded string to serialize
 * @param type the serialization type to use
 * @returns the serialized data
 */
export function serialize(data: string, type: SerializationType): string {
    switch (type) {
        case "pako": {
            return `pako:${Base64.fromUint8Array(deflate(new TextEncoder().encode(data), { level: 9 }), true)}`;
        }
        case "base64": {
            return `base64:${Base64.toBase64(data, true)}`;
        }
        default: {
            throw new Error(`Unknown serialization type: ${type}`);
        }
    }
}

/**
 * Deserialize the data using the specified serialization type.
 *
 * @param data the serialized data
 * @returns the deserialized data
 */
export function deserialize(data: string): string {
    let type, content: string;
    if (data.includes(":")) {
        [type, content] = data.split(":");
    } else {
        type = "plain";
        content = data;
    }
    switch (type) {
        case "pako": {
            return new TextDecoder().decode(inflate(Base64.toUint8Array(content)));
        }
        case "base64": {
            return Base64.fromBase64(content);
        }
        case "plain": {
            return content;
        }
        default: {
            throw new Error(`Unknown serialization type: ${type}`);
        }
    }
}
