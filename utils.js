

//#region Lerp / Smooth
export function lerp (a, b, t) {
    return a + t * (b - a);
}

export function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}