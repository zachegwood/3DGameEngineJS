// AABB bounding boxes

import { mat4, vec3, vec4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';


// function createAABB(min, max) {
//     return { min, max }; // vec3
// }

// in main:
// const playerBox = createAABB([0, 0, 0], [1, 2, 1]); // a 1x2x1 player

function aabbIntersects(a,b) {
    return (
        a.min[0] <= b.max[0] && a.max[0] >= b.min[0] && // X
        a.min[1] <= b.max[1] && a.max[1] >= b.min[1] && // Y
        a.min[2] <= b.max[2] && a.max[2] >= b.min[2]    // Z
    );
}

function updatePlayerAABB(position, size) {
    const halfSize = size.map(s => s / 2);
    return {
        min: [
            position[0] - halfSize[0],
            position[1] - halfSize[1],
            position[2] - halfSize[2]
        ],
        max: [
            position[0] + halfSize[0],
            position[1] + halfSize[1],
            position[2] + halfSize[2]
        ]
    };
}

// example boxes colliders in array
// export const levelBoxes = [
//     createAABB([5, 0, 5], [7, 2, 7]),       // cube block
//     createAABB([-1, -1, -1], [10, 0, 10]),  // ground plane
// ];


function tryMovePlayer(playerPos, velocity, size, levelBoxes) {
    const nextPos = [
        playerPos[0] + velocity[0],
        playerPos[1] + velocity[1],
        playerPos[2] + velocity[2]
    ];

    const nextAABB = updatePlayerAABB(nextPos, size);

    for (const box of levelBoxes) {
        if (aabbIntersects(nextAABB, box)) {
            return playerPos; // Blocked, stay in place
        }
    }

    return nextPos // No collision, move
}

export function wireFrameCube(min, max) {

  const [minX, minY, minZ] = min;
  const [maxX, maxY, maxZ] = max;

  const cubeVerts = [
    [minX, minY, minZ], // 0
    [maxX, minY, minZ], // 1
    [maxX, maxY, minZ], // 2
    [minX, maxY, minZ], // 3
    [minX, minY, maxZ], // 4
    [maxX, minY, maxZ], // 5
    [maxX, maxY, maxZ], // 6
    [minX, maxY, maxZ], // 7
  ];

  const wireframeIndices = [
    0, 1, 1, 2, 2, 3, 3, 0, // bottom face
    4, 5, 5, 6, 6, 7, 7, 4, // top face
    0, 4, 1, 5, 2, 6, 3, 7  // vertical edges
  ];

  return {
    positions: cubeVerts.flat(),
    indices: wireframeIndices,
  };
}

export function drawWireFrameCube(gl, shader, wireFrameCubeData, collBuffers) {

    const wireData = wireFrameCubeData;
    const wireModel = mat4.create();
    const wireShader = shader;
    wireShader.use();
    wireShader.setColor(1,1,1,1);    
    wireShader.setModelMatrix(wireModel);
    //wireShader.setUniforms(viewMatrix, projectionMatrix, wireModel); 

    const positionBuffer = collBuffers.position;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(wireShader.attribLocations.position);
    gl.vertexAttribPointer(wireShader.attribLocations.position, 3, gl.FLOAT, false, 0, 0);

    const indexBuffer = collBuffers.index;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.drawElements(gl.LINES, collBuffers.count, gl.UNSIGNED_SHORT, 0);

}



