// A physical object in the world. Can be alive or not.
// Contains a mesh. 
// This is the proper way to translate/scale/etc a mesh.

import { mat4, vec3, vec4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';


export class Entity {
    constructor(mesh, position = [0, 0, 0], scale = [1, 1, 1]) {
        this.mesh = mesh;
        this.position = vec3.clone(position);
        this.scale = vec3.clone(scale);
        this.modelMatrix = mat4.create();
        this.updateMatrix(); // calls the function below
    }

    updateMatrix() {
        mat4.fromTranslation(this.modelMatrix, this.position);
        mat4.scale(this.modelMatrix, this.modelMatrix, this.scale);
    }

    draw(shader) {
        shader.setModelMatrix(this.modelMatrix);
        this.mesh.draw(shader);
    }

        // Helper functions
    scale(x, y, z) { mat4.scale(this.modelMatrix, this.modelMatrix, [x, y, z]); }
    translate(x, y, z) { mat4.translate(this.modelMatrix, this.modelMatrix, [x, y, z]); }
    rotateX(angle) { mat4.rotateX(this.modelMatrix, this.modelMatrix, angle); }
    rotateY(angle) { mat4.rotateY(this.modelMatrix, this.modelMatrix, angle); }
    rotateZ(angle) { mat4.rotateZ(this.modelMatrix, this.modelMatrix, angle); }
}