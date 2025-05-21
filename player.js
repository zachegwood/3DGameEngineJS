import { vec3, mat4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';
import { getMovementVector } from "./controls.js"; // also provides movement vector
import { forwardMovementVector, rightMovementVector } from './camera.js';
import { Entity } from './entity.js'
import { collisionSystem } from './main.js';
import { aabbIntersects } from './collisions.js';


// Player inherits from Entity for Draw()


const SPEED = 3;
const PLAYER_HEIGHT = 1; // size of mesh
const ROTATE_SPEED = 10; // radians per second


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
        const startPos = vec3.fromValues(-2, PLAYER_HEIGHT/2, 2);

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

        
    }

    update(dt) {

        this.movePlayer(dt);

        collisionSystem.checkAllCollisions(this.worldAABB);       
        
    }

    movePlayer(dt) {

        const inputVec = getMovementVector(); // ex [1.0, 0.0, 0.7] Player Input

        const movement = vec3.create();
        const forwardComponent = vec3.create();
        const rightComponent = vec3.create();

        // Convert movement to world-space. IE, forward moves INTO 3D space
        vec3.scale(forwardComponent, forwardMovementVector, inputVec[2]); // z input
        vec3.scale(rightComponent, rightMovementVector, inputVec[0]); // x input

        vec3.add(movement, forwardComponent, rightComponent);

        // Move Player
        // Rotate if there's rotation  
        if (vec3.length(movement) > 0.001) {

            vec3.normalize(movement, movement); // Normalize to prevent diagonal speedup
            vec3.scale(movement, movement, SPEED * dt);
            vec3.add(this.position, this.position, movement);    // move position

            // Update target facing angle based on movement direciton, to interpolate later
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


