import { mat4,} from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';
import { DrawGrid } from './debug.js';
import { CreateShaders } from './shaders.js';
import { createSquare, createTriangle, loadTexture, loadModel, createCube} from './meshShapes.js';
import { updateCameraPosition, getCameraPosition, getMouseWorldRayTarget, getLookRayTarget } from './camera.js';

import { Light } from './lights.js';
import { Entity } from './entity.js';
import { Player } from './player.js';
import { SceneNode } from './scene.js';

import { buildLevel } from './testLevel.js';

import { drawWireFrameCube, wireFrameCube } from './collisions.js';

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

const debugElement = document.getElementById("cam_debug");



// object that holds refs to all shaders. Created in shaders.js
const myShaders = CreateShaders(gl);

// add all game objects to scene
const scene = buildLevel(gl, myShaders);
scene.id = `TestLevelParentScene`;
const blenderModel = await loadModel(gl, "/Art/model_export.json");
const playerOne = new Player( {mesh: blenderModel, shader: myShaders.Lighting} );
playerOne.id = "player_one";
scene.add(playerOne);

printSceneNodeNames(scene);


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







gl.enable(gl.DEPTH_TEST);
// gl.enable(gl.CULL_FACE);
// gl.cullFace(gl.BACK);

let start = performance.now();
let lastTime = start;
const FIXED_TIMESTEP = 1000 / 60; // 60 updates per second. 16.666... ms
let accumulator = 0;

//#region Game Loop

function gameLoop(timestamp) {

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
        updateCameraPosition((FIXED_TIMESTEP / 1000), playerOne.position); // pass delta in seconds
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

    gl.clearColor(.01, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const angle = elapsedTime * 0.001; // deterministic time step
   
    const cameraPosition = getCameraPosition();

    const projectionMatrix = mat4.perspective(mat4.create(), Math.PI / 4, canvas.width / canvas.height, 0.1, 100);
    //const rayTarget = getMouseWorldRayTarget(projectionMatrix, cameraPosition);

    let rayTarget = getLookRayTarget();

    const viewMatrix = mat4.lookAt(mat4.create(), cameraPosition, rayTarget, [0, 1, 0]);

    // debugElement.innerText = `
    // Camera Position: (${cameraPosition.map(n => n.toFixed(2)).join(",")})
    // Camera Target:   (${rayTarget.map(n => n.toFixed(2)).join(",")})
    
    // Pitch: [${pitch.toFixed(2)}]   
    // Yaw: [${yaw.toFixed(2)}]
    // `;

    DrawGrid(gl, viewMatrix, projectionMatrix, myShaders.SolidColor); // debug grid draw methods. all GPU stuffs

    scene.testTriangle.rotateY(0.05); // just spinning for fun for debugging. Move to entity's update if keeping for real

    // Draw all game objects
    scene.draw(gl, viewMatrix, projectionMatrix, scene.testLights);







// Wireframe Cube around...(currently nothing, just vectors). 
// Move this to testLevel.js later
    // const wireCube = wireFrameCube([0,2,0], [2,4,2]);
    // drawWireFrameCube(gl, myShaders.SolidColor, wireCube);





}






