import { mat4,} from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';
import { DrawGrid } from './debug.js';
import { CreateShaders } from './shaders.js';
import { createSquare, createTriangle, loadTexture, loadModel, createCube} from './meshShapes.js'
import { updateCameraPosition, getCameraPosition, getMouseWorldRayTarget, getLookRayTarget } from './camera.js'
import { Light } from './lights.js'

import { Entity } from './entity.js'

import { Player } from './player.js';

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

const texture = loadTexture(gl, "Art/testTile.png");

// object that holds refs to all shaders. Created in shaders.js
const myShaders = CreateShaders(gl);






//#region Create Shapes

const triangle = new Entity(createTriangle(gl, 1), [0,0,0]);
const square = new Entity(createSquare(gl, 2), [0,0,0]);
const triangle2 = new Entity(createTriangle(gl, 1), [-2, 0.5, -3]);
const square2 = new Entity(createSquare(gl, 3), [0, 0, 5.0])
const square3 = new Entity(createSquare(gl, 10), [0, 0, -12])

const columnsArray = [];
const columnCount = 16;
let xSide = 1;
let zDepth = 0;

for (let i = 0; i < columnCount; i++) {    

    let randHeight = Math.random() * (15-2) + 2; // random height between 2 and 15

    const colCube = new Entity(createCube(gl, 0.5));

    colCube.id = `colCube_${i}`;

    colCube.translate((xSide * 10), randHeight/2, zDepth);
    colCube.scale(1.0, randHeight, 1.0);

    columnsArray.push(colCube);

    xSide *= -1; // flip sides
    if (i % 2 !== 0) zDepth -= 10; // move back a row every other loop    
}


const blenderModel = await loadModel(gl, "/Art/model_export.json");
const playerOne = new Player(blenderModel);


const lights = [
    
    // new Light([1, 2, 5], [1, 1, 0], 1.0),
    // new Light([-1, 2, 5], [1, 0, 0], 1.0),
    // new Light([9, 2, 0], [0.5, 1, 1], 0.5),
    //  new Light([-9, 2, 0], [0.5, 1, 1], 1.0),
    //  new Light([9, 2, -10], [0.5, 1, 1], 1.0),
    //  new Light([-9, 2, -10], [0.5, 1, 1], 1.0),
     new Light([9, 2, -20], [0.5, 1, 1], 1.0),
     new Light([-9, 2, -20], [0.5, 1, 1], 2.0),
     new Light([9, 2, -30], [0.5, 1, 1], 2.0),
     new Light([-9, 2, -30], [0.5, 1, 1], 2.0),
     new Light([9, 2, -40], [0.5, 1, 1], 2.0),
     new Light([-9, 2, -40], [0.5, 1, 1], 2.0),
     new Light([9, 2, -50], [0.5, 1, 1], 2.0),
     new Light([-9, 2, -50], [0.5, 1, 1], 2.0),
]

// // Create a light
// const pointLight = new Light(
//     [0.0, 2.0, 5.0],    // Position above the mesh
//     [0.0, 1.0, 1.0],    // White color
//     1.0                 // Full intensity
// );



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

    // Player Update
    playerOne.update(deltaTimeMs / 1000) // in seconds

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
    
    
    

    //#region Draw Shapes

    // ========================= DRAW GAME OBJECTS HERE =================== //




    // Update transforms
    mat4.identity(triangle.modelMatrix); // reset each frame
    triangle.translate(0, 0.5, 0);
    triangle.rotateY(angle);

    // mat4.identity(square.modelMatrix); // reset each frame
    // //square.scale(1.0, 1.0, 1.0);
    // square.translate(0,0,0);    
    // //square.rotateY(angle);



    //square.draw(gl, myShaders.SolidColor, viewMatrix, projectionMatrix);

    //square.draw(myShaders.SolidColor);

    


                                // // Set view and projection matrices for all objects
                                //  myShaders.TextureUV.use();
                                //  myShaders.TextureUV.setUniforms(viewMatrix, projectionMatrix, null, null, texture);  
                                //  square.draw(myShaders.TextureUV);
                                //  triangle2.draw(myShaders.TextureUV); 
                                // myShaders.SolidColor.use();
                                // myShaders.SolidColor.setUniforms(viewMatrix, projectionMatrix, null, [0.0, 1.0, 1.0, 1.0]); // blue        
                                // triangle.draw(myShaders.SolidColor);    
                                // myShaders.SolidColor.setColor(1.0, 0.5, 1.0, 1.0);

    

//#region LIGHT TEST

        // Lighting Shader
    //myShaders.Lighting.use();  
    //myShaders.Lighting.setLights(lights);
    //myShaders.Lighting.setUniforms(viewMatrix, projectionMatrix, null, [0.8, 0.8, 0.8, 1.0], null);
   // myShaders.Lighting.setUniforms(viewMatrix, projectionMatrix);
    //gl.uniform3f(myShaders.Lighting.uniformLocations.lightDirection, -1.0, -0.8, 0.8); // Example direction
    

    for (let i = 0; i < columnsArray.length; i++) {
        //gl.uniformMatrix4fv(myShaders.Lighting.uniformLocations.model, false, columnsArray[i].modelMatrix);

        columnsArray[i].draw(myShaders.Lighting, viewMatrix, projectionMatrix, lights);
    }

    playerOne.draw(myShaders.Lighting, viewMatrix, projectionMatrix, lights);
    square2.draw(myShaders.Lighting, viewMatrix, projectionMatrix, lights);
    square3.draw(myShaders.Lighting, viewMatrix, projectionMatrix, lights);
    
    //  myShaders.SolidColor.use();
    //  myShaders.SolidColor.setUniforms(viewMatrix, projectionMatrix, null, [0.0, 0.0, 1.0, 1.0]); // blue

    

    // // Draw Meshes


    //         //cube.draw(shaderLighting);
    // playerOne.draw(gl, myShaders.SolidColor, viewMatrix, projectionMatrix);

    // myShaders.TextureUV.use();    
    // myShaders.TextureUV.setUniforms(viewMatrix, projectionMatrix, null, null, texture);  
    
    // draw mesh 
    

    

}






