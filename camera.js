import { mat4, vec3, vec4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';

const canvas = document.getElementById("glcanvas");

//#region Variables

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

const MIN_PITCH = -0.2;
const MAX_PITCH = -0.7;
const MIN_FOLLOW_DIST = 3.0;
const MAX_FOLLOW_DIST = 10.0;

// let cursorTarget = 0;

let followTarget = null;
let followDistance = 5;  // positioned behind player

// Camera movement
let cameraX = 0;
let cameraY = 1; 
let cameraZ = followDistance; // positioned behind player

export let forwardMovementVector = vec3.create();
export let rightMovementVector = vec3.create();
export let forwardLookVector = vec3.create();




//#region Event Listeners


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

// Change zoom distance with mouse wheel
addEventListener("wheel", (e) => {
    const scroll = e.deltaY;
    followDistance += scroll * 0.01; // Adjust the multiplier for sensitivity
    followDistance = Math.max(MIN_FOLLOW_DIST, Math.min(MAX_FOLLOW_DIST, followDistance));
});





//#region Get Ray Target
export function getRayTarget() {

    
    const x = Math.cos(pitch) * Math.sin(yaw);
    const y = Math.sin(pitch);
    const z = -Math.cos(pitch) * Math.cos(yaw);    

    vec3.set(forwardLookVector, x, y, z); // set cam var for passing later

    const rayTarget = [
        cameraX + x,
        cameraY + y,
        cameraZ + z,
    ]

    return rayTarget;
}

//#region  Update Cam Pos
export function updateCameraPosition(dt, targetPos) {

    // Forward Vector

    const Fx = -Math.sin(yaw);
    const Fy = 0;
    const Fz = Math.cos(yaw);

    vec3.set(forwardMovementVector, Fx, Fy, Fz); // this is also cam var for passing to other scripts 
    vec3.normalize(forwardMovementVector, forwardMovementVector);

    // Right Vector

    const Rx = Math.cos(yaw);
    const Ry = 0;
    const Rz = Math.sin(yaw);

    vec3.set(rightMovementVector, Rx, Ry, Rz);
    vec3.normalize(rightMovementVector, rightMovementVector);

    // Orbit target

    // lock up/down look
    if (pitch > MIN_PITCH) pitch = MIN_PITCH;
    if (pitch < MAX_PITCH) pitch = MAX_PITCH;

    const offset = vec3.fromValues(
        Math.cos(pitch) * Math.sin(yaw),
        Math.sin(pitch),
        -Math.cos(pitch) * Math.cos(yaw)
    );
    vec3.scale(offset, offset, -followDistance); // subtract follow distance

    // Set camera pos relative to target
    cameraX = targetPos[0] + offset[0];
    cameraY = targetPos[1] + offset[1];
    cameraZ = targetPos[2] + offset[2];

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
