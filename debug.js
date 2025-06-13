import { mat4, vec3, vec4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';

console.log("debug.js loaded");


const TILE_SIZE = 1;

export const debugSettings = {
    GRID: false,
    COLLIDERS: false,
    BIOME_COLORS: true,
}

const raysToDraw = [];

let rayBuffer = null;
let attribLocation = null;
let grid = null;


//#region Create Grid

export function createGrid(gl, halfCount = 25, gridSquareSize = TILE_SIZE) {
    const lines = [];
    const centerLines = [];
    const step = gridSquareSize; // distance between each line
    const height = 0.1; // Y pos
    const fallOffRadius = halfCount/0.81;
    const radiusSquared = fallOffRadius * fallOffRadius;

    for (let i = -halfCount; i <= halfCount; i++) {
        const pos = i * step;

        // center lines. Add to diff array so we can color them differently
        if (pos === 0) {
            centerLines.push(-halfCount * step *2, height, pos, halfCount * step * 2, height, pos); // Horizontal line (along Z)
            centerLines.push(pos, height, -halfCount * step * 2, pos, height, halfCount * step * 2); // Vertical line (along X)
            continue;
        }

        // Horizontal lines
        const hStart = [-halfCount * step, height, pos];
        const hEnd = [halfCount * step, height, pos];

        // Vertical lines
        const vStart = [pos, height, -halfCount * step];
        const vEnd = [pos, height, halfCount * step];

        const hStartInRange = hStart[0] ** 2 + hStart[2] ** 2 <= radiusSquared;
        const hEndInRange = hEnd[0] ** 2 + hEnd[2] ** 2 <= radiusSquared;
        const vStartInRange = vStart[0] ** 2 + vStart[2] ** 2 <= radiusSquared;
        const vEndInRange = vEnd[0] ** 2 + vEnd[2] ** 2 <= radiusSquared;

        if (hStartInRange || hEndInRange) {
            lines.push(...hStart, ...hEnd);
        }
        if (vStartInRange || vEndInRange) {
            lines.push(...vStart, ...vEnd);
        }
    }    

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([...lines, ...centerLines]), gl.STATIC_DRAW);

   

    return {
        buffer,
        vertexCount: (lines.length + centerLines.length) / 3,
        centerLines: centerLines // Return the center lines as well
    };
}

//#region Draw Grid

export function DrawGrid(gl, viewMatrix, projectionMatrix, shaderSolidColor) {

    if (!grid) grid = createGrid(gl, 15, TILE_SIZE);

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

    // // Change debug color -- red
    // shaderSolidColor.setColor(1.0, 0.0, 0.0, 1.0);

    // // Draw Origin Ray
    // gl.bindBuffer(gl.ARRAY_BUFFER, rayBuffer);
    // gl.enableVertexAttribArray(shaderSolidColor.attribLocations.position);
    // gl.vertexAttribPointer(shaderSolidColor.attribLocations.position, 3, gl.FLOAT, false, 0, 0,);
    // gl.drawArrays(gl.LINES, 0, 2); // draw the two verticies as 1 line

     //Raycast([0,0,0], [0,1,0], 3, [1,0,0,1]); // reference line vert at 0,0,0
}

//#region Raycast 

// Define the Rays and add to the raysToDraw Array. The actual drawing happens below in DrawRays(gl, shader)
export function Raycast(origin, direction, length, color) {

    

	const end = [
		origin[0] + direction[0] * length,
		origin[1] + direction[1] * length,
		origin[2] + direction[2] * length
	];

	const rayVertices = [
		origin[0], origin[1], origin[2],
		end[0], end[1], end[2]
	];

    const ray = {
        vertices: rayVertices,
        color: color,
        origin: origin
    }

    //console.log("in raycast with", ray);

    raysToDraw.push( ray );

    //console.log(`raysToDraw length is ${raysToDraw.length}`);

    return ray;
}

//#region Draw Rays

export function DrawRays(gl, shader) {

    if (!raysToDraw.length) { console.log("no rays to draw"); } else { console.log(`drawing ray`); }

    if (!raysToDraw.length) return; // nothing to draw    

    // console.log(`ray to draw is:  ` +
    //     `(${raysToDraw[0].vertices[0]}, ${raysToDraw[0].vertices[1]}, ${raysToDraw[0].vertices[2]}) -> ` + 
    //     `(${raysToDraw[0].vertices[3]}, ${raysToDraw[0].vertices[4]}, ${raysToDraw[0].vertices[5]})
    //        color: ${raysToDraw[0].color}` );

    if (rayBuffer === null) rayBuffer = gl.createBuffer(); // setup ray buffer ONCE

    gl.bindBuffer(gl.ARRAY_BUFFER, rayBuffer);

    if (shader.attribLocations.position !== -1) {
        gl.enableVertexAttribArray(shader.attribLocations.position);
        gl.vertexAttribPointer(shader.attribLocations.position, 3, gl.FLOAT, false, 0, 0);
    }

    shader.setModelMatrix(mat4.create()); // identity matrix, cancels out previous model transform


    raysToDraw.forEach( ray => {

        shader.setColor(...ray.color, 1.0); // js spread syntax, since ray.color is an array
        
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ray.vertices), gl.DYNAMIC_DRAW);
        gl.drawArrays(gl.LINES, 0, 2);

        //console.log(`Ray at, ${ray.origin}. total amount is ${raysToDraw.length}`);
    });    

    //raysToDraw.length = 0; // Clear for the next frame

}
