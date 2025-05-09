import { vec3, mat4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';
import { getMovementVector } from "./controls.js"; // also provides movement vector
import { forwardMovementVector, rightMovementVector } from './camera.js';


const SPEED = 1;


export class Player {
    constructor(mesh) {
        this.position = vec3.create();
        this.velocity = vec3.create();
        this.mesh = mesh;
        this.modelMatrix = mat4.create();
    }

    update(dt) {
        //console.log(`inside player update`);

        const inputVec = getMovementVector(); // ex [1.0, 0.0, 0.7]

       // if (vec3.length(inputVec) === 0) return; // No movement. Return.

        const movement = vec3.create();

        // Project input onto world space using camera direction
        const forwardComponent = vec3.create();
        const rightComponent = vec3.create();

        vec3.scale(forwardComponent, forwardMovementVector, inputVec[2]); // z input
        vec3.scale(rightComponent, rightMovementVector, inputVec[0]); // x input

        vec3.add(movement, forwardComponent, rightComponent);
        vec3.normalize(movement, movement); // Normalize to prevent diagonal speedup
        vec3.scale(movement, movement, SPEED * dt);

        vec3.add(this.position, this.position, movement);
            console.log(" Position is : " + this.position);
    console.log(" MovementVector is : " + getMovementVector());
    console.log("dt is: " + dt);

        //mat4.fromTranslation(this.modelMatrix, this.position);

       //this.position[0] += 0.1;  // Just move in the X direction for testing
    mat4.fromTranslation(this.modelMatrix, this.position);
    mat4.copy(this.mesh.modelMatrix, this.modelMatrix);



        console.log(this.modelMatrix);

    }

    draw(gl, shader, viewMatrix, projectionMatrix) {

        shader.use();

        shader.setUniforms(viewMatrix, projectionMatrix, null, [1.0, 0.0, 0.0, 1.0]);
        //gl.uniform3f(shader.uniformLocations.lightDirection, -1.0, -1.0, 0.5); // Example direction

        this.mesh.draw(shader);
    }
}

