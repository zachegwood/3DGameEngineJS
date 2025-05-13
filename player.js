import { vec3, mat4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';
import { getMovementVector } from "./controls.js"; // also provides movement vector
import { forwardMovementVector, rightMovementVector } from './camera.js';


const SPEED = 3;
const PLAYER_HEIGHT = 1; // size of mesh


export class Player {
    constructor(mesh) {
        this.position = vec3.create();
        this.velocity = vec3.create();
        this.mesh = mesh;
        this.modelMatrix = mat4.create();

        // offset Y position by half size of cube, so we're ON the floor
        this.position[1] = PLAYER_HEIGHT/2;
    }

    update(dt) {

        const inputVec = getMovementVector(); // ex [1.0, 0.0, 0.7]

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

        mat4.fromTranslation(this.modelMatrix, this.position);

    }

    draw(shader) {
        shader.setModelMatrix(this.modelMatrix);
        this.mesh.draw(shader);
    }
}

