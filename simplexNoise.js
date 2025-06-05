

const perm = new Uint8Array(512);
const p = new Uint8Array(256);

    const grad3 = [
    [1,1], [-1,1], [1,-1], [-1,-1],
    [1,0], [-1,0], [0,1], [0,-1],
    [1,1], [-1,1], [1,-1], [-1,-1] // repeat to make 12 gradients
];


//#region Perm Table
// Create a permutation table: a suffled array of [0...255] doubled for overflow

for (let i = 0; i < 256; i++) p[i] = i; // fill with 1,2,3...255
for (let i = 0; i < 256; i++) {
    const j = Math.floor(Math.random() * 256);
    [p[i], p[j]] = [p[j], p[i]]; // shuffle
}
for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255]; // copy p into perm twice
}




export function generateSimplexNoise(x, y) {


    //#region Skew

    // Vlues that make equalateral triangles fit together
    const F2 = 0.5 * (Math.sqrt(3) - 1);    // ~ 0.36602  // used to skew
    const G2 = (3 - Math.sqrt(3)) / 6;      // ~ 0.21132  // used to unskew

    // given a point (x,y), skew it
    const s = (x + y) * F2;
    const i = Math.floor(x + s);    // grid coords in skewed space
    const j = Math.floor(y + s);

    // Unskew cell origin to regular space
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;

    // now we're back in regular space, and know which triangle we're in.
    // Figure out which half of the triangle, and use that to pick our corners
    let i1, j1;
    if (x0 > y0) {  // lower triangle. x is further: (1,0)
        i1 = 1; j1 = 0;
    } else {        // upper triangle. y is further: (0,1)
        i1 = 0; j1 = 1;
    }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    const ii = i & 255; // mask bc perm array hsd 512 elements
    const jj = j & 255;

    // hash each corner. gradient index.
    const gi0 = perm[ii + perm[jj]] % 12; // %12 bc 12 gradient vectors for 2D
    const gi1 = perm[ii + i1 + perm[jj + j1]] % 12;
    const gi2 = perm[ii + 1 + perm[jj + 1]] % 12;

    //#region Contribution

    // calculate corner contributions
    function contribution(t, x, y, gi) {
        if (t < 0) return 0.0;
        t *= t;
        return t * t * dot(grad3[gi], [x,y]);
    }

    function dot(g, coords) {
        return g[0] * coords[0] + g[1] * coords[1];
    }

    // compute contribution
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    let t2 = 0.5 - x2 * x2 - y2 * y2;

    const n0 = contribution(t0, x0, y0, gi0);
    const n1 = contribution(t1, x1, y1, gi1);
    const n2 = contribution(t2, x2, y2, gi2);

    // sum the contributions
    return 70.0 * (n0 + n1 + n2); // 70 = scale factor
}