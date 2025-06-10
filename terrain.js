import { Entity } from './entity.js'
import { createTerrainMesh, loadTexture } from './meshShapes.js';
import { myShaders } from './main.js';
import { generateSimplexNoise,  fractalNoise, fractalNoiseRaw } from './simplexNoise.js';


//#region Lerp / Smooth
function lerp (a, b, t) {
    return a + t * (b - a);
}

function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}


// ProcGen Terrain


//#region Chunking

const CHUNK_SIZE = 32; // 32x32 units

const chunks = new Map();

function worldToChunkCoord(x,z) {
    return [
        Math.floor(x / CHUNK_SIZE),
        Math.floor(z / CHUNK_SIZE)
    ];
}



//#region Build Terrain
export function buildTerrain(gl) {

    const CHUNK_PIECES = 20;
    const halfPieces = CHUNK_PIECES / 2;
    const texture = loadTexture(gl, "Art/testTile.png");

    for (let x = -halfPieces; x < halfPieces; x++) {
        for (let z = -halfPieces; z < halfPieces; z++){

            const worldOffsetX = x * CHUNK_SIZE;
            const worldOffsetZ = z * CHUNK_SIZE;

            const terrainChunk = new Entity(
                {
                    mesh: createTerrainMesh(gl, CHUNK_SIZE, worldOffsetX, worldOffsetZ), 
                    position: [worldOffsetX, 0, worldOffsetZ],
                    shader: myShaders.Lighting,
                    texture: texture,
                    id: `terrain_chunk_${x},${z}`,
                });

            chunks.set(`${x},${z}`, terrainChunk);

            //console.log(`${terrainChunk.id} -->  ${terrainChunk.position}`);
        }   
    }

    return chunks;
}

//#region Biome Blender
class BiomeBlender {
    constructor(weightFunctions) {
        // this.plainsParams = this.biomeData.plains;
        // this.mountainsParams = this.biomeData.mountains;

        //this.biomeData = biomeData;

        this.weightFunctions = weightFunctions;

        //#region Weight F(n)s
        this.weightFunctions = {
            plains: (x,z) => { 
                const v = this.getBiomeValue(x, z);
                return (1 - smoothstep(0.2, 0.5, v)) + 0.05;
            },
            mountains: (x,z) => { 
                const v = this.getBiomeValue(x, z);
                return smoothstep(0.5, 0.9, v) + 0.05;
            },
            desert: (x,z) => { 
                const v = this.getBiomeValue(x, z);
                let d = 1 - Math.abs(v - 0.45) / 0.25;
                return Math.max(d, 0) + 0.05;
            },
            plateau: (x,z) => { 
                const v = this.getBiomeValue(x, z);
                return (1 - smoothstep(0.0, 0.2, v)) + 0.05;
            },
        }

        this.biomeData = {
            plains: {
                octaves:    5,
                lacunarity: 2.0,
                gain:       0.5,
                freq:       0.02,
                amp:        4.0
            },
            mountains: {
                octaves:    5,
                lacunarity: 2.0,
                gain:       0.4,
                freq:       0.01,
                amp:        80.0
            },
            desert: {
                octaves:    4,
                lacunarity: 2.0,
                gain:       0.3,
                freq:       0.015,
                amp:        0.8
            },
            plateau: {
                octaves:    1,
                lacunarity: 2.0,
                gain:       0.2,
                freq:       0.012,
                amp:        20.0
            },
        }
    }

    getBlendedNoise(x, z) {
        const params = this.getInterpolatedParams(x,z, this.biomeData);
        return { noise: fractalNoise(params), amp: params.amp };
    }

    //#region ColorMap
    getColorMap(weights) {
        const colors = {
            plains: [0, 1, 0],      // green
            mountains: [1, 0, 0],   // red
            desert: [0, 0, 0],      // black
            plateau: [0, 0, 1],     // blue
        }

        const blendedColor = [
            weights.plains      * colors.plains[0] +
            weights.mountains   * colors.mountains[0] +
            weights.desert      * colors.desert[0] +
            weights.plateau     * colors.plateau[0], 

            weights.plains      * colors.plains[1] +
            weights.mountains   * colors.mountains[1] +
            weights.desert      * colors.desert[1] +
            weights.plateau     * colors.plateau[1],

            weights.plains      * colors.plains[2] +
            weights.mountains   * colors.mountains[2] +
            weights.desert      * colors.desert[2] +
            weights.plateau     * colors.plateau[2]
        ];

        return blendedColor;
    }

    getInterpolatedParams(x,z, biomeParams) {

        let weights = this.getBiomeWeights(x, z);

        let interpolated = {
            x: x,
            z: z,
            octaves: 0,
            lacunarity: 0,
            gain: 0,
            freq: 0,
            amp: 0
        };

        // Get biome value at this position (0 = plains, 1 = mountains)
        // allows smooth map variation
        //const biomeRaw = this.getBiomeValue(x, z);
        //let blend = smoothstep(0.3, 0.7, biomeRaw);

        for (const biome in biomeParams) {
            let w = weights[biome] || 0;
            let params = biomeParams[biome];
            interpolated.octaves    += params.octaves * w;
            interpolated.lacunarity += params.lacunarity * w;
            interpolated.gain       += params.gain * w;
            interpolated.freq       += params.freq * w;
            interpolated.amp        += params.amp * w;
        }

        return interpolated;
        

        // return {
        //     x: x,
        //     z: z,
        //     octaves:    lerp(this.plainsParams.octaves, this.mountainsParams.octaves, blend),
        //     lacunarity: lerp(this.plainsParams.lacunarity, this.mountainsParams.lacunarity, blend),
        //     gain:       lerp(this.plainsParams.gain, this.mountainsParams.gain, blend),
        //     freq:       lerp(this.plainsParams.freq, this.mountainsParams.freq, blend),
        //     amp:        lerp(this.plainsParams.amp, this.mountainsParams.amp, blend),
        // }




    }

