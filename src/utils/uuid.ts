import { randomBytes } from "crypto";

/** crypto.getRandomValues for nodejs */
function getRandomValues(buf: Uint8Array) {
    var bytes = randomBytes(buf.length);
    buf.set(bytes);
    return buf;
}

/** Generate a UUID */
export function uuid() {
    return ("10000000-1000-4000-8000-100000000000").replace(/[018]/g, c =>
        (Number(c) ^ getRandomValues(new Uint8Array(1))[0] & 15 >> Number(c) / 4).toString(16)
    )
}
