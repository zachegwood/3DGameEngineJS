import { mat4, vec3, vec4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';

const TILE_SIZE = 1;

let rayBuffer = null;
let grid = null;

export function createGrid(gl, halfCount = 25, gridSquareSize = TILE_SIZE) {
    const lines = [];
    const centerLines = [];
    const step = gridSquareSize; // distance between each line
    const height = 0; // Y pos
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

        // // Horizontal lines (parallel to the Z axis)
        // lines.push(-halfCount * step, height, pos, halfCount * step, height, pos); // Horizontal lines (along Z)

        // // Vertical lines (parallel to the X axis)
        // lines.push(pos, height, -halfCount * step, pos, height, halfCount * step); // Vertical lines (along X)
    }    

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([...lines, ...centerLines]), gl.STATIC_DRAW);

    const originRay = [
        0, 0, 0, // origin
        0, 10, 0 // 10 units straight up
    ];
    
    rayBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, rayBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(originRay), gl.STATIC_DRAW);

    return {
        buffer,
        vertexCount: (lines.length + centerLines.length) / 3,
        centerLines: centerLines // Return the center lines as well
    };
}

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

    // Change debug color -- red
    shaderSolidColor.setColor(1.0, 0.0, 0.0, 1.0);

    // Draw Origin Ray
    gl.bindBuffer(gl.ARRAY_BUFFER, rayBuffer);
    gl.enableVertexAttribArray(shaderSolidColor.attribLocations.position);
    gl.vertexAttribPointer(shaderSolidColor.attribLocations.position, 3, gl.FLOAT, false, 0, 0,);
    gl.drawArrays(gl.LINES, 0, 2); // draw the two verticies as 1 line

}