import { vec3, mat4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';
import { getMovementVector } from "./controls.js"; // also provides movement vector
//import { forwardMovementVector, rightMovementVector } from './camera.js';
import { Entity } from './entity.js'
import { collisionSystem } from './main.js';
import { aabbIntersects,  } from './collisions.js';
import { createSphere } from './meshShapes.js';


// Player inherits from Entity for Draw()


const SPEED = 100;
const PLAYER_HEIGHT = 1; // size of mesh
const ROTATE_SPEED = 10; // radians per second
const SPHERE_RADIUS = 0.8;
const PLAYER_START = vec3.fromValues(0, PLAYER_HEIGHT + 50, 0);
const GRAVITY = 0;



//#region Player Class
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
        //const startPos = vec3.fromValues(-5, PLAYER_HEIGHT, -10);
        const startPos = PLAYER_START;

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
        
        this.grounded = false;

        const wireSphere = createSphere(SPHERE_RADIUS);
        this.secondCollider = wireSphere; // for player, enemies
                           const wireModelMatrix = mat4.create();
                    mat4.fromTranslation(wireModelMatrix, this.position);          

        this.allColliders = [] // every collider my sphere is touching

        this.alwaysVisible = true; // prevent frustum culling

        this.camera = null;
        
    }

    //#region Update
    update(dt) {
        
        this.movePlayer(dt);
        collisionSystem.checkAllCollisions(this); 
    }


    _collidesAny() {
        const sphere = { center: this.position, radius: SPHERE_RADIUS };
        // or use your world-AABB test if you prefer AABB vs AABB
        return collisionSystem.sphereVsAABBCollide(sphere, this.id).collided;
    }


    movePlayer(dt) {
        // Apply gravity
        if (!this.grounded) { 
            this.velocity[1] -= GRAVITY * dt;
        } else {
            this.velocity[1] = 0;
        }

        // Get normalized input direction
        const controllerMovement = getMovementVector(); // [x, 0, z]
        const inputVector = vec3.create();

        const forwardComponent = vec3.create();
        const rightComponent = vec3.create();

        // Convert movement to world-space. IE, forward moves INTO 3D space
        vec3.scale(forwardComponent, this.camera.forwardMovementVector, controllerMovement[2]); // z input
        vec3.scale(rightComponent, this.camera.rightMovementVector, controllerMovement[0]); // x input
        vec3.add(inputVector, forwardComponent, rightComponent); // combine scale and movement

        if (vec3.length(inputVector) > 0.001) {
            vec3.normalize(inputVector, inputVector);
            const moveVelocity = vec3.create();
            vec3.scale(moveVelocity, inputVector, SPEED);
            
            // Set horizontal velocity (keep vertical velocity)
            this.velocity[0] = moveVelocity[0];
            this.velocity[2] = moveVelocity[2];

            // Face in movement direction
            this.facingAngle = Math.atan2(inputVector[0], inputVector[2]);
        } else {
            // No input? Stop horizontal motion
            this.velocity[0] = 0;
            this.velocity[2] = 0;
        }


  // your proposed deltas
  const dx = this.velocity[0] * dt;
  const dy = this.velocity[1] * dt;
  const dz = this.velocity[2] * dt;

  // 2) X-axis
  this.position[0] += dx;
  if (this._collidesAny()) {
    this.position[0] -= dx;
    this.velocity[0] = 0;
  }

  // 3) Z-axis
  this.position[2] += dz;
  if (this._collidesAny()) {
    this.position[2] -= dz;
    this.velocity[2] = 0;
  }

  // 4) Y-axis (gravity & ground) — exact correction version
this.position[1] += dy;

const hitY = collisionSystem.sphereVsAABBCollide(
  { center: this.position, radius: SPHERE_RADIUS },
  this.id
);

if (hitY.collided) {
  // Find any “floor” contacts
  const groundHits = hitY.hitInfo.filter(h => vec3.dot(h.normal, [0,1,0]) > 0.7);

  if (groundHits.length > 0) {
    // We’re on the ground
    this.grounded = true;
    this.velocity[1] = 0;

    // Compute the maximum vertical correction needed
    // (penetrationDepth along the Y-axis)
    const maxPenY = Math.max(
      ...groundHits.map(h => h.penetrationDepth * h.normal[1])
    );

    // Snap exactly up by that amount
    this.position[1] += maxPenY;
  } else {
    // It was a “ceiling” or side hit: just zero vertical motion
    this.velocity[1] = 0;
    // Snap by totalCorrection’s Y component so you don’t get stuck in the ceiling
    this.position[1] += hitY.totalCorrection[1];
    this.grounded = false;
  }
} else {
  // Free fall
  this.grounded = false;
}

  // 4) Y-axis (gravity & ground)
//   this.position[1] += dy;
//   if (this._collidesAny()) {
//     // hit something vertically
//     // push back up until no overlap
//     while (this._collidesAny()) {
//       this.position[1] += 0.01;  // small step up
//     }
//     this.velocity[1] = 0;
//     this.grounded = true;
//   } else {
//     this.grounded = false;
//   }






        // // Predict new position
        // const proposedPosition = vec3.create();
        // vec3.scaleAndAdd(proposedPosition, this.position, this.velocity, dt);

        // if (this.isOverlappingFirstCollider === true) {

        //     console.log(`player touching ${this.allColliders.length} colliders`);

        //     // Collision test using projected sphere
        //     const sphere = { center: proposedPosition, radius: SPHERE_RADIUS };

        //     let newGround = false;
        //     this.allColliders = [];
        //     this.isOverlappingFirstCollider = false;




        //     //for (let x = 0; x < this.allColliders.length; x++) {

        //         const hit = collisionSystem.sphereVsAABBCollide(sphere, this.id);

        //         //this.grounded = false;

                

        //         if (hit?.collided) {

        //             //for (const hitInfo of hit.hitInfo) {

        //                 // Fix penetration
        //                 vec3.add(this.position, this.position, hit.totalCorrection);

        //                 // single average normal
        //                 vec3.normalize(hit.sumNormals, hit.sumNormals);

        //                 // slide: remove the velocity component into that normal
        //                 const intoWall = vec3.dot(this.velocity, hit.sumNormals);
        //                 if (intoWall < 0) {
        //                     const slide = vec3.scale(vec3.create(), hit.sumNormals, intoWall);
        //                     vec3.subtract(this.velocity, this.velocity, slide);
        //                 }

        //                 // Apply (slid) velocity
        //                 vec3.scaleAndAdd(this.position, this.position, this.velocity, dt);

        //                 this.grounded = hit.hitInfo.some(h => vec3.dot(h.normal, [0,1,0]) > 0.7);
        //                 console.log(`are we grounded? ${this.grounded}`);




        //                 // // Is this the ground?
        //                 // if (vec3.dot(hitInfo.normal, [0,1,0]) > 0.7) {
        //                 //     this.grounded = true;
        //                 //     console.log("grounded");
        //                 //     newGround = true;
        //                 // }



        //                 // // Slide: remove velocity into wall
        //                 // const intoWall = vec3.dot(this.velocity, hitInfo.normal);
        //                 // if (intoWall < 0) {
        //                 //     const slideVec = vec3.scale(vec3.create(), hitInfo.normal, intoWall);
        //                 //     vec3.subtract(this.velocity, this.velocity, slideVec);
        //                 // }

        //                 // vec3.scaleAndAdd(this.position, this.position, this.velocity, dt);

        //                 // if (hitInfo.penetrationDepth > 0.01) {
        //                 //     // Move out of wall
        //                 //     vec3.scaleAndAdd(this.position, this.position, hitInfo.normal, hitInfo.penetrationDepth);
        //                 // }

        //                 // const slideVec = vec3.scale(vec3.create(), hitInfo.normal, intoWall);
        //                 // vec3.subtract(slideVec, this.velocity, slideVec);
        //                 // vec3.scaleAndAdd(this.position, this.position, slideVec, dt);
        //             //}

        //         } else {
        //             // No collision, just move
        //             vec3.copy(this.position, proposedPosition);
        //         }
        //     //}

        //     // empty collider array
        //     this.allColliders = [];
        //     if (newGround === false) this.grounded = false;

        // } else {
        //     // No collision, just move
        //     vec3.copy(this.position, proposedPosition);
        // }

        // Smooth rotation
        const angleDiff = this._shortestAngleDiff(this.currentAngle, this.facingAngle);
        this.currentAngle += angleDiff * Math.min(1, ROTATE_SPEED * dt);

        // Apply transform
        const rotation = mat4.create();
        mat4.fromYRotation(rotation, this.currentAngle);

        const translation = mat4.create();
        mat4.fromTranslation(translation, this.position);

        mat4.mul(this.modelMatrix, translation, rotation);
    }







    // //#region Move
    // movePlayer(dt) {

    //     // gravity
    //     this.velocity[1] += GRAVITY * dt;

    //     const inputVec = getMovementVector(); // ex [1.0, 0.0, 0.7] Player Input
    //     const movement = vec3.create();
    //     const forwardComponent = vec3.create();
    //     const rightComponent = vec3.create();

    //     // Convert movement to world-space. IE, forward moves INTO 3D space
    //     vec3.scale(forwardComponent, forwardMovementVector, inputVec[2]); // z input
    //     vec3.scale(rightComponent, rightMovementVector, inputVec[0]); // x input
    //     vec3.add(movement, forwardComponent, rightComponent); // combine scale and movement

    //     // Move Player
    //     // Rotate if there's rotation  
    //     if (vec3.length(movement) > 0.001) {

    //         vec3.normalize(movement, movement); // Normalize to prevent diagonal speedup
    //         vec3.scale(movement, movement, SPEED * dt);

    //         if (this.isOverlappingFirstCollider === true) { // something is inside the AABB

    //             const movedCenter = vec3.add(vec3.create(), this.position, movement);
    //             const sphere = { center: movedCenter, radius: SPHERE_RADIUS };

    //             const hit = collisionSystem.sphereVsAABBCollide(sphere, this.id);

    //            if (hit?.collided === true) {  // something is hitting our REAL collider
                    
    //                 console.log("collision true");
    //                 console.log(`normal vector is ${hit.normal}`);

    //                 // Move player out of the wall by penetration depth
    //                 if (hit.penetrationDepth > 0.01)
    //                     vec3.scaleAndAdd(this.position, this.position, hit.normal, hit.penetrationDepth); 

    //                 // stop movement in normal dir only
    //                 let movementIntoWall = vec3.dot(movement, hit.normal); // how much of movement is into wall
    //                 let slideVec = vec3.scale(vec3.create(), hit.normal, movementIntoWall); // project onto normal
    //                 vec3.subtract(slideVec, movement, slideVec);

    //                 vec3.add(this.position, this.position, slideVec);    // move position

    //             } else { 
    //                 vec3.add(this.position, this.position, movement);    // move position
    //                 console.log("collision false");
    //             }

    //         } else {

    //             vec3.copy(this.velocity, movement);
    //             vec3.add(this.position, this.position, this.velocity, dt);
    //             console.log(this.velocity);

    //             //vec3.add(this.position, this.position, movement);    // move position
    //         }

    //         // Update target facing angle based on movement direciton, to interpolate below
    //         this.facingAngle = Math.atan2(movement[0], movement[2]); // yaw angle in Y
    //     } 

    //     // Smoothly interpolate currentAngle towards facingAngle
    //     const angleDiff = this._shortestAngleDiff(this.currentAngle, this.facingAngle);
    //     this.currentAngle += angleDiff * Math.min( 1, ROTATE_SPEED * dt);

    //     // Build rotation matrix from current visible angle
    //     const rotation = mat4.create();
    //     mat4.fromYRotation(rotation, this.currentAngle);

    //     const translation = mat4.create();
    //     mat4.fromTranslation(translation, this.position);

    //     // combine rotation and translation
    //     mat4.mul(this.modelMatrix, translation, rotation); // rotation * translationa
    // }

    _shortestAngleDiff(current, target) {
        let diff = target - current;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return diff;
    }

    
}


