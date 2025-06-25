import { Entity } from '../entity.js'
import { createTerrainMesh, loadTexture } from '../meshShapes.js';
import { myShaders, workers } from '../main.js';
//import { generateSimplexNoise,  fractalNoise, fractalNoiseRaw } from './simplexNoise.js';
//import { biomeData, weightFunctions } from './TerrainBiome/biomes.js';
//import { BiomeBlender } from './biomeBlender.js';
import { debugSettings } from '../debug.js';
//import { lerp, smoothstep } from '/utils.js';

//import { VoronoiRegions } from './Voronoi.js';

import { WORLD_SCALE, CHUNK_SIZE, CHUNK_PIECES } from '/config.js'


// ProcGen Terrain


//#region Chunking


const halfPieces = CHUNK_PIECES / 2;
const mapSize = CHUNK_PIECES * CHUNK_SIZE;


const chunks = new Map();

function worldToChunkCoord(x,z) {
    return [
        Math.floor(x / CHUNK_SIZE),
        Math.floor(z / CHUNK_SIZE)
    ];
}

//const voronoi = new VoronoiRegions();

async function safeCreateLOD(gl, size, x, z, level) {
    try {
        return await createTerrainMesh(gl, size, x, z, level);
    } catch (err) {
        console.error(`LOD ${level} failed at (${x}, ${z})`, err);
        return null;
    }
}



//#region Build Terrain
export async function buildTerrain(gl) {

    const texture = loadTexture(gl, "Art/testTile.png");


    

    // build Voronoi Regions map. 
    //voronoi.generateSeeds(mapSize); // stores seeds in VoronoiRegions.seeds;
    // moved this to workerFlatGrid

    let chunkCount = 0;

    for (let x = -halfPieces; x < halfPieces; x++) {
        for (let z = -halfPieces; z < halfPieces; z++){

            chunkCount++;
            console.warn(`building chunk #${chunkCount}`);

            const worldOffsetX = x * CHUNK_SIZE * WORLD_SCALE;
            const worldOffsetZ = z * CHUNK_SIZE * WORLD_SCALE;

            //#region LODs
            // Create three Meshes of Levels of Detail, 0, 1, 2
            const lod0 = await createTerrainMesh(gl, CHUNK_SIZE, worldOffsetX, worldOffsetZ, 0); //meshShapes.js
            // const lod1 = await createTerrainMesh(gl, CHUNK_SIZE, worldOffsetX, worldOffsetZ, 1); //meshShapes.js
            // const lod2 = await createTerrainMesh(gl, CHUNK_SIZE, worldOffsetX, worldOffsetZ, 2); //meshShapes.js

//             const [lod0, lod1, lod2] = await Promise.all([
//     safeCreateLOD(gl, CHUNK_SIZE, worldOffsetX, worldOffsetZ, 0),
//     safeCreateLOD(gl, CHUNK_SIZE, worldOffsetX, worldOffsetZ, 1),
//     safeCreateLOD(gl, CHUNK_SIZE, worldOffsetX, worldOffsetZ, 2),
// ]);


            if (lod0 === undefined) { console.log(`undefined mesh in BuildTerrain - terrain.js`); return; }

            const terrainChunk = new Entity(
                {
                    mesh: lod0,
                    position: [worldOffsetX, 0, worldOffsetZ],
                    shader: myShaders.Lighting,
                    texture: texture,
                    id: `terrain_chunk_${x},${z}`,
                });
            
                //terrainChunk.setLODs([lod0, lod1, lod2]);
                terrainChunk.setLODs([lod0]);

            chunks.set(`${x},${z}`, terrainChunk);

            //console.log(`${terrainChunk.id} -->  ${terrainChunk.position}`);
        }   
    }

    console.warn(`- Finished Building Terrain Chunks -`);

    return chunks;
}





//#region Gen Flat Grid
// will be returned in meshShapes.js [createTerrainMesh()] as terrainInfo
export async function generateFlatGridAsync(width, depth, segmentsX, segmentsZ, offsetX, offsetZ) {

    const worker = workers.worker_flatGrid;


    return new Promise((resolve) => {
        worker.onmessage = (e) => {
            const { positions, indices, uvs, biomes, biomeColors, yMax, yMin, seeds, biomeCount } = e.data;
            resolve({
                positions,
                indices,
                uvs,
                biomes,
                biomeColors,
                yMax,
                yMin,
                seeds,
                biomeCount
            });
        };

        worker.postMessage({
            width,
            depth,
            segmentsX,
            segmentsZ,
            offsetX,
            offsetZ,
            debugBiomeColors: debugSettings.BIOME_COLORS,
            mapSize
        });
    });
}



//#region Calc Normals
export function calculateNormalsAsync(positions, indices) {
    return new Promise((resolve, reject) => {

        // worker is stored in main.js obj as workers.worker_normals
        const worker = workers.worker_normals; 

        
        //console.log(`workers test: ${worker}`);

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

