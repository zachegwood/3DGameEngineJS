import { mat4, vec3, vec4} from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';
import { DrawGrid, debugSettings, DrawRays, Raycast } from './debug.js';
import { CreateShaders } from './shaders.js';
import { createSquare, createTriangle, loadTexture, loadModel, createCube} from './meshShapes.js';
import { Camera } from './camera.js';

import { Light } from './lights.js';
import { Entity } from './entity.js';
import { Player } from './player.js';
import { SceneNode } from './scene.js';

import { buildLevel } from './testLevel_Terrain.js'; // currently changing this is how we change levels

import { drawWireFrameCube, findWireFrameCube, CollisionSystem } from './collisions.js';

//#region GL and Canvas

// Setup canvas
const canvas = document.getElementById("glcanvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const gl = canvas.getContext("webgl");
if (!gl) throw new Error("WebGL not supported");

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
});

//#region Debug Toggles
const debugToggleGrid = document.getElementById("debug_toggle_grid");
const debugToggleColliders = document.getElementById("debug_toggle_colliders");
const debugToggleBiomeColors = document.getElementById("debug_toggle_biome_colors");

const debugElement = document.getElementById("cam_debug");

debugToggleColliders.addEventListener("click", () => {
    debugToggleColliders.classList.toggle("debug_enabled");
    console.log("toggling debug colliders");
    debugSettings.COLLIDERS = !debugSettings.COLLIDERS;
});
debugToggleGrid.addEventListener("click", () => {
    debugToggleGrid.classList.toggle("debug_enabled");
    console.log("toggling debug grid");
    debugSettings.GRID = !debugSettings.GRID;
});
debugToggleBiomeColors.addEventListener("click", () => {
    debugToggleBiomeColors.classList.toggle("debug_enabled");
    console.log("toggling debug biome colors");
    debugSettings.BIOME_COLORS = !debugSettings.BIOME_COLORS;
});

if (debugSettings.COLLIDERS === true) {
    debugToggleColliders.classList.add("debug_enabled");
}

if (debugSettings.GRID === true) {
    debugToggleGrid.classList.add("debug_enabled");
}

if (debugSettings.BIOME_COLORS === true) {
    debugToggleBiomeColors.classList.add("debug_enabled");
}

let debugPause = false;
let isGameLoopRunning = true;
const pauseText = document.getElementById("pause_text");

//#region Logs
// Keep these here. They define the goodLog/badLog console overriding
console.badLog = function(message) {
    console.log(`%c${message}`, 'color: red; font-size: 12px; background: white; border-radius: 10%; padding: 2px;font-weight: bold;')
}
console.goodLog = function(message) {
    console.log(`%c${message}`, 'color: blue; font-size: 12px; background: white; border-radius: 10%; padding: 2px; font-weight: bold;')
}


//#region Event Listeners
// If user clicked to another window 
document.addEventListener("visibilitychange", () => {

    if (document.hidden) {

        console.log(" Webpage is hidden. User has clicked away. ");

        debugPause = true;
        pauseText.style.display = 'block';

    } else {

        console.log(" Website is visible. User has returned. ");

        // debugPause = false;
        // pauseText.style.display = 'none';   
        // if (isGameLoopRunning === false){
        //      requestAnimationFrame(gameLoop);
        //      isGameLoopRunning = true;
        // }

    }
});

//#region Pause
export function unPauseGame() {

    debugPause = false;
    pauseText.style.display = 'none';   
    if (isGameLoopRunning === false){

        lastTime = performance.now();

         requestAnimationFrame(gameLoop);
         isGameLoopRunning = true;
    }
    
}


//#region Build Level
export const collisionSystem = new CollisionSystem();

// object that holds refs to all shaders. Created in shaders.js
export const myShaders = CreateShaders(gl);

// add all game objects to scene
const scene = buildLevel(gl, myShaders);
scene.id = `TestLevelParentScene`;
const blenderModel = await loadModel(gl, "/Art/model_export.json");
const defaultTexture = loadTexture(gl, "Art/testTile.png");

const playerOne = new Player( 
    {
        mesh: blenderModel, 
        shader: myShaders.Lighting, 
        texture: defaultTexture, 
        id: "player_one"
    });

//#region Camera
const camPropertiesOverhead = {
    id: "camera_overhead",
    MIN_FOLLOW_DIST: 100,
    MAX_FOLLOW_DIST: 300,
    followDistance: 300,
    position: vec3.fromValues(0, 150, 0),
    MIN_PITCH: -1.5,
    MAX_PITCH: -.5
}
const camera_player = new Camera(canvas, playerOne, {id: "camera_player"});
const camera_overhead = new Camera(canvas, playerOne, camPropertiesOverhead);
// camera_overhead.id = "camera_overhead";
// camera_player.id = "camera_player";

console.log(camera_overhead.position);

playerOne.camera = camera_player;
scene.add(playerOne);



//printSceneNodeNames(scene);


// Print Scene Nodes' Names so I can track them
function printSceneNodeNames(node, depth = 0) {
    const indent = ' '.repeat(depth); // for clearer structure
    const parentName = node.parent ? node.parent.id : 'none';

    if (node.children && node.children.length > 0) {
        console.log(`${indent}I'm a parent. My name is ${node.id}. I have ${node.children.length} children. My parent is ${parentName}`);
        for (let child of node.children) {
            printSceneNodeNames(child, depth + 1);
        }
    } else {
        console.log(`${indent}I'm not a parent. My name is ${node.id}. My parent is ${parentName}`);
    }
}

