import { mat4, vec3, vec4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';
import { createGrid } from './debug.js';
import { Shader, createProgram, shaders } from './shaders.js';
import { createSquare, createTriangle, loadTexture, createCube} from './meshShapes.js'
import { updateCameraPosition, getCameraPosition, getMouseWorldRayTarget, yaw, pitch, getRayTarget } from './camera.js'

import { Player } from './player.js';


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

const debugElement = document.getElementById("cam_debug");


const TILE_SIZE = 1;









//#region Debug Grid

const grid = createGrid(gl, 15, TILE_SIZE);

const originRay = [
    0, 0, 0, // origin
    0, 10, 0 // 10 units straight up
];

const rayBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, rayBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(originRay), gl.STATIC_DRAW);

function DrawGrid(viewMatrix, projectionMatrix) {
// Solid color
    shaderSolidColor.use();
    shaderSolidColor.setUniforms(viewMatrix, projectionMatrix, null, [0.0, 1.0, 0.0, 1.0]);

    // Bind the grid buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, grid.buffer);
    if (shaderSolidColor.attribLocations.position !== -1) {
        gl.enableVertexAttribArray(shaderSolidColor.attribLocations.position);
        gl.vertexAttribPointer(shaderSolidColor.attribLocations.position, 3, gl.FLOAT, false, 0, 0);
    }

    // Identity model matrix for the grid
    gl.uniformMatrix4fv(shaderSolidColor.uniformLocations.model, false, mat4.create());

    // Draw grid (lines)
    gl.drawArrays(gl.LINES, 0, grid.vertexCount - grid.centerLines.length / 3); // all lines except last ones

    // // Set color to yellow?
    shaderSolidColor.setColor(1.0, 1.0, 0.0, 1.0);
    
    // Draw grid (center lines)
    gl.drawArrays(gl.LINES, grid.vertexCount - grid.centerLines.length  / 3, grid.centerLines.length / 3); // last lines (center)

    // Reset to identity before drawing ray
    gl.uniformMatrix4fv(shaderSolidColor.uniformLocations.model, false, mat4.create());

    // Change debug color -- red
    shaderSolidColor.setColor(1.0, 0.0, 0.0, 1.0);

    // Draw Origin Ray
    gl.bindBuffer(gl.ARRAY_BUFFER, rayBuffer);
    gl.enableVertexAttribArray(shaderSolidColor.attribLocations.position);
    gl.vertexAttribPointer(shaderSolidColor.attribLocations.position, 3, gl.FLOAT, false, 0, 0,);
    gl.drawArrays(gl.LINES, 0, 2); // draw the two verticies as 1 line

}


//#region CreateProgram

const texture = loadTexture(gl, "Art/testTile.png");

const programTextureUV = createProgram(gl, shaders.vs_textureUV, shaders.fs_textureUV);
const shaderTextureUV = new Shader(gl, programTextureUV);

const programSolidColor = createProgram(gl, shaders.vs_solidColor, shaders.fs_solidColor);
const shaderSolidColor = new Shader(gl, programSolidColor);

const programLighting = createProgram(gl, shaders.vs_lighting, shaders.fs_lighting);
const shaderLighting = new Shader(gl, programLighting);


//#region Create Shapes

const triangle = createTriangle(gl, 1);
triangle.translate(0,0,0);

const square = createSquare(gl, 4); // square size 4. uv will repeat.
square.translate(0, 0, 0);

const triangle2 = createTriangle(gl, 2);
triangle2.translate(0, 0.5, 6);

const columnsArray = [];
const columnCount = 16;
let xSide = 1;
let zDepth = 0;

for (let i = 0; i < columnCount; i++) {    

    //const colSquare = createSquare(gl, 1.0);
    //colSquare.translate((xSide * 10), 0, zDepth);

    let randHeight = Math.random() * (15-2) + 2; // random height between 2 and 15

    const colCube = createCube(gl, 0.5);
    colCube.translate((xSide * 10), randHeight/2, zDepth);
    colCube.scale(1.0, randHeight, 1.0);
    columnsArray.push(colCube);

    //console.log(colSquare.modelMatrix);

    xSide *= -1; // flip sides
    if (i % 2 !== 0) zDepth -= 10; // move back a row every other loop    
}

