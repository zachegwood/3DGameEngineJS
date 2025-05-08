import { mat4, vec3, vec4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';

// Setup canvas
const canvas = document.getElementById("glcanvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
});


const gl = canvas.getContext("webgl");
if (!gl) throw new Error("WebGL not supported");

const debug = document.getElementById("cam_debug");

const CAMERA_SPEED = 2.0;
const MOUSE_SENSITIVITY = 0.002;
const TILE_SIZE = 1;

// Mouse tracking
let mouseX = 0;
let mouseY = 0;

let virtualCursor = [0,0]; // X/Y on smoe world plane, e.g. z=0
let lastMouseX = 0;
let lastMouseY = 0;

let yaw = 0; // rotation around Y (left/right)
let pitch = 0; // rotation around X (up/down)

let cursorTarget = 0;


// Lock cursor to brower window when clicked
canvas.addEventListener("click", () => {
    canvas.requestPointerLock();
});

canvas.addEventListener('mousemove', e => {
    if (document.pointerLockElement !== canvas) return; // dont move cam unless pointer is locked

    yaw += e.movementX * MOUSE_SENSITIVITY; // "-" makes it reversed look controls
    pitch -= e.movementY * MOUSE_SENSITIVITY; // "-" makes it reversed look controls

    const maxPitch = Math.PI / 2 - 0.01;
    pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));

    // Clamp Yaw
    if (yaw < 0) yaw += Math.PI * 2;
    if (yaw > Math.PI * 2) yaw -= Math.PI * 2

});


//#region Shaders

// Vertex shader
const vs_textureUV = `
attribute vec3 a_position;
attribute vec2 uv;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;

varying vec2 v_uv; // Passing UVs to the fragment shader

void main() {
    gl_Position = u_projection * u_view * u_model * vec4(a_position, 1.0);
    v_uv = uv; // Pass UV to fragment shader
}
`;

// Fragment shader
const fs_textureUV = `
precision mediump float;

uniform sampler2D textureSampler; // Texture Sampler

varying vec2 v_uv; // Receiving the UVs

void main() {
    gl_FragColor = texture2D(textureSampler, v_uv); // Sample texture at the given UV
}
`;

const vs_solidColor = `
    attribute vec3 a_position;

    uniform mat4 u_model;
    uniform mat4 u_view;
    uniform mat4 u_projection;

    void main() {
        gl_Position = u_projection * u_view * u_model * vec4(a_position, 1.0);
    }
`;

const fs_solidColor = `
    precision mediump float;

    uniform vec4 u_color;

    void main() {
        gl_FragColor = u_color;
    }
`;



//#region Grid Debug

function createGrid(gl, halfCount = 25, gridSquareSize = TILE_SIZE) {
    const lines = [];
    const centerLines = [];
    const step = gridSquareSize; // distance between each line
    const height = 0; // Y pos
    const fallOffRadius = halfCount/0.81;
    const radiusSquared = fallOffRadius * fallOffRadius;

    for (let i = -halfCount; i <= halfCount; i++) {
        const pos = i * step;

        // center lines. Add to diff array so we can color them differently
        if (pos === 0) {
            centerLines.push(-halfCount * step *2, height, pos, halfCount * step * 2, height, pos); // Horizontal line (along Z)
            centerLines.push(pos, height, -halfCount * step * 2, pos, height, halfCount * step * 2); // Vertical line (along X)
            continue;
        }

        // Horizontal lines
        const hStart = [-halfCount * step, height, pos];
        const hEnd = [halfCount * step, height, pos];

        // Vertical lines
        const vStart = [pos, height, -halfCount * step];
        const vEnd = [pos, height, halfCount * step];

        const hStartInRange = hStart[0] ** 2 + hStart[2] ** 2 <= radiusSquared;
        const hEndInRange = hEnd[0] ** 2 + hEnd[2] ** 2 <= radiusSquared;
        const vStartInRange = vStart[0] ** 2 + vStart[2] ** 2 <= radiusSquared;
        const vEndInRange = vEnd[0] ** 2 + vEnd[2] ** 2 <= radiusSquared;

        if (hStartInRange || hEndInRange) {
            lines.push(...hStart, ...hEnd);
        }
        if (vStartInRange || vEndInRange) {
            lines.push(...vStart, ...vEnd);
        }

        // // Horizontal lines (parallel to the Z axis)
        // lines.push(-halfCount * step, height, pos, halfCount * step, height, pos); // Horizontal lines (along Z)

        // // Vertical lines (parallel to the X axis)
        // lines.push(pos, height, -halfCount * step, pos, height, halfCount * step); // Vertical lines (along X)
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([...lines, ...centerLines]), gl.STATIC_DRAW);

    return {
        buffer,
        vertexCount: (lines.length + centerLines.length) / 3,
        centerLines: centerLines // Return the center lines as well
    };
}

const grid = createGrid(gl, 15, TILE_SIZE);

//#region Debug Ray 

const originRay = [
    0, 0, 0, // origin
    0, 10, 0 // 10 units straight up
];

const rayBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, rayBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(originRay), gl.STATIC_DRAW);




//#region CreateProgram
// Compile and link shader program
function createProgram(gl, vsSource, fsSource) {

    function compile(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(shader));
        }
        return shader;
    }

    const vs = compile(gl.VERTEX_SHADER, vsSource);
    const fs = compile(gl.FRAGMENT_SHADER, fsSource);

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program));
    }

    return program;

}

//#region Shader Class
// Class: Shader program + attribute/uniform locations
class Shader {
    constructor(gl, program) {
        this.gl = gl;
        this.program = program;
        this.attribLocations = {
            position: gl.getAttribLocation(program, "a_position"),
            uv: gl.getAttribLocation(program, "uv"), 
        };
        this.uniformLocations = {
            model: gl.getUniformLocation(program, "u_model"),
            view: gl.getUniformLocation(program, "u_view"),
            projection: gl.getUniformLocation(program, "u_projection"),
        };
    }

    use() {
        this.gl.useProgram(this.program);
    }
}

//#region Mesh Class
// Class: Holds a vertex buffer and model transform
class Mesh {
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
function createTriangle(gl) {
    const verts = [
         0.0,  0.5, 0.0,
        -0.5, -0.5, 0.0,
         0.5, -0.5, 0.0
    ];
    return new Mesh(gl, verts, 3);
}

function createSquare(gl, size = TILE_SIZE / 2) {
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

function createSquareSize(gl, size) {
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
function loadTexture(gl, url) {
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

const texture = loadTexture(gl, "testTile.png");

const programTextureUV = createProgram(gl, vs_textureUV, fs_textureUV);
const shaderTextureUV = new Shader(gl, programTextureUV);

const programSolidColor = createProgram(gl, vs_solidColor, fs_solidColor);
const shaderSolidColor = new Shader(gl, programSolidColor);


//#region Create Shapes

const triangle = createTriangle(gl);
triangle.translate(0,0,0);

const square = createSquare(gl, 1);
square.translate(0, 0, 0);

const triangle2 = createTriangle(gl);
triangle2.translate(0, 0.5, 6);



// Uniform locations
const uModelLoc = gl.getUniformLocation(programTextureUV, "u_model");
const uViewLoc = gl.getUniformLocation(programTextureUV, "u_view");
const uProjLoc = gl.getUniformLocation(programTextureUV, "u_projection");

//#region Vertices

// Vertex data (triangle + floor)
const vertices = new Float32Array([
    // Triangle
     0.0,  0.5,  0.0,
    -0.5, -0.5,  0.0,
     0.5, -0.5,  0.0,

    // Floor (2 triangles)
    -1.0, -0.5, -1.0,
     1.0, -0.5, -1.0,
    -1.0, -0.5,  1.0,
    -1.0, -0.5,  1.0,
     1.0, -0.5, -1.0,
     1.0, -0.5,  1.0
]);

const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

//#region Camera
// Camera movement
let cameraX = 0;
let cameraY = 1; 
let cameraZ = 3; // positioned behind player
const keys = {};
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

function updateCameraPosition(dt) {

    const moveForward = [
        -Math.sin(yaw),
        0,
        Math.cos(yaw)
    ];
    const moveRight = [
        Math.cos(yaw),
        0,
        Math.sin(yaw)
    ];

    vec3.normalize(moveForward, moveForward);
    vec3.normalize(moveRight, moveRight);

    if (keys["a"]) { 
        cameraX -= moveRight[0] * CAMERA_SPEED * dt;
        cameraZ -= moveRight[2] * CAMERA_SPEED * dt;
    }
    if (keys["d"]) { 
        cameraX += moveRight[0] * CAMERA_SPEED * dt;
        cameraZ += moveRight[2] * CAMERA_SPEED * dt;
    }   
    if (keys["w"]) { 
        cameraX -= moveForward[0] * CAMERA_SPEED * dt;
        cameraZ -= moveForward[2] * CAMERA_SPEED * dt;
    }   
    if (keys["s"]) { 
        cameraX += moveForward[0] * CAMERA_SPEED * dt;
        cameraZ += moveForward[2] * CAMERA_SPEED * dt;
    }   
}

function getCameraPosition() {
    return [cameraX, cameraY, cameraZ]; // cam is offset by 3 backwards
}

function getMouseWorldRayTarget(projectionMatrix, cameraPosition) {
    const ndcX = (mouseX / canvas.width) * 2 - 1;
    const ndcY = (mouseY / canvas.height) * -2 + 1;

    const clipNear = vec4.fromValues(ndcX, ndcY, -1.0, 1.0);
    const clipFar = vec4.fromValues(ndcX, ndcY, 1.0, 1.0);

    const forward = [cameraPosition[0], cameraPosition[1], cameraPosition[2] - 1];
    const viewMatrix = mat4.lookAt(mat4.create(), cameraPosition, forward, [0, 1, 0]);

    const invProj = mat4.invert(mat4.create(), projectionMatrix);
    const invView = mat4.invert(mat4.create(), viewMatrix);

    vec4.transformMat4(clipNear, clipNear, invProj);
    vec4.transformMat4(clipFar, clipFar, invProj);
    vec4.transformMat4(clipNear, clipNear, invView);
    vec4.transformMat4(clipFar, clipFar, invView);

    for (let v of [clipNear, clipFar]) {
        vec4.scale(v, v, 1 / v[3]);
    }

    return [clipFar[0], clipFar[1], clipFar[2]];
}



// Main loop
gl.enable(gl.DEPTH_TEST);
// gl.enable(gl.CULL_FACE);
// gl.cullFace(gl.BACK);

let start = performance.now();
let lastTime = start;

//#region Render Loop
function render() {

    gl.clearColor(.01, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    const angle = (now - start) * 0.001; // deterministic time step

    updateCameraPosition(dt);
    const cameraPosition = getCameraPosition();

    const projectionMatrix = mat4.perspective(mat4.create(), Math.PI / 4, canvas.width / canvas.height, 0.1, 100);
    //const rayTarget = getMouseWorldRayTarget(projectionMatrix, cameraPosition);

    const lookDirection = [
        Math.cos(pitch) * Math.sin(yaw),
        Math.sin(pitch),
        -Math.cos(pitch) * Math.cos(yaw),
    ];

    const rayTarget = [
        cameraPosition[0] + lookDirection[0],
        cameraPosition[1] + lookDirection[1],
        cameraPosition[2] + lookDirection[2],
    ]

    const viewMatrix = mat4.lookAt(mat4.create(), cameraPosition, rayTarget, [0, 1, 0]);

    debug.innerText = `
    Camera Position: (${cameraPosition.map(n => n.toFixed(2)).join(",")})
    Camera Target:   (${rayTarget.map(n => n.toFixed(2)).join(",")})
    
    Pitch: [${pitch.toFixed(2)}]   
    Yaw: [${yaw.toFixed(2)}]
    `;


    
    

    // Update transforms
    mat4.identity(triangle.modelMatrix); // reset each frame
    triangle.translate(0, 0.5, 0);
    triangle.rotateY(angle);

    mat4.identity(square.modelMatrix); // reset each frame
    square.scale(TILE_SIZE, 1.0, TILE_SIZE);
    square.translate(0,0,3);    
    //square.rotateY(angle);
    



    // Set view and projection matrices for all objects
    shaderTextureUV.use();
    gl.uniformMatrix4fv(shaderTextureUV.uniformLocations.view, false, viewMatrix);
    gl.uniformMatrix4fv(shaderTextureUV.uniformLocations.projection, false, projectionMatrix);    

    // Set texture / UV shader
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(shaderTextureUV.program, "textureSampler"), 0);

    square.draw(shaderTextureUV);

    // Solid color
    shaderSolidColor.use();
    gl.uniformMatrix4fv(shaderSolidColor.uniformLocations.view, false, viewMatrix);
    gl.uniformMatrix4fv(shaderSolidColor.uniformLocations.projection, false, projectionMatrix);

    // Set color to Green
    gl.uniform4f(gl.getUniformLocation(shaderSolidColor.program, "u_color"), 0.0, 1.0, 0.0, 1.0); // Green color

    // Bind the grid buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, grid.buffer);
    gl.enableVertexAttribArray(shaderSolidColor.attribLocations.position);
    gl.vertexAttribPointer(shaderSolidColor.attribLocations.position, 3, gl.FLOAT, false, 0, 0);

    // Identity model matrix for the grid
    gl.uniformMatrix4fv(shaderSolidColor.uniformLocations.model, false, mat4.create());

    // Draw grid (lines)
    gl.drawArrays(gl.LINES, 0, grid.vertexCount - grid.centerLines.length / 3); // all lines except last ones

    // Set color to 
    gl.uniform4f(gl.getUniformLocation(shaderSolidColor.program, "u_color"), 1.0, 1.0, 0.0, 1.0); //  color
    

    // Draw grid (center lines)
    gl.drawArrays(gl.LINES, grid.vertexCount - grid.centerLines.length  / 3, grid.centerLines.length / 3); // last lines (center)

    // Change debug color
    gl.uniform4f(gl.getUniformLocation(shaderSolidColor.program, "u_color"), 1.0, 0.0, 0.0, 1.0);

    // Draw Origin Ray
    gl.bindBuffer(gl.ARRAY_BUFFER, rayBuffer);
    gl.enableVertexAttribArray(shaderSolidColor.attribLocations.position);
    gl.vertexAttribPointer(shaderSolidColor.attribLocations.position, 3, gl.FLOAT, false, 0, 0,);
    gl.drawArrays(gl.LINES, 0, 2); // draw the two verticies as 1 line

    // Change debug color
    gl.uniform4f(gl.getUniformLocation(shaderSolidColor.program, "u_color"), 0.0, 0.0, 1.0, 1.0);

    // Draw Meshes
    triangle.draw(shaderSolidColor);    
    triangle2.draw(shaderSolidColor);

    requestAnimationFrame(render);
}

render();
