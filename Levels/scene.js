// Each SceneNode handles parent/child relationships
// The SceneNode parent gets called from main to run its draw and update function
// This recursively runs on all children

import { mat4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';
import { extractFrustumPlanes, isAABBInFrustum, setFrustumPlanes } from '../frustum.js'

const entities = [];
const visibleEntities = [];

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

        // Add to the global array of all entities
        entities.push(child);
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

    update(deltaTime, gl) {
        for (let child of this.children) {
            if (child.update) child.update(deltaTime, gl);
        }
    }

    draw(gl, viewMatrix, projectionMatrix, lights, isRoot = false, cullingCamera = null) {

        if (cullingCamera === null) return;

        if (isRoot) {
            
            visibleEntities.length = 0; // reset array

        }

        let frustumPlanes = null;
        
        if (cullingCamera) {
            frustumPlanes = extractFrustumPlanes(cullingCamera.getViewMatrix(), projectionMatrix);
            setFrustumPlanes(frustumPlanes);
        }

        for (let child of this.children) {

            child.isVisible = false; // will turn on after check below. makes debug colliders turn off

            //console.log(`${this.children.indexOf(child)} --< ${child.id}`);

            //if (child.id.startsWith("terrain_chunk")) console.log("here => one");

            let shouldDraw = false;

            //if (typeof child.draw === 'function') {

                // Draw even if there's no mesh or anything, bc why not.
                // Also don't cull the player
                if (!child.aabb || child.alwaysVisible === true)                   
                {
                    shouldDraw = true;
                } else if (isAABBInFrustum(child.worldAABB, frustumPlanes)) {
                    shouldDraw = true;
                } else {
                    //console.log(`culling this: ${child.id}`);
                }
            //}

            if (shouldDraw === true) { 
                child.isVisible = true;
                visibleEntities.push(child);
                child.draw(gl, viewMatrix, projectionMatrix, lights);
                
            } 
        }

        // console.log(`[ ${visibleEntities.length}/${this.children.length} ] visible entities.`);
        //for (let x = 0; x < visibleEntities.length; x++) console.log(visibleEntities[x].id);
        
         
    }
}