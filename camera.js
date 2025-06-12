import { mat4, vec3, vec4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';
import { unPauseGame } from './main.js';

//const canvas = document.getElementById("glcanvas");

export class Camera {

    constructor(canvas, followTarget = null, config = {}) {

        this.id = config.id ?? "new_camera";

        //console.log(this.id);

        this.canvas = canvas;

        this.CAMERA_SPEED = config.CAMERA_SPEED ?? 2.0;
        this.MOUSE_SENSITIVITY = 0.002;

        this.MIN_PITCH = config.MIN_PITCH ?? -0.7;
        this.MAX_PITCH = config.MAX_PITCH ?? -0.2;
        this.MIN_FOLLOW_DIST = config.MIN_FOLLOW_DIST ?? 3.0;
        this.MAX_FOLLOW_DIST = config.MAX_FOLLOW_DIST ?? 100.0; // should be 10.0 unless debugging

        this.yaw = config.yaw ?? 0; // rotation around Y (left/right)
        this.pitch = -0.3 // rotation around X (up/down)

        // mouse tracking
        this.mouseX = 0;
        this.mouseY = 0;

        this.followTarget = followTarget;
        this.followDistance = config.followDistance ?? 20; // positioned behind player

        this.position = config.position ?? vec3.fromValues(0, 1, this.followDistance); 
        this.forwardMovementVector = vec3.create();
        this.rightMovementVector = vec3.create();
        this.forwardLookVector = vec3.create();

        this._bindEvents();

    }

    _bindEvents() {
        //#region Event Listeners

        // Lock cursor to brower window when clicked
        this.canvas.addEventListener("click", () => {
            this.canvas.requestPointerLock();
            unPauseGame();
        });

        this.canvas.addEventListener('mousemove', e => {

            if (document.pointerLockElement !== this.canvas) return; // dont move cam unless pointer is locked

            this.yaw += e.movementX * this.MOUSE_SENSITIVITY; // "-" makes it reversed look controls
            this.pitch -= e.movementY * this.MOUSE_SENSITIVITY; // "-" makes it reversed look controls

            this.mouseX = e.clientX;
            this.mouseY = e.clientY;

            const maxPitch = Math.PI / 2 - 0.01;
            this.pitch = Math.max(this.MIN_PITCH, Math.min(this.MAX_PITCH, this.pitch));

            // Clamp Yaw
            this.yaw = this.yaw % (2 * Math.PI);
            if (this.yaw < 0) this.yaw += 2 * Math.PI;

        });

        // Change zoom distance with mouse wheel
        this.canvas.addEventListener("wheel", (e) => {
            // const scroll = e.deltaY;
            // followDistance += scroll * 0.01; // Adjust the multiplier for sensitivity
            // followDistance = Math.max(MIN_FOLLOW_DIST, Math.min(MAX_FOLLOW_DIST, followDistance));

            const scroll = e.deltaY;
            this.followDistance += scroll * 0.01; // Adjust the multiplier for sensitivity
            this.followDistance = Math.max(this.MIN_FOLLOW_DIST, Math.min(this.MAX_FOLLOW_DIST, this.followDistance));
        });
    }

    //#region View Matrix
    getViewMatrix() {
        const target = this.getLookRayTarget();
        const up = [0, 1, 0];
        return mat4.lookAt(mat4.create(), this.position, target, up);
    }

    //#region Get Ray Target
    getLookRayTarget() {

        const lookDir = vec3.set(this.forwardLookVector, 
            Math.cos(this.pitch) * Math.sin(this.yaw),
            Math.sin(this.pitch),
            -Math.cos(this.pitch) * Math.cos(this.yaw)
        );

        const rayTarget = vec3.create();
        vec3.add(rayTarget, this.position, lookDir)

        return rayTarget;
    }


    //#region  Update Cam Pos
    updateCameraPosition(dt, targetPos) {

        // Forward Vector
        const Fx = -Math.sin(this.yaw);
        const Fz = Math.cos(this.yaw);

        vec3.set(this.forwardMovementVector, Fx, 0, Fz); // this is also cam var for passing to other scripts 
        vec3.normalize(this.forwardMovementVector, this.forwardMovementVector);

        // Right Vector

        const Rx = Math.cos(this.yaw);
        const Rz = Math.sin(this.yaw);

        vec3.set(this.rightMovementVector, Rx, 0, Rz);
        vec3.normalize(this.rightMovementVector, this.rightMovementVector);

        // Orbit offset
        const offset = vec3.fromValues(
            Math.cos(this.pitch) * Math.sin(this.yaw),
            Math.sin(this.pitch),
            -Math.cos(this.pitch) * Math.cos(this.yaw)
        );
        vec3.scale(offset, offset, -this.followDistance); // subtract follow distance

        vec3.add(this.position, targetPos, offset);
    }

    getCameraPosition() {
        return this.position;
    }

    //#region World Raycast
    getMouseWorldRayTarget(projectionMatrix) {
        const ndcX = (this.mouseX / this.canvas.width) * 2 - 1;
        const ndcY = (this.mouseY / this.canvas.height) * -2 + 1;

        const clipNear = vec4.fromValues(ndcX, ndcY, -1.0, 1.0);
        const clipFar = vec4.fromValues(ndcX, ndcY, 1.0, 1.0);

        const forward = vec3.clone(this.position);
        forward[2] -= 1;
        const viewMatrix = mat4.lookAt(mat4.create(), this.position, forward, [0, 1, 0]);

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




}

//#region Variables

// const CAMERA_SPEED = 2.0;
// const MOUSE_SENSITIVITY = 0.002;

// // Mouse tracking
// let mouseX = 0;
// let mouseY = 0;

// export let yaw = 0; // rotation around Y (left/right)
// export let pitch = -0.3; // rotation around X (up/down)

// const MIN_PITCH = -0.7;
// const MAX_PITCH = -0.2;
// const MIN_FOLLOW_DIST = 3.0;
// const MAX_FOLLOW_DIST = 100.0; // should be 10.0 unless debugging

// // let cursorTarget = 0;

// let followTarget = null;
// let followDistance = 20;  // positioned behind player

// let cameraPosition = vec3.fromValues(0, 1, followDistance); 

// export let forwardMovementVector = vec3.create();
// export let rightMovementVector = vec3.create();
// export let forwardLookVector = vec3.create();




// //#region Event Listeners

// // Lock cursor to brower window when clicked
// canvas.addEventListener("click", () => {
//     canvas.requestPointerLock();
//     unPauseGame();
// });

// canvas.addEventListener('mousemove', e => {

//     this.mouseMove(e);





    
//     // if (document.pointerLockElement !== canvas) return; // dont move cam unless pointer is locked

//     // yaw += e.movementX * MOUSE_SENSITIVITY; // "-" makes it reversed look controls
//     // pitch -= e.movementY * MOUSE_SENSITIVITY; // "-" makes it reversed look controls

//     // const maxPitch = Math.PI / 2 - 0.01;
//     // pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, pitch));

//     // // Clamp Yaw
//     // yaw = yaw % (2 * Math.PI);
//     // if (yaw < 0) yaw += 2 * Math.PI;


// });

// // Change zoom distance with mouse wheel
// addEventListener("wheel", (e) => {
//     // const scroll = e.deltaY;
//     // followDistance += scroll * 0.01; // Adjust the multiplier for sensitivity
//     // followDistance = Math.max(MIN_FOLLOW_DIST, Math.min(MAX_FOLLOW_DIST, followDistance));

//     const scroll = e.deltaY;
//     this.followDistance += scroll * 0.01; // Adjust the multiplier for sensitivity
//     this.followDistance = Math.max(this.MIN_FOLLOW_DIST, Math.min(this.MAX_FOLLOW_DIST, this.followDistance));
// });


// =====================================================================
                // THE CODE
// =====================================================================

// //#region Get Ray Target
// export function getLookRayTarget() {

//     const lookDir = vec3.set(forwardLookVector, 
//         Math.cos(pitch) * Math.sin(yaw),
//         Math.sin(pitch),
//         -Math.cos(pitch) * Math.cos(yaw)
//     );

//     const rayTarget = vec3.create();
//     vec3.add(rayTarget, cameraPosition, lookDir)

//     return rayTarget;
// }


// //#region  Update Cam Pos
// export function updateCameraPosition(dt, targetPos) {

//     // Forward Vector

//     const Fx = -Math.sin(yaw);
//     const Fz = Math.cos(yaw);

//     vec3.set(forwardMovementVector, Fx, 0, Fz); // this is also cam var for passing to other scripts 
//     vec3.normalize(forwardMovementVector, forwardMovementVector);

//     // Right Vector

//     const Rx = Math.cos(yaw);
//     const Rz = Math.sin(yaw);

//     vec3.set(rightMovementVector, Rx, 0, Rz);
//     vec3.normalize(rightMovementVector, rightMovementVector);

//     // Orbit offset
//     const offset = vec3.fromValues(
//         Math.cos(pitch) * Math.sin(yaw),
//         Math.sin(pitch),
//         -Math.cos(pitch) * Math.cos(yaw)
//     );
//     vec3.scale(offset, offset, -followDistance); // subtract follow distance

//     vec3.add(cameraPosition, targetPos, offset);
// }

// export function getCameraPosition() {
//     return cameraPosition;
// }

// //#region World Raycast
// export function getMouseWorldRayTarget(projectionMatrix, cameraPosition) {
//     const ndcX = (mouseX / canvas.width) * 2 - 1;
//     const ndcY = (mouseY / canvas.height) * -2 + 1;

//     const clipNear = vec4.fromValues(ndcX, ndcY, -1.0, 1.0);
//     const clipFar = vec4.fromValues(ndcX, ndcY, 1.0, 1.0);

//     const forward = vec3.clone(cameraPosition);
//     forward[2] -= 1;
//     const viewMatrix = mat4.lookAt(mat4.create(), cameraPosition, forward, [0, 1, 0]);

//     const invProj = mat4.invert(mat4.create(), projectionMatrix);
//     const invView = mat4.invert(mat4.create(), viewMatrix);

//     vec4.transformMat4(clipNear, clipNear, invProj);
//     vec4.transformMat4(clipFar, clipFar, invProj);
//     vec4.transformMat4(clipNear, clipNear, invView);
//     vec4.transformMat4(clipFar, clipFar, invView);

//     for (let v of [clipNear, clipFar]) {
//         vec4.scale(v, v, 1 / v[3]);
//     }

//     return [clipFar[0], clipFar[1], clipFar[2]];
// }
