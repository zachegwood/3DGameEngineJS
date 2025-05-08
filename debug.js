

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

    return {
        buffer,
        vertexCount: (lines.length + centerLines.length) / 3,
        centerLines: centerLines // Return the center lines as well
    };
}