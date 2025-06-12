

const perm = new Uint8Array(512);
const p = new Uint8Array(256);

//     const grad3 = [
//     [1,1], [-1,1], [1,-1], [-1,-1],
//     [1,0], [-1,0], [0,1], [0,-1],
//     [1,1], [-1,1], [1,-1], [-1,-1] // repeat to make 12 gradients
// ];

const grad3 = [];
for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12;
    grad3.push([Math.cos(angle), Math.sin(angle)]);
}

// Create a permutation table: a suffled array of [0...255] doubled for overflow

for (let i = 0; i < 256; i++) p[i] = i; // fill with 1,2,3...255
for (let i = 0; i < 256; i++) {
    const j = Math.floor(Math.random() * 256);
    [p[i], p[j]] = [p[j], p[i]]; // shuffle
}
for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255]; // copy p into perm twice
}


//#region Single Octave

export function generateSimplexNoise(x, y) {

    // Values that make equalateral triangles fit together
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

//#region Fractal Noise

// ====== fBm / Fractal noise helper ==========
/**
 * fractalNoise(x, z, octaves, lacunarity, gain)
 *   x, z       : world‐space coordinates
 *   octaves    : number of noise layers to sum (e.g. 4)
 *   lacunarity : frequency multiplier per octave (typically 2.0)
 *   gain       : amplitude multiplier per octave (typically 0.5)
 *
 * Returns a value in approximately [−1 … +1], though the exact range
 * depends on the choice of octaves & gain. You may need to normalize if you
 * care about a guaranteed range.
 */

//export function fractalNoise(x, z, octaves = 4, lacunarity = 2.0, gain = 0.5, freq, amp) {
export function fractalNoise(parameters) {
    let { x, z, octaves, lacunarity, gain, freq, amp } = parameters;

    //let amplitude = 1.0;
    //let frequency = 1.0;
    let sum = 0.0;
    let max = 0.0; // for normalization (optional)

    for (let o = 0; o < Math.floor(octaves); o++) {
        //sum += generateSimplexNoise(x * frequency, z * frequency) * amplitude;


        // const angle = o * Math.PI * 0.4;
        // const cos = Math.cos(angle), sin = Math.sin(angle);
        // let rx = (x * cos - z * sin);
        // let rz = (x * sin + z * cos);

        //sum += generateSimplexNoise(rx * freq, rz * freq) * amp;

        sum += generateSimplexNoise(x * freq, z * freq) * amp;

        //max += amplitude;
        //amplitude *= gain;
        //frequency *= lacunarity;

        max += amp;
        amp *= gain;
        freq *= lacunarity;
        
        
    }

    // Now sum ∈ [−max … +max]. If you want to clamp to [−1…1], do:
    return sum / max;
}



export function fractalNoiseRaw(params) {
  // exactly your existing fBm, but ALWAYS full octaves (or use the fractional version from before)
  let { x, z, octaves, lacunarity, gain, freq, amp } = params;
  let sum = 0, max = 0;
  for (let o = 0; o < octaves; o++) {
    sum += generateSimplexNoise(x * freq, z * freq) * amp;
    max += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / max; 
}
