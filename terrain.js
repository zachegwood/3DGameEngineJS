// ProcGen Terrain

export function generateFlatGrid(width, depth, segmentsX, segmentsZ) {

    const positions = [];
    const indices = [];
    const uvs = [];

    for (let z = 0; z <= segmentsZ; z++) {
        for (let x = 0; x <= segmentsX; x++) {
            const posX = (x / segmentsX) * width;
            const posZ = (z / segmentsZ) * depth;
            positions.push(posX, 0, posZ); // y = 0 for now
            uvs.push(x / segmentsX, z / segmentsZ);
        }
    }

    // Generate indices for triangle strip
    for (let z = 0; z < segmentsZ; z++) {
        for (let x = 0; x < segmentsX; x++) {
            const i0 = z * (segmentsX + 1) + x;
            const i1 = i0 + 1;
            const i2 = i0 + segmentsX + 1;
            const i3 = i2 + 1;

            // First triangle
            indices.push(i0, i2, i1);
            // Second triangle
            indices.push(i1, i2, i3);
        }
    }

    return { positions, indices, uvs };

}


