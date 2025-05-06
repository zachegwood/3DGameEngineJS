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


//     const sensitivity = 0.01; // twerk as needed
//     virtualCursor[0] += e.movementX * sensitivity;
//     virtualCursor[1] += e.movementY * sensitivity;

//     let roundedCursor = [virtualCursor[0].toFixed(2), virtualCursor[1].toFixed(2)];

//     console.log(`${roundedCursor}`);
});

// canvas.addEventListener('mousemove', e => {
//     const rect = canvas.getBoundingClientRect();
//     mouseX = e.clientX - rect.left;
//     mouseY = e.clientY - rect.top;

//     const dx = e.clientX - lastMouseX;
//     const dy = e.clientY - lastMouseY;
//     lastMouseX = e.clientX;
//     lastMouseY = e.clientY;

//     const sensitivity = 0.01; // twerk as needed
//     virtualCursor[0] += dx * sensitivity;
//     virtualCursor[1] += dx * sensitivity;
// });

// Vertex shader
const vertexSrc = `
attribute vec3 a_position;
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
void main() {
    gl_Position = uProjection * uView * uModel * vec4(a_position, 1.0);
}
`;

// Fragment shader
const fragmentSrc = `
precision mediump float;
void main() {
    gl_FragColor = vec4(1.0, 0.4, 0.2, 1.0); // orange
}
`;

// Shader utilities
function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(vsSource, fsSource) {
    const vs = compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        return null;
    }
    return program;
}

const program = createProgram(vertexSrc, fragmentSrc);
gl.useProgram(program);

// Uniform locations
const uModelLoc = gl.getUniformLocation(program, "uModel");
const uViewLoc = gl.getUniformLocation(program, "uView");
const uProjLoc = gl.getUniformLocation(program, "uProjection");

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

const positionLoc = gl.getAttribLocation(program, "a_position");
gl.enableVertexAttribArray(positionLoc);
gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);




//#region Camera
// Camera movement
let cameraX = 0;
let cameraZ = 3; // positioned behind player
const keys = {};
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

function updateCameraPosition(dt) {

    const moveForward = [
        Math.sin(yaw),
        0,
        Math.cos(yaw)
    ];
    const moveRight = [
        Math.cos(yaw),
        0,
        -Math.sin(yaw)
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
    return [cameraX, 0, cameraZ]; // cam is offset by 3 backwards
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

function drawScene() {

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

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

    const angle = (now - start) * 0.001;

    // Triangle transform
    const modelTriangle = mat4.create();
    mat4.translate(modelTriangle, modelTriangle, [0, 0.5, 6]);
    mat4.rotateY(modelTriangle, modelTriangle, angle);

    // Floor transform
    const modelFloor = mat4.create(); // Identity is fine

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 1);

    gl.uniformMatrix4fv(uViewLoc, false, viewMatrix);
    gl.uniformMatrix4fv(uProjLoc, false, projectionMatrix);

    gl.uniformMatrix4fv(uModelLoc, false, modelTriangle);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.uniformMatrix4fv(uModelLoc, false, modelFloor);
    gl.drawArrays(gl.TRIANGLES, 3, 6);

    requestAnimationFrame(drawScene);
}

drawScene();