    getBiomeValue(x,z) {

        // 1) continent mask: huge landmass
        const CONTINENT_FREQ = 0.0008;
        const continentValue = (generateSimplexNoise(x * CONTINENT_FREQ, z * CONTINENT_FREQ) + 1) / 2;

        // 2) biome mask: mountains vs plains
        const BIOME_FREQ = 0.0015; // Very low frequency => large smooth regions
        let biomeValue = generateSimplexNoise(x * BIOME_FREQ, z * BIOME_FREQ);

        // 3) Blend continent into biome
        // ex, 70% biome detail, 30% continent outline
        const blendedValue = lerp(biomeValue, continentValue, 0.3); // continental influence. 0.1-05

        return blendedValue;
    }


    getBiomeWeights(x,z) {
    let weights = {};
    let total = 0;

    for (const [biome, fn] of Object.entries(this.weightFunctions)) {
        let w = fn(x,z);
        weights[biome] = w;
        total += w;
    }
    // Normalize weights
    for (const biome in weights) {
        weights[biome] /= total;
    }
    return weights;
}




}







// //#region Biome Data
// const biomeData = {
//     plains: {
//         octaves:    5,
//         lacunarity: 2.0,
//         gain:       0.5,
//         freq:       0.02,
//         amp:        4.0
//     },
//     mountains: {
//         octaves:    5,
//         lacunarity: 2.0,
//         gain:       0.4,
//         freq:       0.01,
//         amp:        80.0
//     },
//     desert: {
//         octaves:    4,
//         lacunarity: 2.0,
//         gain:       0.3,
//         freq:       0.015,
//         amp:        0.8
//     },
//     plateau: {
//         octaves:    3,
//         lacunarity: 2.0,
//         gain:       0.25,
//         freq:       0.012,
//         amp:        15.0
//     },
// }








//#region Gen Flat Grid
export function generateFlatGrid(width, depth, segmentsX, segmentsZ, offsetX, offsetZ) {

    const positions = [];
    const indices = [];
    const uvs = [];
    const biomesArray = []; // used to send to shader
    const colorsArray = [];

    const biomeBlender = new BiomeBlender();

    for (let z = 0; z <= segmentsZ; z++) {
        for (let x = 0; x <= segmentsX; x++) {

            let posX = (x / segmentsX) * width - (width / 2); // center at (0,0)
            let posZ = (z / segmentsZ) * depth - (depth / 2);

            let worldX = posX + offsetX;
            let worldZ = posZ + offsetZ;

            // passed to shader for visualization. debug only
            biomesArray.push(biomeBlender.getBiomeValue(worldX,worldZ));

            const result = biomeBlender.getBlendedNoise(worldX, worldZ);

            let y = result.noise * result.amp;


            // color map for debug rendering
            const weightsColor = biomeBlender.getColorMap(biomeBlender.getBiomeWeights(worldX, worldZ));
            colorsArray.push(...weightsColor);

            positions.push(posX, y, posZ); 

            uvs.push(x / segmentsX, z / segmentsZ);
        }        
    }

    // Generate indices for triangle strip
    for (let z = 0; z < segmentsZ; z++) {
        for (let x = 0; x < segmentsX; x++) {
            const i0 = z * (segmentsX + 1) + x;
            const i1 = i0 + 1;
            const i2 = i0 + segmentsX + 1;
            const i3 = i2 + 1;

            // First triangle
            indices.push(i0, i2, i1);
            // Second triangle
            indices.push(i1, i2, i3);
        }
    }  

    return { positions, indices, uvs, biomes: biomesArray, biomeColors: colorsArray };

}

//#region Calc Normals
export function calculateNormals(positions, indices) {
    const normals = new Array(positions.length).fill(0);

    for (let i = 0; i < indices.length; i += 3) {
        const i0 = indices[i] * 3;
        const i1 = indices[i + 1] * 3;
        const i2 = indices[i + 2] * 3;

        const v0 = [positions[i0], positions[i0 + 1], positions[i0 + 2]];
        const v1 = [positions[i1], positions[i1 + 1], positions[i1 + 2]];
        const v2 = [positions[i2], positions[i2 + 1], positions[i2 + 2]];

        const edge1 = [
            v1[0] - v0[0],
            v1[1] - v0[1],
            v1[2] - v0[2],
        ];
        const edge2 = [
            v2[0] - v0[0],
            v2[1] - v0[1],
            v2[2] - v0[2],
        ];

        // Cross product
        const nx = edge1[1] * edge2[2] - edge1[2] * edge2[1];
        const ny = edge1[2] * edge2[0] - edge1[0] * edge2[2];
        const nz = edge1[0] * edge2[1] - edge1[1] * edge2[0];

        // Accumulate to each vertex normal
        for (const idx of [i0, i1, i2]) {
            normals[idx]     += nx;
            normals[idx + 1] += ny;
            normals[idx + 2] += nz;
        }
    }

    // Normalize all normals
    for (let i = 0; i < normals.length; i += 3) {
        const nx = normals[i];
        const ny = normals[i + 1];
        const nz = normals[i + 2];
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        normals[i]     = nx / len;
        normals[i + 1] = ny / len;
        normals[i + 2] = nz / len;
    }

    return normals;
}
