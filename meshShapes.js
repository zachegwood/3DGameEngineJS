import { mat4, vec3, vec4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';
import { drawWireFrameCube, findWireFrameCube } from './collisions.js';
import { generateFlatGridAsync, calculateNormalsAsync } from './TerrainBiome/terrain.js';
import { addToRaycast } from './main.js';
import { WORLD_SCALE } from '/config.js'
import { biomeDebugOverlay } from './debug.js';

const TILE_SIZE = 1;

//#region Mesh Class
// Class: Holds a vertex buffer and model transform
class Mesh {
    constructor(
        gl, 
        vertices, vertexCount, uvs = null, normals = null, aabb = null, indices = null, 
        biomes = null, biomeColors = null, seeds = null,
    ) {
        this.gl = gl;
        this.vertexCount = vertexCount;

        this.useIndices = !!indices; // set to true below if indicies are passed in

        //this.myEntity is passed from the entity id

        // AABB Colliison Setup. aabb is sent from below in meshShapes.js, where shapes are defined ("CreateTriangle", etc)
        if (aabb) { 
            this.aabb = aabb; // just max and min
            this.collider = findWireFrameCube(aabb.min, aabb.max); // returns indexes and vertecies
        }

        // Position buffer
        this.positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        // UV buffer (optional)
        if (uvs) {
            this.uvBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
        }

        // Normal buffer (optional)
        if (normals) {
            this.normalBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
        }

        if (indices) {
            this.indexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
            this.indexCount = indices.length;
            this.useIndices = true;
        }

        if (biomes) {       

            this.biomesBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.biomesBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(biomes), gl.STATIC_DRAW);
        }

        if (biomeColors) {

            this.biomeColorsBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.biomeColorsBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(biomeColors), gl.STATIC_DRAW);
        }


    }


    //#region Draw
    draw(shader, closeLights) {
        this.shader = shader;
        const gl = this.gl;

        const enabled = []; // track which attributes we use, so we can disable them at the end

        if (shader.attribLocations.position !== -1) {

            // Bind the vertex position buffer
            gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
            gl.enableVertexAttribArray(shader.attribLocations.position);
            gl.vertexAttribPointer(shader.attribLocations.position, 3, gl.FLOAT, false, 0, 0);
            enabled.push(shader.attribLocations.position);
        }

        if (shader.attribLocations.uv !== -1 && this.uvBuffer) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
            gl.enableVertexAttribArray(shader.attribLocations.uv);
            gl.vertexAttribPointer(shader.attribLocations.uv, 2, gl.FLOAT, false, 0, 0);
            enabled.push(shader.attribLocations.uv);
        } 

        if (shader.attribLocations.normal !== -1 && this.normalBuffer) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
            gl.enableVertexAttribArray(shader.attribLocations.normal);
            gl.vertexAttribPointer(shader.attribLocations.normal, 3, gl.FLOAT, false, 0, 0);
            enabled.push(shader.attribLocations.normal);
        } 

        if (shader.attribLocations.a_biome !== -1 && this.biomesBuffer) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.biomesBuffer);
            gl.enableVertexAttribArray(shader.attribLocations.a_biome);
            gl.vertexAttribPointer(shader.attribLocations.a_biome, 1, gl.FLOAT, false, 0, 0);
            enabled.push(shader.attribLocations.a_biome);
        }

        if (shader.attribLocations.a_biomeColors !== -1 && this.biomeColorsBuffer) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.biomeColorsBuffer);
            gl.enableVertexAttribArray(shader.attribLocations.a_biomeColors);
            gl.vertexAttribPointer(shader.attribLocations.a_biomeColors, 3, gl.FLOAT, false, 0, 0);
            enabled.push(shader.attribLocations.a_biomeColors);
        }


        if (closeLights) shader.setLights(closeLights);

        // Pass the model matrix to the shader
        //gl.uniformMatrix4fv(shader.uniformLocations.model, false, this.modelMatrix);

        // Are we using Vertices or Indices?

        if (this.useIndices === true) {

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);

        } else {

            // Draw the mesh
            gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);     

        }
        
        // Clean up: disable used attributes
        for (const loc of enabled) {
            gl.disableVertexAttribArray(loc);
        }
    }
}

//#region 2D Shapes
// Factory: Make a triangle mesh
export function createTriangle(gl, size = TILE_SIZE / 2) {
    const verts = [
         0.0,  size, 0.0,
        -size, -size, 0.0,
         size, -size, 0.0
    ];
    const uvs = [
        0.5, 1.0,   // top
        0.0, 0.0,   // bottom left
        1.0, 0.0    // bottom right
    ];
    const aabb = {
        min: [-size, -size, 0],
        max: [ size,  size, 0]
    }

    return new Mesh(gl, verts, 3, uvs, null, aabb);
}

