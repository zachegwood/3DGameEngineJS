import { vec3, mat4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';
import { getMovementVector } from "./controls.js"; // also provides movement vector
import { forwardMovementVector, rightMovementVector } from './camera.js';
import { Entity } from './entity.js'
import { collisionSystem } from './main.js';
import { aabbIntersects,  } from './collisions.js';
import { createSphere } from './meshShapes.js';


// Player inherits from Entity for Draw()


const SPEED = 3;
const PLAYER_HEIGHT = 1; // size of mesh
const ROTATE_SPEED = 10; // radians per second
const SPHERE_RADIUS = 0.8;


export class Player extends Entity {
    constructor( 
    { 
        mesh, 
        shader,
        color,
        texture,
        material,
        id,
        aabb,
    }) {
        const startPos = vec3.fromValues(-5, PLAYER_HEIGHT/2, 2);

        // Call Entity constructor
        super({
            mesh, 
            shader,
            color,
            texture,
            material,
            id,
            aabb,
            position: startPos,
            scaleVector: [1, 1, 1],
        });
        
        this.velocity = vec3.create();        
        this.facingAngle = 0;
        this.currentAngle = 0; // visible rotation used for interpolation     

        const wireSphere = createSphere(SPHERE_RADIUS);
        this.secondCollider = wireSphere; // for player, enemies
                           const wireModelMatrix = mat4.create();
                    mat4.fromTranslation(wireModelMatrix, this.position);   

        
        
    }

    update(dt) {

        this.movePlayer(dt);
        collisionSystem.checkAllCollisions(this); 
    }

    // draw(gl) {
    //     super.draw(gl, view, projection, allLights);
    //     const wireSphere = createSphere(1);
    //     const wireModelMatrix = mat4.create();
    //     mat4.fromTranslation(wireModelMatrix, this.position);
    //     this.debugWireFrameCube(gl, wireSphere, wireModelMatrix);

    // }

    movePlayer(dt) {

        const inputVec = getMovementVector(); // ex [1.0, 0.0, 0.7] Player Input
        const movement = vec3.create();
        const forwardComponent = vec3.create();
        const rightComponent = vec3.create();

        // Convert movement to world-space. IE, forward moves INTO 3D space
        vec3.scale(forwardComponent, forwardMovementVector, inputVec[2]); // z input
        vec3.scale(rightComponent, rightMovementVector, inputVec[0]); // x input
        vec3.add(movement, forwardComponent, rightComponent); // combine scale and movement

        // Move Player
        // Rotate if there's rotation  
        if (vec3.length(movement) > 0.001) {

            vec3.normalize(movement, movement); // Normalize to prevent diagonal speedup
            vec3.scale(movement, movement, SPEED * dt);

            // Stop here, check collisions
            //console.log("player world aabb is ", this.worldAABB);


            if (this.isOverlappingFirstCollider === true) { // something is inside the AABB

                //const potentialPos = this.offsetAABB(this.worldAABB, movement); // where we're trying to move
                //const potentialPos = this.offsetAABB(this.secondCollider, movement); // where we're trying to move

                const movedCenter = vec3.add(vec3.create(), this.position, movement);
                const sphere = { center: movedCenter, radius: SPHERE_RADIUS };

                const hit = collisionSystem.sphereVsAABBCollide(sphere, this.id);

               // if (collisionSystem.manualCollisionCheck(potentialPos, this.id) === false) {
               if (hit?.collided === true) {  // something is hitting our REAL collider
                    
                    console.log("collision true");
                    console.log(`normal vector is ${hit.normal}`);

                    // Move player out of the wall by penetration depth
                    if (hit.penetrationDepth > 0.001)
                        vec3.scaleAndAdd(this.position, this.position, hit.normal, hit.penetrationDepth);
                    
                    

                    // stop movement in normal dir only
                    let movementIntoWall = vec3.dot(movement, hit.normal); // how much of movement is into wall
                    let slideVec = vec3.scale(vec3.create(), hit.normal, movementIntoWall); // project onto normal
                    vec3.subtract(slideVec, movement, slideVec);

                    vec3.add(this.position, this.position, slideVec);    // move position

                } else { 
                    vec3.add(this.position, this.position, movement);    // move position
                    console.log("collision false");
                }

            } else {
                vec3.add(this.position, this.position, movement);    // move position
            }

            // Update target facing angle based on movement direciton, to interpolate below
            this.facingAngle = Math.atan2(movement[0], movement[2]); // yaw angle in Y
        } 

        // Smoothly interpolate currentAngle towards facingAngle
        const angleDiff = this._shortestAngleDiff(this.currentAngle, this.facingAngle);
        this.currentAngle += angleDiff * Math.min( 1, ROTATE_SPEED * dt);

        // Build rotation matrix from current visible angle
        const rotation = mat4.create();
        mat4.fromYRotation(rotation, this.currentAngle);

        const translation = mat4.create();
        mat4.fromTranslation(translation, this.position);

        // combine rotation and translation
        mat4.mul(this.modelMatrix, translation, rotation); // rotation * translationa
    }

    _shortestAngleDiff(current, target) {
        let diff = target - current;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return diff;
    }

    
}


