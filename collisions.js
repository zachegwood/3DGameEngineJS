// AABB bounding boxes

import { mat4, vec3, vec4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';


export class CollisionSystem {
    constructor() { 
        this.colliders = []; // An array ofe entities. Colliders are entity.getCollider()
    }

    add(entity) {
        this.colliders.push( entity );
        //console.log(`added ${entity.id}`);
    }

    remove(collider) {
        const index = this.colliders.indexOf(collider); // if it exists. collider is {aabb, gameObject}
        if (index !== -1) {
            this.colliders.splice(index, 1);
            console.log(`removed ${collider.id} from colliders`);
        }
    }

    //#region Check Collisions
    checkAllCollisions(thisEntity) {

        // Reset vars so that collider color is white, not red
        thisEntity.isOverlappingFirstCollider = false;
        const myCollider = thisEntity.getCollider();

        this.colliders.forEach(c => {

            if (c.id === thisEntity.id) return; // skip self
            
            const otherCollider = c.getCollider();

            if (aabbIntersects(myCollider, otherCollider)) {
                c.isOverlappingFirstCollider = true;
                thisEntity.isOverlappingFirstCollider = true;
            } else {
                c.isOverlappingFirstdCollider = false;
            }
        });
        //return;
    }

    // Used when attempting to move. Pass in the potential next AABB
    manualCollisionCheck(manualCollider, entityID) {

        for (const c of this.colliders) {

            if (c.id === entityID) continue; // skip self

            if (aabbIntersects(manualCollider, c.getCollider())) {
                console.log("collided potentially");
                return true;
            }
        }

        return false;

    }


        // Clamp sphere's center to nearest point INSIDE AABB; check if point is close enough to collide
    sphereVsAABBCollide(sphere, entityID) {        

        for (const c of this.colliders) {
            if (c.id === entityID) continue; // skip self

            const otherCollider = c.getCollider();            
            const closest = vec3.fromValues(
                Math.max(otherCollider.min[0], Math.min(sphere.center[0], otherCollider.max[0])),
                Math.max(otherCollider.min[1], Math.min(sphere.center[1], otherCollider.max[1])),
                Math.max(otherCollider.min[2], Math.min(sphere.center[2], otherCollider.max[2])),
            );

            const distSq = vec3.squaredDistance(sphere.center, closest);

            if (distSq <= sphere.radius * sphere.radius) {

                return true; // Early exit on first collision
            }
        }

        return false;
    }

    //         if (aabbIntersects(manualCollider, c.getCollider())) {
    //             console.log("collided potentially");
    //             return true;
    //         }
    //     }

    //     return false;





    // return distSq <= sphere.radius * sphere.radius;
}

export function aabbIntersects(a,b) {
    return (
        a.min[0] <= b.max[0] && a.max[0] >= b.min[0] && // X
        a.min[1] <= b.max[1] && a.max[1] >= b.min[1] && // Y
        a.min[2] <= b.max[2] && a.max[2] >= b.min[2]    // Z
    );
}



//}

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

//#region Try Move Player
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

// Given a cube, find the corners in LOCAL SPACE
function findCubeCorners(min, max) {
    return [
        [min[0], min[1], min[2]],
        [max[0], min[1], min[2]],
        [max[0], max[1], min[2]],
        [min[0], max[1], min[2]],
        [min[0], min[1], max[2]],
        [max[0], min[1], max[2]],
        [max[0], max[1], max[2]],
        [min[0], max[1], max[2]],
    ];
}

//#region Find  Wire Cube
export function findWireFrameCube(min, max) {

    const cubeVerts = findCubeCorners(min, max); // get localspace corners

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

//#region Draw Wire Cube
export function drawWireFrameCube(gl, shader, collBuffers, wireModel, colorToDraw) {

    shader.use();
    //shader.setColor(1,1,1,1);   
    shader.setColor(...colorToDraw);
    shader.setModelMatrix(wireModel);

    const positionBuffer = collBuffers.position;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(shader.attribLocations.position);
    gl.vertexAttribPointer(shader.attribLocations.position, 3, gl.FLOAT, false, 0, 0);

    const indexBuffer = collBuffers.index;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.drawElements(gl.LINES, collBuffers.count, gl.UNSIGNED_SHORT, 0);

}



//#region World AABB
// Once the local cube has rotated, find the larger AABB that surrounds the rotated cube (AABB is not rotated)
export function getWorldAABB(localMin, localMax, modelMatrix) {

    const corners = findCubeCorners(localMin, localMax);

    const transformed = corners.map(corner => {
        const v = vec3.transformMat4(vec3.create(), corner, modelMatrix);
        return v;
    });

    const min = vec3.clone(transformed[0]);
    const max = vec3.clone(transformed[0]);

    for (let i = 1; i < transformed.length; i++) {
        vec3.min(min, min, transformed[i]);
        vec3.max(max, max, transformed[i]);
    }

    return { min, max };
}