// hover dom element showing player POS vector on screen
const playerPosLabel = document.createElement("div");
playerPosLabel.id = "player_pos";
playerPosLabel.textContent = "X, Y, Z";
//document.body.appendChild(playerPosLabel);

function worldToScreen(pos, viewMatrix, projectionMatrix, canvas) {
    const clipSpace = vec4.transformMat4([], [pos[0], pos[1], pos[2], 1], viewMatrix);
    vec4.transformMat4(clipSpace, clipSpace, projectionMatrix);

    // Perspective divide
    const ndc = [
        clipSpace[0] / clipSpace[3],
        clipSpace[1] / clipSpace[3],
    ];

    // Convert NDC [-1, 1] to screen [0, canvas.width/height]
    return [
        (ndc[0] + 1) * 0.5 * canvas.width,
        (1 - ndc[1]) * 0.5 * canvas.height // Y is inverted
    ];
}






gl.enable(gl.DEPTH_TEST);
// gl.enable(gl.CULL_FACE);
// gl.cullFace(gl.BACK);

let start = performance.now();
let lastTime = start;
const FIXED_TIMESTEP = 1000 / 60; // 60 updates per second. 16.666... ms
let accumulator = 0;

let frameCount;
let frameTimer = 0;
let lastFrameTimer = 0;

//#region Game Loop

function gameLoop(timestamp) {

    if (debugPause) {
        isGameLoopRunning = false;
        return;
    }

    if (!lastTime) lastTime = timestamp;

    const deltaTimeMs = timestamp - lastTime;
    lastTime = timestamp;
    accumulator += deltaTimeMs;

    // // Player Update
    // playerOne.update(deltaTimeMs / 1000) // in seconds

    // All entities in scene, run UPDATE on all children
    scene.update(deltaTimeMs / 1000); // in seconds

        // Fixed time step updates
    while (accumulator >= FIXED_TIMESTEP) {
        camera_player.updateCameraPosition((FIXED_TIMESTEP / 1000), playerOne.position); // pass delta in seconds
        camera_overhead.updateCameraPosition((FIXED_TIMESTEP / 1000), playerOne.position);
        accumulator -= FIXED_TIMESTEP;
    }
    
    // Render loop
    render(performance.now() - start);

    // This Loop
    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);










//#region Render Loop
function render(elapsedTime) {

    if (debugPause === true) return;

    frameCount++;
    frameTimer = performance.now() - lastFrameTimer;

    if (frameTimer > 1000) {

        debugElement.textContent = `FPS: ${frameCount}`;

        frameTimer = 0;
        frameCount = 0;
        lastFrameTimer = performance.now();
    }
        

    gl.clearColor(.01, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const angle = elapsedTime * 0.001; // deterministic time step
   
    const cameraPosition = camera_player.getCameraPosition();

    const projectionMatrix = mat4.perspective(mat4.create(), Math.PI / 4, canvas.width / canvas.height, 0.5, 1000);
    //const rayTarget = getMouseWorldRayTarget(projectionMatrix, cameraPosition);

    let rayTarget = camera_player.getLookRayTarget();

    //const viewMatrix = mat4.lookAt(mat4.create(), cameraPosition, rayTarget, [0, 1, 0]);
    const viewMatrix = camera_player.getViewMatrix();

    // debugElement.innerText = `
    // Camera Position: (${cameraPosition.map(n => n.toFixed(2)).join(",")})
    // Camera Target:   (${rayTarget.map(n => n.toFixed(2)).join(",")})
    
    // Pitch: [${pitch.toFixed(2)}]   
    // Yaw: [${yaw.toFixed(2)}]
    // `;


    if (debugSettings.GRID === true)
        DrawGrid(gl, viewMatrix, projectionMatrix, myShaders.SolidColor); // debug grid draw methods. all GPU stuffs

    scene.testTriangle.rotateY(0.05); // just spinning for fun for debugging. Move to entity's update if keeping for real

    const viewMatrixOverhead = camera_overhead.getViewMatrix();
    const viewMatrixPlayer = camera_player.getViewMatrix();

    // Draw all game objects
    scene.draw(gl, viewMatrixPlayer, projectionMatrix, scene.testLights, true, camera_player);


    Raycast([0,0,0], [0,1,0], 3, [1,0,0,1]); // reference line vert at 0,0,0
    DrawRays(gl, myShaders.SolidColor); // All raycasts

    

    // Draw player's POS in text above player head
    const screenPos = worldToScreen(playerOne.position, viewMatrix, projectionMatrix, canvas);
    playerPosLabel.style.left = `${screenPos[0]}px`;
    playerPosLabel.style.top = `${screenPos[1]}px`;
    playerPosLabel.textContent = 
        `${playerOne.position[0].toFixed(1)}, 
         ${playerOne.position[1].toFixed(1)}, 
         ${playerOne.position[2].toFixed(1)}`;


// Wireframe Cube around...(currently nothing, just vectors). 
// Move this to testLevel.js later
    // const wireCube = wireFrameCube([0,2,0], [2,4,2]);
    // drawWireFrameCube(gl, myShaders.SolidColor, wireCube);





}






