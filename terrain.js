import { Entity } from './entity.js'
import { createTerrainMesh, loadTexture } from './meshShapes.js';
import { myShaders } from './main.js';
import { generateSimplexNoise,  fractalNoise, fractalNoiseRaw } from './simplexNoise.js';



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

    const CHUNK_PIECES = 50;
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


//#region Biomes
// Low-frequency noise determines the biome type (0 = plains, 1 = mountains)
function getBiomeValue(x,z) {

    // 1) continent mask: huge landmass
    const CONTINENT_FREQ = 0.0008;
    const continentValue = (generateSimplexNoise(x * CONTINENT_FREQ, z * CONTINENT_FREQ) + 1) / 2;

    // 2) biome mask: mountains vs plains
    const BIOME_FREQ = 0.0015; // Very low frequency => large smooth regions
    let biomeValue = generateSimplexNoise(x * BIOME_FREQ, z * BIOME_FREQ);

    // const minFloor = (1 - continentValue) * 0.1;
    // return minFloor + continentValue * (biomeValue - minFloor);

    // 3) Blend continent into biome
    // ex, 70% biome detail, 30% continent outline
    const blendedValue = lerp(biomeValue, continentValue, 0.3); // continental influence. 0.1-05

    return blendedValue;
    //return (blendedValue + 1) / 2;

    // Normalize from -1..1 to 0..1
    //return (value + 1) / 2;

}

//#region Lerp
function lerp (a, b, t) {
    return a + t * (b - a);
}

function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

//#region Biome Data
const biomeData = {
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
    }
}


//#region Biome Params
function getBiomeParameters(biome) {

    // // Define extremes
    // const plains = {
    //     octaves:    5,
    //     lacunarity: 2.0,
    //     gain:       0.5,
    //     freq:       0.02,
    //     amp:        4.0
    // };

    // const mountains = {
    //     octaves:    5,
    //     lacunarity: 2.0,
    //     gain:       0.4,
    //     freq:       0.01,
    //     amp:        20.0
    // };

    const plains = biomeData.plains;
    const mountains = biomeData.mountains;

    // Interpolate
    return {
        x: 0, z: 0, // filled in later
        octaves: lerp(plains.octaves, mountains.octaves, biome),
        lacunarity: lerp(plains.lacunarity, mountains.lacunarity, biome),
        gain:       lerp(plains.gain,       mountains.gain,       biome),
        freq:       lerp(plains.freq,       mountains.freq,       biome),
        amp:        lerp(plains.amp,        mountains.amp,        biome)
    };
}






//#region Gen Flat Grid
export function generateFlatGrid(width, depth, segmentsX, segmentsZ, offsetX, offsetZ) {

    const positions = [];
    const indices = [];
    const uvs = [];
    const biomes = []; // used to send to shader

    const scale = 0.1; // controls "zoom level" of noise  

    // If you want “continents” or larger features, you might
    // use a very low base scale (e.g. 0.001), then let fBm handle the rest.
    // In practice, you can just multiply worldX/worldZ by a single base scale:
    //const baseScale = 0.005;  // tweak until you see rolling hills rather than tiny bumps
    //const amplitude = 20.0;   // overall vertical exaggeration (max height)
        //  move this to below

    // fBm parameters:
    // const OCTAVES     = 5;
    // const LACUNARITY  = 2.0;
    // const GAIN        = 0.5;

    for (let z = 0; z <= segmentsZ; z++) {
        for (let x = 0; x <= segmentsX; x++) {

            let posX = (x / segmentsX) * width - (width / 2); // center at (0,0)
            let posZ = (z / segmentsZ) * depth - (depth / 2);

            let worldX = posX + offsetX;
            let worldZ = posZ + offsetZ;

            // Get biome value at this position (0 = plains, 1 = mountains)
            // allows smooth map variation
            const biomeRaw = getBiomeValue(worldX, worldZ);
            biomes.push(biomeRaw);
            
            let biome = smoothstep(0.3, 0.7, biomeRaw);

            // const biomeParameters = getBiomeParameters(biome);
            // biomeParameters.x = worldX;
            // biomeParameters.z = worldZ;

            //let noiseValue = fractalNoise(biomeParameters); // the actual algorithm


            let plainsParams = {x: worldX, z: worldZ, ...biomeData.plains};
            let mountainsParams = {x: worldX, z: worldZ, ...biomeData.mountains};


            let plainsNoise = (fractalNoise(plainsParams));
            let mountainsNoise = (fractalNoise(mountainsParams));
            let noiseValue = lerp(plainsNoise, mountainsNoise, biome);
            let blendedAmp = lerp(biomeData.plains.amp, biomeData.mountains.amp, biome);
            
            let y = noiseValue * blendedAmp;


            // let normalized = (noiseValue + 1) * 0.5;
            // let smoothed = Math.pow(normalized, 1.2); // flattens peaks
            // let y = smoothed * biomeParameters.amp * 2 - biomeParameters.amp;


            // choose noise parameters based on biome
            // const plainsFreqency =      0.02;
            // const mountainsFrequency =  0.005;
            // const plainsAmp =           4.0;
            // const mountainsAmp =        25.0;

            // const frequency = lerp(plainsFreqency, mountainsFrequency, biome);
            // const amplitude = lerp(plainsAmp, mountainsAmp, biome);

   

            // if (biome < 0.33) {

            //     biomeParameters = {
            //         x: worldX,
            //         z: worldZ,
            //         octaves: 4,
            //         lacunarity: 2,
            //         gain: 0.5,
            //         freq: 0.02,
            //         amp: 2.0
            //     }

            // } else if (biome < 0.66) {

            //     biomeParameters = {
            //         x: worldX,
            //         z: worldZ,
            //         octaves: 5,
            //         lacunarity: 2.2,
            //         gain: 0.55,
            //         freq: 0.02,
            //         amp: 6.0
            //     }

            // } else {

            //     biomeParameters = {
            //         x: worldX,
            //         z: worldZ,
            //         octaves: 6,
            //         lacunarity: 2.5,
            //         gain: 0.6,
            //         freq: 0.01,
            //         amp: 25.0
            //     }

            // }

            // let noiseValue = fractalNoise(biomeParameters);

            // Sample fractal noise at (worldX, worldZ):
            // let noiseValue = fractalNoise(
            //     worldX * baseScale,
            //     worldZ * baseScale,
            //     OCTAVES, LACUNARITY, GAIN,
            //     frequency, amplitude
            // );
           // noiseValue ∈ approximately [−1 … +1]

            // Optionally “lift” the range to [0…1] if it’s easier to shape:
            // let normalized = (noiseValue + 1) * 0.5; // ∈ [0…1]
            // Then you could e.g. apply a curve (normalized**1.2) to flatten plateaus.

            //let y = noiseValue * amplitude;
            //let y = noiseValue;
            //let y = noiseValue * biomeParameters.amp;
            //let y = generateSimplexNoise(worldX * scale, worldZ * scale) * amplitude;
            //let y = Math.random() * 6;
            //let y = biome * 10;

            //y = biome * 30;

            positions.push(posX, y, posZ); 
            //positions.push(posX, 0, posZ); // y = 0 for now

            uvs.push(x / segmentsX, z / segmentsZ);
            //uvs.push(x / segmentsX, biome); // <- use biome as UV.v
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

    return { positions, indices, uvs, biomes };

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
