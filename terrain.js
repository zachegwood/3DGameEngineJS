import { Entity } from './entity.js'
import { createTerrainMesh, loadTexture } from './meshShapes.js';
import { myShaders } from './main.js';
import { generateSimplexNoise,  } from './simplexNoise.js';



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



    const CHUNK_PIECES = 4;
    const halfPieces = CHUNK_PIECES / 2;
    const texture = loadTexture(gl, "Art/testTile.png");

    for (let x = -halfPieces; x < halfPieces; x++) {
        for (let z = -halfPieces; z < halfPieces; z++){

            const terrainChunk = new Entity(
                {
                    mesh: createTerrainMesh(gl, CHUNK_SIZE), 
                    position: [x*CHUNK_SIZE, 0, z*CHUNK_SIZE],
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






//#region Gen Flat Grid
export function generateFlatGrid(width, depth, segmentsX, segmentsZ) {

    const positions = [];
    const indices = [];
    const uvs = [];

    const scale = 0.1; // controls "zoom level" of noise
    const amplitude = 6.0; // controls vertical exaggeration    

    for (let z = 0; z <= segmentsZ; z++) {
        for (let x = 0; x <= segmentsX; x++) {

            let posX = (x / segmentsX) * width - (width / 2); // center at (0,0)
            let posZ = (z / segmentsZ) * depth - (depth / 2);

            let worldX = posX + offsetX;
            let worldZ = posZ + offsetZ;

            let y = generateSimplexNoise(worldX * scale, worldZ * scale) * amplitude;

            //let y = Math.random() * 6;
            positions.push(posX, y, posZ); 

            //positions.push(posX, 0, posZ); // y = 0 for now
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

    return { positions, indices, uvs };

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