export function createSphere(radius) {
    const latBands = 10;
    const longBands = 10;
    const positions = [];
    const indices = [];

    // Generate vertices
    for (let i = 0; i <= latBands; i++) {
        const phi = (i / latBands) * Math.PI;
        for (let j = 0; j <= longBands; j++) {
            const theta = (j / longBands) * 2 * Math.PI;

            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.cos(phi);
            const z = radius * Math.sin(phi) * Math.sin(theta);

            positions.push(x, y, z);
        }
    }

    // Generate indices for lines
    for (let i = 0; i < latBands; i++) {
        for (let j = 0; j < longBands; j++) {
            const first = i * (longBands + 1) + j;
            const second = first + longBands + 1;

            // horizontal (longitude)
            indices.push(first, first + 1);

            // vertical (latitude)
            indices.push(first, second);
        }
    }

    return {
        positions: positions,
        indices: indices
    };
}

//#region Square
export function createSquare(gl, size = TILE_SIZE / 2, colType = `collider`) {

    const verts = [
        -size, 0, -size,  // bottom left
         size, 0, -size,  // bottom right
        -size, 0,  size,  // top left

        -size, 0,  size,  // top left
         size, 0, -size,  // bottom right
         size, 0,  size   // top right
    ];

    // Adjust the UV coordinates based on the size of the square
    const uvScale = size;  // size for texture repetition
    const uvs = [
        0.0, 0.0,
        uvScale, 0.0,
        0.0, uvScale,

        0.0, uvScale,
        uvScale, 0.0,
        uvScale, uvScale
    ];

    // All normals point straight up (0, 1, 0) for a flat horizontal surface
    const normals = [
        0, 1, 0,  0, 1, 0,  0, 1, 0,
        0, 1, 0,  0, 1, 0,  0, 1, 0
    ]

    const aabb = {
        min: [-size, 0, -size],
        max: [ size, 0,  size],
        colType // collider, trigger, etc
    }

    return new Mesh(gl, verts, 6, uvs,  normals, aabb);
}

//#region 3D Shapes

export function createCube(gl, size = 0.5, colType = `collider`) {
    const s = size;

    // 6 faces * 2 triangles per face * 3 vertices per triangle = 36 vertices
    const positions = [
        // Front (+Z)
        -s, -s,  s,   s, -s,  s,   s,  s,  s,
        -s, -s,  s,   s,  s,  s,  -s,  s,  s,

        // Back (-Z)
         s, -s, -s,  -s, -s, -s,  -s,  s, -s,
         s, -s, -s,  -s,  s, -s,   s,  s, -s,

        // Top (+Y)
        -s,  s,  s,   s,  s,  s,   s,  s, -s,
        -s,  s,  s,   s,  s, -s,  -s,  s, -s,

        // Bottom (-Y)
        -s, -s, -s,   s, -s, -s,   s, -s,  s,
        -s, -s, -s,   s, -s,  s,  -s, -s,  s,

        // Right (+X)
         s, -s,  s,   s, -s, -s,   s,  s, -s,
         s, -s,  s,   s,  s, -s,   s,  s,  s,

        // Left (-X)
        -s, -s, -s,  -s, -s,  s,  -s,  s,  s,
        -s, -s, -s,  -s,  s,  s,  -s,  s, -s,
    ];

    const uvs = [
        // Repeated per face (6 faces)
        0, 0, 1, 0, 1, 1,
        0, 0, 1, 1, 0, 1,

        0, 0, 1, 0, 1, 1,
        0, 0, 1, 1, 0, 1,

        0, 0, 1, 0, 1, 1,
        0, 0, 1, 1, 0, 1,

        0, 0, 1, 0, 1, 1,
        0, 0, 1, 1, 0, 1,

        0, 0, 1, 0, 1, 1,
        0, 0, 1, 1, 0, 1,

        0, 0, 1, 0, 1, 1,
        0, 0, 1, 1, 0, 1,
    ];

    const normals = [
        // Front (+Z)
        0, 0, 1,   0, 0, 1,   0, 0, 1,
        0, 0, 1,   0, 0, 1,   0, 0, 1,

        // Back (-Z)
        0, 0, -1,  0, 0, -1,  0, 0, -1,
        0, 0, -1,  0, 0, -1,  0, 0, -1,

        // Top (+Y)
        0, 1, 0,   0, 1, 0,   0, 1, 0,
        0, 1, 0,   0, 1, 0,   0, 1, 0,

        // Bottom (-Y)
        0, -1, 0,  0, -1, 0,  0, -1, 0,
        0, -1, 0,  0, -1, 0,  0, -1, 0,

        // Right (+X)
        1, 0, 0,   1, 0, 0,   1, 0, 0,
        1, 0, 0,   1, 0, 0,   1, 0, 0,

        // Left (-X)
        -1, 0, 0,  -1, 0, 0,  -1, 0, 0,
        -1, 0, 0,  -1, 0, 0,  -1, 0, 0,
    ];

    const aabb = {
        min: [-s, -s, -s],
        max: [ s,  s,  s],
        colType // collider, trigger, etc
    }

    return new Mesh(gl, positions, 36, uvs, normals, aabb);
}


