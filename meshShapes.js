import { mat4, vec3, vec4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';

//#region Mesh Class
// Class: Holds a vertex buffer and model transform
export class Mesh {
    constructor(gl, vertices, vertexCount, uvs = null) {
        this.gl = gl;
        this.vertexCount = vertexCount;

        this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        // UV buffer (optional)
        if (uvs) {
            this.uvBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
        }

        this.modelMatrix = mat4.create();
    }

    // Helper functions
    scale(x, y, z) { mat4.scale(this.modelMatrix, this.modelMatrix, [x, y, z]); }
    translate(x, y, z) { mat4.translate(this.modelMatrix, this.modelMatrix, [x, y, z]); }
    rotateX(angle) { mat4.rotateX(this.modelMatrix, this.modelMatrix, angle); }
    rotateY(angle) { mat4.rotateY(this.modelMatrix, this.modelMatrix, angle); }
    rotateZ(angle) { mat4.rotateZ(this.modelMatrix, this.modelMatrix, angle); }

    draw(shader) {
        const gl = this.gl;

        shader.use();

        // Bind the vertex position buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.enableVertexAttribArray(shader.attribLocations.position);
        gl.vertexAttribPointer(shader.attribLocations.position, 3, gl.FLOAT, false, 0, 0);

        // Bind UV buffer if it exists
        if (this.uvBuffer) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
            gl.enableVertexAttribArray(shader.attribLocations.uv);
            gl.vertexAttribPointer(shader.attribLocations.uv, 2, gl.FLOAT, false, 0, 0);
        }

        // Pass the model matrix to the shader
        gl.uniformMatrix4fv(shader.uniformLocations.model, false, this.modelMatrix);

        // Draw the mesh
        gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);       
    }
}

//#region Shapes Factory
// Factory: Make a triangle mesh
export function createTriangle(gl) {
    const verts = [
         0.0,  0.5, 0.0,
        -0.5, -0.5, 0.0,
         0.5, -0.5, 0.0
    ];
    return new Mesh(gl, verts, 3);
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

    //const uvScale = 10; // how many times the texture should repeat

    // const uvScale = TILE_SIZE/2;
    // const uvs = [
    //     0.0, 0.0,
    //     uvScale, 0.0,
    //     0.0, uvScale,

    //     0.0, uvScale,
    //     uvScale, 0.0,
    //     uvScale, uvScale
    // ]

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

    return new Mesh(gl, verts, 6, uvs);
}

export function createSquareSize(gl, size) {
    const verts = [
        -size, -0.5*size, -size,
        size, -0.5*size, -size,
       -size, -0.5*size,  size,
       -size, -0.5*size,  size,
       size, -0.5*size, -size,
       size, -0.5*size,  size
    ];
    return new Mesh(gl, verts, 6);
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