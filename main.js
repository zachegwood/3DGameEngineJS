import { mat4, vec3, vec4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';
import { createGrid } from './debug.js';
import { Shader, createProgram, shaders } from './shaders.js';
import { Mesh, createSquare, createSquareSize, createTriangle, loadTexture } from './meshShapes.js'
import { updateCameraPosition, getCameraPosition, getMouseWorldRayTarget, yaw, pitch, getRayTarget } from './camera.js'

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









//#region Debug  

const grid = createGrid(gl, 15, TILE_SIZE);

const originRay = [
    0, 0, 0, // origin
    0, 10, 0 // 10 units straight up
];

const rayBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, rayBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(originRay), gl.STATIC_DRAW);




//#region CreateProgram

const texture = loadTexture(gl, "Art/testTile.png");

const programTextureUV = createProgram(gl, shaders.vs_textureUV, shaders.fs_textureUV);
const shaderTextureUV = new Shader(gl, programTextureUV);

const programSolidColor = createProgram(gl, shaders.vs_solidColor, shaders.fs_solidColor);
const shaderSolidColor = new Shader(gl, programSolidColor);


//#region Create Shapes

const triangle = createTriangle(gl);
triangle.translate(0,0,0);

const square = createSquare(gl, 1);
square.translate(0, 0, 0);

const triangle2 = createTriangle(gl);
triangle2.translate(0, 0.5, 6);



// let yaw = 0; // rotation around Y (left/right)
// let pitch = 0; // rotation around X (up/down)


// Main loop
gl.enable(gl.DEPTH_TEST);
// gl.enable(gl.CULL_FACE);
// gl.cullFace(gl.BACK);

let start = performance.now();
let lastTime = start;

//#region Render Loop
function render() {

    gl.clearColor(.01, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    const angle = (now - start) * 0.001; // deterministic time step

    updateCameraPosition(dt);
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


    
    

    // Update transforms
    mat4.identity(triangle.modelMatrix); // reset each frame
    triangle.translate(0, 0.5, 0);
    triangle.rotateY(angle);

    mat4.identity(square.modelMatrix); // reset each frame
    square.scale(TILE_SIZE, 1.0, TILE_SIZE);
    square.translate(0,0,3);    
    //square.rotateY(angle);
    



    // Set view and projection matrices for all objects
    shaderTextureUV.use();
    gl.uniformMatrix4fv(shaderTextureUV.uniformLocations.view, false, viewMatrix);
    gl.uniformMatrix4fv(shaderTextureUV.uniformLocations.projection, false, projectionMatrix);    

    // Set texture / UV shader
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(shaderTextureUV.program, "textureSampler"), 0);

    square.draw(shaderTextureUV);

    // Solid color
    shaderSolidColor.use();
    gl.uniformMatrix4fv(shaderSolidColor.uniformLocations.view, false, viewMatrix);
    gl.uniformMatrix4fv(shaderSolidColor.uniformLocations.projection, false, projectionMatrix);

    // Set color to Green
    gl.uniform4f(gl.getUniformLocation(shaderSolidColor.program, "u_color"), 0.0, 1.0, 0.0, 1.0); // Green color

    // Bind the grid buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, grid.buffer);
    gl.enableVertexAttribArray(shaderSolidColor.attribLocations.position);
    gl.vertexAttribPointer(shaderSolidColor.attribLocations.position, 3, gl.FLOAT, false, 0, 0);

    // Identity model matrix for the grid
    gl.uniformMatrix4fv(shaderSolidColor.uniformLocations.model, false, mat4.create());

    // Draw grid (lines)
    gl.drawArrays(gl.LINES, 0, grid.vertexCount - grid.centerLines.length / 3); // all lines except last ones

    // Set color to 
    gl.uniform4f(gl.getUniformLocation(shaderSolidColor.program, "u_color"), 1.0, 1.0, 0.0, 1.0); //  color
    

    // Draw grid (center lines)
    gl.drawArrays(gl.LINES, grid.vertexCount - grid.centerLines.length  / 3, grid.centerLines.length / 3); // last lines (center)

    // Change debug color
    gl.uniform4f(gl.getUniformLocation(shaderSolidColor.program, "u_color"), 1.0, 0.0, 0.0, 1.0);

    // Draw Origin Ray
    gl.bindBuffer(gl.ARRAY_BUFFER, rayBuffer);
    gl.enableVertexAttribArray(shaderSolidColor.attribLocations.position);
    gl.vertexAttribPointer(shaderSolidColor.attribLocations.position, 3, gl.FLOAT, false, 0, 0,);
    gl.drawArrays(gl.LINES, 0, 2); // draw the two verticies as 1 line

    // Change debug color
    gl.uniform4f(gl.getUniformLocation(shaderSolidColor.program, "u_color"), 0.0, 0.0, 1.0, 1.0);

    // Draw Meshes
    triangle.draw(shaderSolidColor);    
    triangle2.draw(shaderSolidColor);

    requestAnimationFrame(render);
}

render();
