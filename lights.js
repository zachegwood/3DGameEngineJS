import { vec3, vec4 } from 'https://cdn.jsdelivr.net/npm/gl-matrix@3.4.3/esm/index.js';

export class Light {
    constructor (position, color, intensity = 1.0) {
        this.position = position; // position in world space (vec3)
        this.color = color; // light color (vec3 or vec4)
        this.intensity = intensity; // intensity of the light (float)
    }
}