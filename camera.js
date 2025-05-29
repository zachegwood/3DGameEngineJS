import { mat4, vec3, vec4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';

const canvas = document.getElementById("glcanvas");

//#region Variables

const CAMERA_SPEED = 2.0;
const MOUSE_SENSITIVITY = 0.002;

// Mouse tracking
let mouseX = 0;
let mouseY = 0;

export let yaw = 0; // rotation around Y (left/right)
export let pitch = -0.3; // rotation around X (up/down)

const MIN_PITCH = -0.7;
const MAX_PITCH = -0.2;
const MIN_FOLLOW_DIST = 3.0;
const MAX_FOLLOW_DIST = 10.0;

// let cursorTarget = 0;

let followTarget = null;
let followDistance = 8;  // positioned behind player

let cameraPosition = vec3.fromValues(0, 1, followDistance); 

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
    pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, pitch));

    // Clamp Yaw
    yaw = yaw % (2 * Math.PI);
    if (yaw < 0) yaw += 2 * Math.PI;


});

// Change zoom distance with mouse wheel
addEventListener("wheel", (e) => {
    const scroll = e.deltaY;
    followDistance += scroll * 0.01; // Adjust the multiplier for sensitivity
    followDistance = Math.max(MIN_FOLLOW_DIST, Math.min(MAX_FOLLOW_DIST, followDistance));
});


// =====================================================================
                // THE CODE
// =====================================================================

//#region Get Ray Target
export function getLookRayTarget() {

    const lookDir = vec3.set(forwardLookVector, 
        Math.cos(pitch) * Math.sin(yaw),
        Math.sin(pitch),
        -Math.cos(pitch) * Math.cos(yaw)
    );

    const rayTarget = vec3.create();
    vec3.add(rayTarget, cameraPosition, lookDir)

    return rayTarget;
}


//#region  Update Cam Pos
export function updateCameraPosition(dt, targetPos) {

    // Forward Vector

    const Fx = -Math.sin(yaw);
    const Fz = Math.cos(yaw);

    vec3.set(forwardMovementVector, Fx, 0, Fz); // this is also cam var for passing to other scripts 
    vec3.normalize(forwardMovementVector, forwardMovementVector);

    // Right Vector

    const Rx = Math.cos(yaw);
    const Rz = Math.sin(yaw);

    vec3.set(rightMovementVector, Rx, 0, Rz);
    vec3.normalize(rightMovementVector, rightMovementVector);

    // Orbit offset
    const offset = vec3.fromValues(
        Math.cos(pitch) * Math.sin(yaw),
        Math.sin(pitch),
        -Math.cos(pitch) * Math.cos(yaw)
    );
    vec3.scale(offset, offset, -followDistance); // subtract follow distance

    vec3.add(cameraPosition, targetPos, offset);
}

export function getCameraPosition() {
    return cameraPosition;
}

//#region World Raycast
export function getMouseWorldRayTarget(projectionMatrix, cameraPosition) {
    const ndcX = (mouseX / canvas.width) * 2 - 1;
    const ndcY = (mouseY / canvas.height) * -2 + 1;

    const clipNear = vec4.fromValues(ndcX, ndcY, -1.0, 1.0);
    const clipFar = vec4.fromValues(ndcX, ndcY, 1.0, 1.0);

    const forward = vec3.clone(cameraPosition);
    forward[2] -= 1;
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
