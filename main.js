import { mat4,} from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';
import { DrawGrid } from './debug.js';
import { CreateShaders } from './shaders.js';
import { createSquare, createTriangle, loadTexture, loadModel, createCube} from './meshShapes.js'
import { updateCameraPosition, getCameraPosition, getMouseWorldRayTarget, getRayTarget } from './camera.js'

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

// const triangle = createTriangle(gl, 1);
// triangle.translate(0,0,0);

const triangle = new Entity(createTriangle(gl, 1), [0,0,0]);
const square = new Entity(createSquare(gl, 1), [0,0,0]);
const triangle2 = new Entity(createTriangle(gl,1), [-2, 0.5, -3]);

// const square = createSquare(gl, 4); // square size 4. uv will repeat.
// square.translate(0, 0, 0);

// const triangle2 = createTriangle(gl, 2);
// triangle2.translate(0, 0.5, 6);

const columnsArray = [];
const columnCount = 16;
let xSide = 1;
let zDepth = 0;

for (let i = 0; i < columnCount; i++) {    

    //const colSquare = createSquare(gl, 1.0);
    //colSquare.translate((xSide * 10), 0, zDepth);

    let randHeight = Math.random() * (15-2) + 2; // random height between 2 and 15

    //const colCube = createCube(gl, 0.5);
    const colCube = new Entity(createCube(gl, 0.5));
    colCube.translate((xSide * 10), randHeight/2, zDepth);
    //colCube.scale(1.0, randHeight, 1.0);
    columnsArray.push(colCube);

    //console.log(colSquare.modelMatrix);

    xSide *= -1; // flip sides
    if (i % 2 !== 0) zDepth -= 10; // move back a row every other loop    
}



class SimpleMesh {
    constructor(gl, vertices) {
        const flatVerts = vertices.flat();
        this.vertexCount = flatVerts.length / 3; // 8640 / 3 = 2880

        this.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(flatVerts), gl.STATIC_DRAW);
    }

    draw(shader) {
        const gl = shader.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        const posLoc = shader.attribLocations.position;
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
    }
}



// Load model JSON from exported Blender
const verts = await loadModel("/Art/sphere_triangles.json");

console.log("Loaded model vertex count:", verts.length);
console.log("First vertex:", verts[0]);
console.log("Is nested array:", Array.isArray(verts[0]));

const mesh = new SimpleMesh(gl, verts);


const cube = createCube(gl, 0.5);
// cube.translate(-2.0, 0.0, -2.0);
// cube.scale(1.0, 0.5, 1.0);

const playerOne = new Player(mesh);

// const playerOne = new Player(cube);
// console.log(`players mesh is ${playerOne.mesh}`);



// let yaw = 0; // rotation around Y (left/right)
// let pitch = 0; // rotation around X (up/down)



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

    //console.log(playerOne.position);
    
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

    let rayTarget = getRayTarget();

    const viewMatrix = mat4.lookAt(mat4.create(), cameraPosition, rayTarget, [0, 1, 0]);

    // debugElement.innerText = `
    // Camera Position: (${cameraPosition.map(n => n.toFixed(2)).join(",")})
    // Camera Target:   (${rayTarget.map(n => n.toFixed(2)).join(",")})
    
    // Pitch: [${pitch.toFixed(2)}]   
    // Yaw: [${yaw.toFixed(2)}]
    // `;

    DrawGrid(gl, viewMatrix, projectionMatrix, myShaders.SolidColor); // debug grid draw methods. all GPU stuffs
    
    
    


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
     myShaders.TextureUV.use();
     myShaders.TextureUV.setUniforms(viewMatrix, projectionMatrix, null, null, texture);   

     square.draw(myShaders.TextureUV);
     triangle2.draw(myShaders.TextureUV);

    

    myShaders.SolidColor.use();
    myShaders.SolidColor.setUniforms(viewMatrix, projectionMatrix, null, [0.0, 1.0, 1.0, 1.0]); // blue
        



        // Lighting Shader
    myShaders.Lighting.use();  
    myShaders.Lighting.setUniforms(viewMatrix, projectionMatrix, null, [0.8, 0.8, 0.8, 1.0], null);
    gl.uniform3f(myShaders.Lighting.uniformLocations.lightDirection, -1.0, -0.8, 0.8); // Example direction


    for (let i = 0; i < columnsArray.length; i++) {
        gl.uniformMatrix4fv(myShaders.Lighting.uniformLocations.model, false, columnsArray[i].modelMatrix);
        columnsArray[i].draw(myShaders.Lighting);
    }


    

    
     myShaders.SolidColor.use();
     myShaders.SolidColor.setUniforms(viewMatrix, projectionMatrix, null, [0.0, 0.0, 1.0, 1.0]); // blue

    // //mesh.draw(myShaders.SolidColor);

    // // Draw Meshes
    triangle.draw(myShaders.SolidColor);    

    //         //cube.draw(shaderLighting);
    // playerOne.draw(gl, myShaders.SolidColor, viewMatrix, projectionMatrix);

    // myShaders.TextureUV.use();    
    // myShaders.TextureUV.setUniforms(viewMatrix, projectionMatrix, null, null, texture);  
    
    // draw mesh 
    

    

}






