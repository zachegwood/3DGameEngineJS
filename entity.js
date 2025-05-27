// A physical object in the world. Can be alive or not.
// Contains a mesh. 
// This is the proper way to translate/scale/etc a mesh.

import { mat4, vec3, vec4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';
import { drawWireFrameCube, findWireFrameCube } from './collisions.js';
import { myShaders, collisionSystem } from './main.js'
import { debugSettings } from './debug.js';
import { getWorldAABB } from './collisions.js';

import { createSphere } from './meshShapes.js';


//#region Entity Class
export class Entity {
    constructor({
        mesh, 
        position = [0, 0, 0], 
        rotation = [0, 0, 0],
        scaleVector = [1, 1, 1], 
        shader,
        color,
        texture,
        material,
        id,
        aabb, //min/max passed from Mesh during creation
    }) {
        this.mesh = mesh;
        this.shader = shader;
        this.color = color;
        this.texture = texture;
        this.material = material;

        this.position = vec3.clone(position);
        this.rotation = rotation // Euler rotation in radians: [x, y, z]
        this.scaleVector = vec3.clone(scaleVector);
        
        this.modelMatrix = mat4.create();        
        this.closestLights = null; // use function below, called from MAIN
        this.updateMatrix(); // calls the function below

        this.isOverlappingFirstCollider = false; // set dynamically from collider.js. Used to change collider color in draw()
        this.isOverlappingSecondCollider = false;

        this.id = id;

        this.secondCollider = null; // will need for player, enemies
        

        if (this.mesh) {            

            this.aabb = this.mesh.aabb;    
            this.mesh.myEntity = this.id; // name the mesh

            this.updateCollider();

            this.worldAABB = getWorldAABB(this.aabb.min, this.aabb.max, this.modelMatrix);

            collisionSystem.add(this); // add this entity to the list of colliders to check against
        }
    }

    // Called from Collisions.js
    getCollider() {
        return this.worldAABB;
    }

    updateMatrix() {

        const t = mat4.create();
        const r = mat4.create();
        const s = mat4.create();

        mat4.fromTranslation(t, this.position);
        mat4.fromScaling(s, this.scaleVector);

        mat4.identity(r);
        mat4.rotateX(r, r, this.rotation[0]);
        mat4.rotateY(r, r, this.rotation[1]);
        mat4.rotateZ(r, r, this.rotation[2]);

        // modelMatrix = T * R * S
        mat4.multiply(this.modelMatrix, t, r);
        mat4.multiply(this.modelMatrix, this.modelMatrix, s);

    }

        //#region UpdateColl()
    updateCollider() { 

        if (!this.mesh) return;
        
        const gl = this.mesh.gl; 
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.mesh.collider.positions), gl.STATIC_DRAW);

        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.mesh.collider.indices), gl.STATIC_DRAW);

        this.collBuffers = {
            position: positionBuffer,
            index: indexBuffer,
            count: this.mesh.collider.indices.length,
        }        
    }

    //#region Draw()
    draw(gl, view, projection, allLights) {

        if (!this.shader) return;

        this.shader.use();  
        this.shader.setUniforms(view, projection, this.modelMatrix, this.color, this.texture);
        
        if (allLights) {
            this.closeLights = this.getClosestLights(allLights);
            this.mesh.draw(this.shader, this.closeLights);

        } else {
            this.mesh.draw(this.shader);
        }        

        if (this.mesh && this.aabb) {            

            this.worldAABB = getWorldAABB(this.aabb.min, this.aabb.max, this.modelMatrix);

            if (debugSettings.COLLIDERS === true) {

                const aabbWireData = findWireFrameCube(this.worldAABB.min, this.worldAABB.max);
                const localWireData = findWireFrameCube(this.aabb.min, this.aabb.max);

                this.debugWireFrameCube(gl, aabbWireData);        
                //this.debugWireFrameCube(gl, localWireData);   

                if (this.secondCollider !== null && this.isOverlappingFirstCollider) { // draw sphere collider

                    const wireModelMatrix = mat4.create();
                    mat4.fromTranslation(wireModelMatrix, this.position);  
                    this.debugWireFrameCube(gl, this.secondCollider, wireModelMatrix);
                    
                }
                
            }
        };
    }

    //#region Debug Cube
    debugWireFrameCube(gl, wireData, model = mat4.create()) {       

        // Upload new AABB collider geometry to the GPU
        gl.bindBuffer(gl.ARRAY_BUFFER, this.collBuffers.position);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(wireData.positions), gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.collBuffers.index);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(wireData.indices), gl.STATIC_DRAW);
        this.collBuffers.count = wireData.indices.length;

        // color of wireframe boxes
        let colorToDrawWireframe = new Float32Array([1,1,1,1]); // default wireframe color. change below if overlapping
        if (this.isOverlappingFirstCollider === true) { // set dynamically from collider.js
            colorToDrawWireframe = new Float32Array([1,0,0,1]); // change to red
        }         

        drawWireFrameCube(
            this.mesh.gl, 
            myShaders.SolidColor, 
            this.collBuffers, 
            model, // AABB will use mat4.create (identity matrix). second sphere collider uses a matrix model
            colorToDrawWireframe // color from above
        );  

    }

    // used for testing velocity collisions
    offsetAABB(aabb, velocity) {
        return {
            min: vec3.add(vec3.create(), aabb.min, velocity),
            max: vec3.add(vec3.create(), aabb.max, velocity)
        }
    }

    //#region Closest Lights

    getClosestLights(allLights, maxLights = 4) {
        const pos = this.position;
        return allLights
            .map(light => ({
                light,
                dist: vec3.distance(pos, light.position),
            }))
            .sort((a, b) => a.dist - b.dist)
            .slice(0,  maxLights)
            .map(entry => entry.light);      
    }

        // Unified transformation setters

    translate(x, y, z) {
        vec3.add(this.position, this.position, [x, y, z]);
        this.updateMatrix();
    }

    scale(x, y, z) {
        this.scaleVector = vec3.fromValues(x, y, z);
        this.updateMatrix();
    }

    rotateX(angle) {
        this.rotation[0] += angle;
        this.updateMatrix();
    }

    rotateY(angle) {
        this.rotation[1] += angle;
        this.updateMatrix();
    }

    rotateZ(angle) {
        this.rotation[2] += angle;
        this.updateMatrix();
    }
}