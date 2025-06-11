import { Entity } from './entity.js'
import { createTerrainMesh, loadTexture } from './meshShapes.js';
import { myShaders, workers } from './main.js';
import { generateSimplexNoise,  fractalNoise, fractalNoiseRaw } from './simplexNoise.js';
import { biomeData, weightFunctions } from './biomes.js';
import { debugSettings } from './debug.js';


//#region Lerp / Smooth
export function lerp (a, b, t) {
    return a + t * (b - a);
}

export function smoothstep(edge0, edge1, x) {
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
export async function buildTerrain(gl) {

    const CHUNK_PIECES = 20;
    const halfPieces = CHUNK_PIECES / 2;
    const texture = loadTexture(gl, "Art/testTile.png");

    for (let x = -halfPieces; x < halfPieces; x++) {
        for (let z = -halfPieces; z < halfPieces; z++){

            const worldOffsetX = x * CHUNK_SIZE;
            const worldOffsetZ = z * CHUNK_SIZE;

            const newMesh = await createTerrainMesh(gl, CHUNK_SIZE, worldOffsetX, worldOffsetZ);

            if (newMesh === undefined) { console.log(`undefined mesh on ___`); return; }

            const terrainChunk = new Entity(
                {
                    mesh: newMesh,
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
    constructor(data, functions) {              

        // configs in from biomes.js
        this.biomeData = data;
        this.weightFunctions = functions();        
    }

    getHeight(x, z) {
    // Compute blended parameters and weights as before.
    const { params, weights } = this.getInterpolatedParams(x, z, this.biomeData);
    let rawNoise = fractalNoise(params);

    // Define your plateau parameters.
    const plateauThreshold = 0.55;         // If plateau weight exceeds this, force it.
    const plateauConstantValue = 0.5;       // The flat noise value you want for plateaus.
    
    let finalNoise;
    if (weights.plateau > plateauThreshold) {
        // If plateau dominates, override the noisy value completely.
        finalNoise = plateauConstantValue;
        } else {
            // Otherwise, linearly blend between the raw noise and the plateau constant.
            // You can adjust the blending curve as needed.
            let t = weights.plateau / plateauThreshold; 
            finalNoise = (1 - t) * rawNoise + t * plateauConstantValue;
        }

        return { noise: finalNoise, amp: params.amp };
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

        //console.log(`plateau is ${weights.plateau}`);

        for (const biome in biomeParams) {
            let w = weights[biome] || 0;
            let params = biomeParams[biome];
            
            interpolated.octaves    += params.octaves * w;
            interpolated.lacunarity += params.lacunarity * w;
            interpolated.gain       += params.gain * w;
            interpolated.freq       += params.freq * w;
            interpolated.amp        += params.amp * w;
        }

        return { params: interpolated, weights: weights };

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
        const v = this.getBiomeValue(x,z);
        let weights = {};
        let total = 0;

        for (const [biome, fn] of Object.entries(this.weightFunctions)) {
            let w = fn(v);
            weights[biome] = w;
            total += w;
        }
        // Normalize weights
        if (total > 0) {
            for (const biome in weights) {
                weights[biome] /= total;
            }
        }   
        return weights;
    }


}




//#region Gen Flat Grid
export function generateFlatGrid(width, depth, segmentsX, segmentsZ, offsetX, offsetZ) {

    const positions = [];
    const indices = [];
    const uvs = [];
    const biomesArray = []; // used to send to shader
    const colorsArray = [];

    const biomeBlender = new BiomeBlender(biomeData, weightFunctions); // configs in from biomes.js

    for (let z = 0; z <= segmentsZ; z++) {
        for (let x = 0; x <= segmentsX; x++) {

            let posX = (x / segmentsX) * width - (width / 2); // center at (0,0)
            let posZ = (z / segmentsZ) * depth - (depth / 2);

            let worldX = posX + offsetX;
            let worldZ = posZ + offsetZ;

            // passed to shader for visualization. debug only
            biomesArray.push(biomeBlender.getBiomeValue(worldX,worldZ));

            const result = biomeBlender.getHeight(worldX, worldZ);

            let y = result.noise * result.amp;

            // color map for debug rendering
            if (debugSettings.BIOME_COLORS) {
                const weightsColor = biomeBlender.getColorMap(biomeBlender.getBiomeWeights(worldX, worldZ));
                colorsArray.push(...weightsColor);
            }

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
export function calculateNormalsAsync(positions, indices) {
    return new Promise((resolve, reject) => {

        // worker is stored in main.js obj as workers.worker_normals
        const worker = workers.worker_normals; 

        
        console.log(`workers test: ${worker}`);

        //const worker = new Worker('./workerNormals.js', { type: 'module' });

        worker.onmessage = (e) => {
            resolve(e.data); // e.data is the normals array
            //worker.terminate();
        };

        worker.onerror = (err) => {
            reject(err);
            worker.terminate();
        };

        worker.postMessage({ positions, indices });
    });
}


// export function calculateNormals(positions, indices) {
//     const normals = new Array(positions.length).fill(0);

//     for (let i = 0; i < indices.length; i += 3) {
//         const i0 = indices[i] * 3;
//         const i1 = indices[i + 1] * 3;
//         const i2 = indices[i + 2] * 3;

//         const v0 = [positions[i0], positions[i0 + 1], positions[i0 + 2]];
//         const v1 = [positions[i1], positions[i1 + 1], positions[i1 + 2]];
//         const v2 = [positions[i2], positions[i2 + 1], positions[i2 + 2]];

//         const edge1 = [
//             v1[0] - v0[0],
//             v1[1] - v0[1],
//             v1[2] - v0[2],
//         ];
//         const edge2 = [
//             v2[0] - v0[0],
//             v2[1] - v0[1],
//             v2[2] - v0[2],
//         ];

//         // Cross product
//         const nx = edge1[1] * edge2[2] - edge1[2] * edge2[1];
//         const ny = edge1[2] * edge2[0] - edge1[0] * edge2[2];
//         const nz = edge1[0] * edge2[1] - edge1[1] * edge2[0];

//         // Accumulate to each vertex normal
//         normals[i0] += nx; normals[i0 + 1] += ny; normals[i0 + 2] += nz;
//         normals[i1] += nx; normals[i1 + 1] += ny; normals[i1 + 2] += nz;
//         normals[i2] += nx; normals[i2 + 1] += ny; normals[i2 + 2] += nz;

//     }

//     // Normalize all normals
//     for (let i = 0; i < normals.length; i += 3) {
//         const nx = normals[i];
//         const ny = normals[i + 1];
//         const nz = normals[i + 2];
//         const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
//         normals[i]     = nx / len;
//         normals[i + 1] = ny / len;
//         normals[i + 2] = nz / len;
//     }

//     return normals;
// }
