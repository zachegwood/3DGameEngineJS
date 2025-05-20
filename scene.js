// Each SceneNode handles parent/child relationships
// The SceneNode parent gets called from main to run its draw and update function
// This recursively runs on all children

import { mat4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';

export class SceneNode {
    constructor() {
        this.children = [];
        this.localMatrix = mat4.create();
        this.worldMatrix = mat4.create();
        this.id = `defaultSceneNode`;
    }

    add(child) {
        this.children.push(child);
        child.parent = this;
    }

    updateWorldMatrix(parentMatrix) {

        if (parentMatrix) {
            mat4.multiply(this.worldMatrix, parentMatrix, this.localMatrix);
        } else {
            mat4.copy(this.worldMatrix, this.localMatrix);
        }

        for (let child of this.children) {
            child.updateWorldMatrix(this.worldMatrix);
        }
    }

    update(deltaTime) {
        for (let child of this.children) {
            if (child.update) child.update(deltaTime);
        }
    }

    draw(gl, viewMatrix, projectionMatrix, lights) {
        for (let child of this.children) {
            if (child.draw)  child.draw(gl, viewMatrix, projectionMatrix, lights);
        }
    }
}