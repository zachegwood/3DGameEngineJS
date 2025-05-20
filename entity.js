// A physical object in the world. Can be alive or not.
// Contains a mesh. 
// This is the proper way to translate/scale/etc a mesh.

import { mat4, vec3, vec4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';
import { drawWireFrameCube, wireFrameCube } from './collisions.js';


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

        this.id = id;

        if (this.mesh && this.id) this.mesh.myEntity = this.id; // name the mesh

        this.updateCollider();
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

    updateCollider() { 

        if (!this.mesh) return;
        
        const gl = this.mesh.gl; 
        const positionBuffer = this.mesh.gl.createBuffer();
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

    // draw(shader, view, projection, allLights) {
    //     //shader.use();  
    //     //shader.setUniforms(view, projection);
    //     shader.setModelMatrix(this.modelMatrix);
    // if (allLights) {
    //         this.closeLights = this.getClosestLights(allLights);
    //         this.mesh.draw(shader, this.closeLights);

    //     } else {
    //         this.mesh.draw(shader);
    //     }        

    draw(gl, view, projection, allLights) {

        if (!this.shader) return;

        this.shader.use();  
        this.shader.setUniforms(view, projection, this.modelMatrix, this.color, this.texture);
        // this.shader.setColor(this.color);
        // this.shader.setTexture(this.texture);
        // this.shader.setModelMatrix(this.modelMatrix);
        
        if (allLights) {
            this.closeLights = this.getClosestLights(allLights);
            this.mesh.draw(this.shader, this.closeLights);

        } else {
            this.mesh.draw(this.shader);
        }        

        if (this.mesh.collider) {
                    // Draw the collider

            drawWireFrameCube(this.mesh.gl, this.mesh.shader, this.mesh.collider, this.collBuffers, this.modelMatrix);  
            console.log(`drawing collider for ${this.id}`)
        };

    
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