import { mat4, vec3, vec4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';

const canvas = document.getElementById("glcanvas");

const CAMERA_SPEED = 2.0;
const MOUSE_SENSITIVITY = 0.002;

// Mouse tracking
let mouseX = 0;
let mouseY = 0;

// let virtualCursor = [0,0]; // X/Y on smoe world plane, e.g. z=0
// let lastMouseX = 0;
// let lastMouseY = 0;

export let yaw = 0; // rotation around Y (left/right)
export let pitch = 0; // rotation around X (up/down)

// let cursorTarget = 0;


// Camera movement
let cameraX = 0;
let cameraY = 1; 
let cameraZ = 3; // positioned behind player

const keys = {};
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

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

//#region Get Ray Target
export function getRayTarget() {

    const lookDirection = [
        Math.cos(pitch) * Math.sin(yaw),
        Math.sin(pitch),
        -Math.cos(pitch) * Math.cos(yaw),
    ];

    const rayTarget = [
        cameraX + lookDirection[0],
        cameraY + lookDirection[1],
        cameraZ + lookDirection[2],
    ]

    return rayTarget;
}

//#region  Update Cam Pos
export function updateCameraPosition(dt) {

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

export function getCameraPosition() {
    return [cameraX, cameraY, cameraZ]; // cam is offset by 3 backwards
}

//#region World Raycast
export function getMouseWorldRayTarget(projectionMatrix, cameraPosition) {
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