//#region Load Texture
export function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Temporary 1px texture while loading
    const pixel = new Uint8Array([255, 255, 255, 255]); // white
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
                    gl.RGBA, gl.UNSIGNED_BYTE, pixel);

    const image = new Image();
    image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
                        gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.generateMipmap(gl.TEXTURE_2D);
    };
    image.src = url;

    return texture;
}

//#region Process Blender
export async function loadModel(gl, url) {

    // Load from JSON
    const response = await fetch(url);
    const data = await response.json(); // an array of [x, y, z]
    //return data;

    // Process JSON
    const positions = [];
    const normals = [];
    const uvs = [];

    // Initialize AABB min/max with extreme values
    const aabb = {
        min: vec3.fromValues(Infinity, Infinity, Infinity),
        max: vec3.fromValues(-Infinity, -Infinity, -Infinity)
    }

    for (const v of data) {
        positions.push(...v.position);
        normals.push(...v.normal);
        uvs.push(...v.uv);

        // Update AABB
        vec3.min(aabb.min, aabb.min, v.position);
        vec3.max(aabb.max, aabb.max, v.position);
    }

    const count = positions.length / 3; // # of vertecies

    return new Mesh(
        gl, 
        positions, 
        count, 
        uvs, 
        normals, 
        aabb
    );
}


let alreadyDrawnVoronoiSeedRays = false;

//#region TerrainMesh
export async function createTerrainMesh(gl, chunkSize, worldOffsetX, worldOffsetZ, lod) {

    let segments = 10;

    if (lod) {
        if (lod === 1) segments = Math.floor(segments / 2);
        else if (lod === 2) segments = Math.floor(segments / 4);
    }

    // generate flat terrain using a webworker (workerFlatGrid.js)
    const terrainInfo = await generateFlatGridAsync(
        chunkSize, chunkSize, 
        segments, segments,
        worldOffsetX, worldOffsetZ
    ); // from terrain.js

    biomeDebugOverlay(terrainInfo.biomeCount);


    
    // calculate normals using a webworker (workerNormals.js)
    const normals = await calculateNormalsAsync(terrainInfo.positions, terrainInfo.indices); // from terrain.js

    const s = (chunkSize * WORLD_SCALE) / 2; // size
   
    const aabb = {
        min: [-s, terrainInfo.yMin, -s],
        max: [ s,  terrainInfo.yMax,  s],
        colType: 'trigger'
    }

    if (alreadyDrawnVoronoiSeedRays === false) {
        alreadyDrawnVoronoiSeedRays = true;
        for (let i = 0; i < terrainInfo.seeds.length; i++) {

            const seed = terrainInfo.seeds[i];
            let streamDir = [seed.x, seed.elevation, seed.z];
            if (seed.downstreamSeed !== null) {
                streamDir = [
                    seed.downstreamSeed.x -         seed.x,
                    seed.downstreamSeed.elevation - seed.elevation,
                    seed.downstreamSeed.z -         seed.z                   
                ]

            }

            const seedRay = {
                origin: [seed.x, seed.elevation, seed.z],
                direction: [0,1,0],
                length: 10,
                color: [1,0,0],
            }
            addToRaycast(seedRay);

            const flowRay = {                
                
                origin: [seed.x, seed.elevation, seed.z],
                direction: streamDir,
                length: seed.flow.magnitude*10,
                color: [1,1,1],
            }
            addToRaycast(flowRay);
        }
    }

    return new Mesh(
        gl, 
        terrainInfo.positions, 
        (terrainInfo.positions.length / 3), 
        terrainInfo.uvs, 
        normals, 
        aabb, 
        terrainInfo.indices,
        terrainInfo.biomes, // added for visualization
        terrainInfo.biomeColors, // added for visualization
    );

}