const cube = createCube(gl, 0.5);
// cube.translate(-2.0, 0.0, -2.0);
// cube.scale(1.0, 0.5, 1.0);

const playerOne = new Player(cube);
console.log(`players mesh is ${playerOne.mesh}`);



// let yaw = 0; // rotation around Y (left/right)
// let pitch = 0; // rotation around X (up/down)


//  loop
gl.enable(gl.DEPTH_TEST);
// gl.enable(gl.CULL_FACE);
// gl.cullFace(gl.BACK);

let start = performance.now();
let lastTime = start;
const FIXED_TIMESTEP = 1000 / 60; // 60 updates per second
let accumulator = 0;

//#region Game Loop

function gameLoop(timestamp) {

    if (!lastTime) lastTime = timestamp;
    const deltaTimeMs = timestamp - lastTime;
    const dt = deltaTimeMs * 0.01; // dt is in seconds.
    const elapsedTime = performance.now() - start;
    lastTime = timestamp;
    accumulator += dt;

    // Fixed time step updates
    while (accumulator >= FIXED_TIMESTEP) {
        updateCameraPosition(FIXED_TIMESTEP / 1000); // pass delta in seconds
        accumulator -= FIXED_TIMESTEP;
    }



    playerOne.update(dt);

    // Render
    render(elapsedTime); 




    








    // Loop
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

    let rayTarget = getRayTarget();

    const viewMatrix = mat4.lookAt(mat4.create(), cameraPosition, rayTarget, [0, 1, 0]);

    debugElement.innerText = `
    Camera Position: (${cameraPosition.map(n => n.toFixed(2)).join(",")})
    Camera Target:   (${rayTarget.map(n => n.toFixed(2)).join(",")})
    
    Pitch: [${pitch.toFixed(2)}]   
    Yaw: [${yaw.toFixed(2)}]
    `;

    DrawGrid(viewMatrix, projectionMatrix); // debug grid draw methods. all GPU stuffs
    
    
    


    // Update transforms
    mat4.identity(triangle.modelMatrix); // reset each frame
    triangle.translate(0, 0.5, 0);
    triangle.rotateY(angle);

    // mat4.identity(square.modelMatrix); // reset each frame
    // //square.scale(1.0, 1.0, 1.0);
    // square.translate(0,0,0);    
    // //square.rotateY(angle);


    



    // Set view and projection matrices for all objects
    shaderTextureUV.use();
    shaderTextureUV.setUniforms(viewMatrix, projectionMatrix, null, null, texture);   

    square.draw(shaderTextureUV);

    
    // Lighting Shader
    shaderLighting.use();  
    shaderLighting.setUniforms(viewMatrix, projectionMatrix, null, [0.8, 0.8, 0.8, 1.0], null);
    gl.uniform3f(shaderLighting.uniformLocations.lightDirection, -1.0, -1.0, 0.5); // Example direction


    for (let i = 0; i < columnsArray.length; i++) {
        gl.uniformMatrix4fv(shaderLighting.uniformLocations.model, false, columnsArray[i].modelMatrix);
        columnsArray[i].draw(shaderLighting);
    }


    

    
    shaderSolidColor.use();
    shaderSolidColor.setUniforms(viewMatrix, projectionMatrix, null, [0.0, 0.0, 1.0, 1.0]); // blue

    // Draw Meshes
    triangle.draw(shaderSolidColor);    

        //cube.draw(shaderLighting);
    playerOne.draw(gl, shaderSolidColor, viewMatrix, projectionMatrix);

    shaderTextureUV.use();    
    shaderTextureUV.setUniforms(viewMatrix, projectionMatrix, null, null, texture);  
    
    // draw mesh 
    triangle2.draw(shaderTextureUV);

}






