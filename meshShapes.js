import { mat4, vec3, vec4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';
import { drawWireFrameCube, wireFrameCube } from './collisions.js';


const TILE_SIZE = 1;


//#region Mesh Class
// Class: Holds a vertex buffer and model transform
class Mesh {
    constructor(gl, vertices, vertexCount, uvs = null, normals = null, aabb = null) {
        this.gl = gl;
        this.vertexCount = vertexCount;

        //this.myEntity is passed from the entity id

        // AABB Colliison Setup. aabb is sent from below in meshShapes.js, where shapes are defined ("CreateTriangle", etc)
        if (aabb) { 
            this.aabb = aabb; // just max and min
            this.collider = wireFrameCube(aabb.min, aabb.max); // returns indexes and vertecies

            // const positionBuffer = gl.createBuffer();
            // gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.collider.positions), gl.STATIC_DRAW);

            // const indexBuffer = gl.createBuffer();
            // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            // gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.collider.indices), gl.STATIC_DRAW);

            // this.collBuffers = {
            //     position: positionBuffer,
            //     index: indexBuffer,
            //     count: this.collider.indices.length,
            // }
        }

        // Position buffer
        this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
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

        //this.modelMatrix = mat4.create();
    }



    draw(shader, closeLights) {
        this.shader = shader;
        const gl = this.gl;

        const enabled = []; // track which attributes we use, so we can disable them at the end

        if (shader.attribLocations.position !== -1) {

            // Bind the vertex position buffer
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
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

        if (closeLights) shader.setLights(closeLights);

        // Pass the model matrix to the shader
        //gl.uniformMatrix4fv(shader.uniformLocations.model, false, this.modelMatrix);

        // Draw the mesh
        gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);      
        
        // Clean up: disable used attributes
        for (const loc of enabled) {
            gl.disableVertexAttribArray(loc);
        }

        // // Draw the collider
        // if (this.aabb) { 
        //     drawWireFrameCube(this.gl, shader, this.collider, this.collBuffers);  
        //     console.log(`drawing collider for ${this.myEntity}`)
        // };
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

export function createSquare(gl, size = TILE_SIZE / 2) {
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
        max: [ size, 0,  size]
    }

    return new Mesh(gl, verts, 6, uvs,  normals, aabb);
}

//#region 3D Shapes

export function createCube(gl, size = 0.5) {
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
        max: [ s,  s,  s]
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

    for (const v of data) {
        positions.push(...v.position);
        normals.push(...v.normal);
        uvs.push(...v.uv);
    }

    const count = positions.length / 3; // # of vertecies

    // return {
    //     positions,
    //     normals,
    //     uvs,
    //     count
    // };

    return new Mesh(gl, positions, count, uvs, normals);
}

