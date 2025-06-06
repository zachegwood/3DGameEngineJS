// AABB bounding boxes

import { mat4, vec3, vec4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';
import { Raycast } from './debug.js';


export class CollisionSystem {
    constructor() { 
        this.colliders = []; // An array of entities. Colliders are entity.getCollider()
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

        // Reset vars so that collider color resets to white, not red
        thisEntity.isOverlappingFirstCollider = false;
        const myCollider = thisEntity.getCollider();

        this.colliders.forEach(c => {

            if (c.id === thisEntity.id) return; // skip self
            
            const otherCollider = c.getCollider();

            c.isOverlappingFirstCollider = false;

            if (aabbIntersects(myCollider, otherCollider)) {
                c.isOverlappingFirstCollider = true;
                thisEntity.isOverlappingFirstCollider = true;

                if (thisEntity.allColliders) thisEntity.allColliders.push(otherCollider);

            } else {
                c.isOverlappingFirstdCollider = false;
            }
        });
    }

        //#region Sphere Vs AABB
        // Clamp sphere's center to nearest point INSIDE AABB; check if point is close enough to collide
    sphereVsAABBCollide(sphere, entityID) {    
        
        let totalCorrection = vec3.create(); // accumulated pushback from all colliders
        let sumNormals = vec3.create();
        let collided = false;
        const hitInfo = [];

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

                if (c.aabb.colType === `trigger`) { 
                    // console.log(`Player activated a trigger box: ${c.id} is a triggerBox. 
                    //     For now, just skip this collider. Later, add in logic.`);
                    continue;
                }

                collided = true;

                const diff = vec3.subtract(vec3.create(), sphere.center, closest);
                const dist = vec3.length(diff);
                const penetrationDepth = sphere.radius - dist;  

                if (dist === 0) continue; // Avoid NaNs from zero-length normal

                // the normal vector of the collided surface
                const normal = vec3.normalize(vec3.create(), diff, 1 / dist); // normalized

                // accumulate normal
                vec3.add(sumNormals, sumNormals, normal);

                // Accumulate MTV correction 
                const correction = vec3.scale(vec3.create(), normal, penetrationDepth);
                vec3.add(totalCorrection, totalCorrection, correction);
                

                Raycast(closest, normal, 5, [0,1,1,1]);

                hitInfo.push( { normal: normal, penetrationDepth: penetrationDepth, } );

                // // Early exit on first collision
                // return {
                //     collided: true,
                //     normal: normal,
                //     penetrationDepth: penetrationDepth,
                // }
            }
        }

        // return { collided: false };

        return {
            collided,
            totalCorrection,
            sumNormals,
            hitInfo,
        };
    }
}

export function aabbIntersects(a,b) {
    return (
        a.min[0] <= b.max[0] && a.max[0] >= b.min[0] && // X
        a.min[1] <= b.max[1] && a.max[1] >= b.min[1] && // Y
        a.min[2] <= b.max[2] && a.max[2] >= b.min[2]    // Z
    );
}



//}

// function updatePlayerAABB(position, size) {
//     const halfSize = size.map(s => s / 2);
//     return {
//         min: [
//             position[0] - halfSize[0],
//             position[1] - halfSize[1],
//             position[2] - halfSize[2]
//         ],
//         max: [
//             position[0] + halfSize[0],
//             position[1] + halfSize[1],
//             position[2] + halfSize[2]
//         ]
//     };
// }

//#region Try Move Player
// function tryMovePlayer(playerPos, velocity, size, levelBoxes) {
//     const nextPos = [
//         playerPos[0] + velocity[0],
//         playerPos[1] + velocity[1],
//         playerPos[2] + velocity[2]
//     ];

//     const nextAABB = updatePlayerAABB(nextPos, size);

//     for (const box of levelBoxes) {
//         if (aabbIntersects(nextAABB, box)) {
//             return playerPos; // Blocked, stay in place
//         }
//     }

//     return nextPos // No collision, move
// }

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
export function drawWireFrameCube(gl, shader, collBuffers, wireModel, colorToDraw, view, project) {

    shader.use();

    shader.setUniforms(view, project, wireModel, colorToDraw);

    //shader.setColor(1,1,1,1);   
    //shader.setColor(...colorToDraw);
    //shader.setModelMatrix(wireModel);

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


