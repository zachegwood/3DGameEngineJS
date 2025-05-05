import { mat4, vec3 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';

const canvas = document.getElementById("glcanvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const gl = canvas.getContext("webgl");
if (!gl) throw new Error("WebGL not supported");

// Vertex shader source code
const vertexSrc = `
attribute vec3 a_position;
uniform mat4 u_projection;
uniform mat4 u_modelView;

void main() {
    gl_Position = u_projection * u_modelView * vec4(a_position, 1.0);
}
`;

// Fragment shader source code
const fragmentSrc = `
precision mediump float;
void main() {
    gl_FragColor = vec4(1.0, 0.4, 0.2, 1.0); //orange
}
`;

// Shader compilation
function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

// Link shaders into a program
function createProgram(vsSource, fsSource) {
    const vs = compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        return null;
    }
    return program;
}

const program = createProgram(vertexSrc, fragmentSrc);
gl.useProgram(program);

// // Setup projection matrix
// function createPerspectiveMatrix(fov, aspect, near, far) {
//     const f = 1.0 / Math.tan(fov / 2);
//     const rangeInv = 1 / (near - far);

//     return new Float32Array([
//         f / aspect, 0, 0,                           0,
//         0,          f, 0,                           0,
//         0,          0,  (near + far) * rangeInv,    -1,
//         0,          0,  near * far * rangeInv * 2,  0
//     ]);
// }


// // Static model-view for floor (no rotation)
// function createStaticModelViewMatrix() {
//     return new Float32Array([
//         1, 0, 0, 0,
//         0, 1, 0, 0,
//         0, 0, 1, 0,
//         0, 0, -3, 1
//     ]);
// }

// // Set up model-view matrix
// function createModelViewMatrix(angle) {
//     const c = Math.cos(angle);
//     const s = Math.sin(angle);

//     return new Float32Array([
//         c, 0, s, 0,
//         0, 1, 0, 0,
//         -s, 0, c, 0, 
//         0, 0, -2, 1  // pulls triangle "into" the screen on Z
//     ]);
// }









// Triangle vertex data
const vertices = new Float32Array([
    //  x,      y,      z,
        0.0,    0.5,    0.0,
        -0.5,   -0.5,   0.0,
        0.5,    -0.5,   0.0,        
        
        // Floor (two triangles forming a square)
        -1.0, -0.5, -1.0,
        1.0, -0.5, -1.0,
       -1.0, -0.5,  1.0,
   
       -1.0, -0.5,  1.0,
        1.0, -0.5, -1.0,
        1.0, -0.5,  1.0
]);

function createRotationMatrix(angleInRadians) {
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);

    // Triangle vertex positions (X, Y)
    return new Float32Array([
        c, -s, 0,
        s, c, 0,
        0, 0, 1
    ]);
}

// Create a buffer and upload the vertex data
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);  

// Setup the attributes
const positionLoc = gl.getAttribLocation(program, "a_position");
gl.enableVertexAttribArray(positionLoc);
gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);

// Setup uniforms
const projectionLoc = gl.getUniformLocation(program, "u_projection");
const modelViewLoc = gl.getUniformLocation(program, "u_modelView");

let start = performance.now();

function drawScene() {
    const now = performance.now();
    const angle = (now - start) * 0.001; // angle in radians

    const fov = Math.PI / 4;
    const aspect = canvas.width / canvas.height;
    const near = 0.1;
    const far = 100;

     // glMatrix version:
    const projection = mat4.create();
    mat4.perspective(projection, fov, aspect, near, far);

    const modelViewTriangle = mat4.create();
    mat4.translate(modelViewTriangle, modelViewTriangle, [0, 0.5, -3]);
    mat4.rotateY(modelViewTriangle, modelViewTriangle, angle)
    
    const modelViewFloor = mat4.create();
    mat4.translate(modelViewFloor, modelViewFloor, [0, 0, -3]);

    //const projection = createPerspectiveMatrix(fov, aspect, near, far);
    //const modelViewRotating = createModelViewMatrix(angle);
    //const modelViewStatic = createStaticModelViewMatrix();

    // const modelViewRotating = modelViewTriangle;
    // const modelViewStatic = modelViewFloor;

    // Set viewport and clear
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);    

    // projection is same for both
    gl.uniformMatrix4fv(projectionLoc, false, projection);

    // rotating triangle
    gl.uniformMatrix4fv(modelViewLoc, false, modelViewTriangle);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // static floor
    gl.uniformMatrix4fv(modelViewLoc, false, modelViewFloor);
    gl.drawArrays(gl.TRIANGLES, 3, 6);

    requestAnimationFrame(drawScene);

}

drawScene();
