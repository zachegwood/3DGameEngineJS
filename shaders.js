//#region Class

// Class: Shader program + attribute/uniform locations
export class Shader {
    constructor(gl, program) {
        this.gl = gl;
        this.program = program;
        this.attribLocations = {
            position: gl.getAttribLocation(program, "a_position"),
            normal: gl.getAttribLocation(program, "a_normal"),
            uv: gl.getAttribLocation(program, "uv"), 
        };
        this.uniformLocations = {
            model: gl.getUniformLocation(program, "u_model"),
            view: gl.getUniformLocation(program, "u_view"),
            projection: gl.getUniformLocation(program, "u_projection"),
            color: gl.getUniformLocation(program, "u_color"),
            lightDirection: gl.getUniformLocation(program, "u_lightDirection"),
            textureSampler: gl.getUniformLocation(program, "textureSampler"),

            // Point Light vars
            u_lightCount: gl.getUniformLocation(this.program, 'u_lightCount'),
            u_lightPositions: gl.getUniformLocation(program, "u_lightPositions"),
            u_lightColors: gl.getUniformLocation(program, "u_lightColors"),
            u_lightIntensities: gl.getUniformLocation(program, "u_lightIntensities"),
        };
    }

    use() {
        this.gl.useProgram(this.program);
    }

    setColor(r, g, b, a) {
        this.gl.uniform4f(this.uniformLocations.color, r, g, b, a);
    }

    setUniforms(view, projection, model, color, texture = null) {
        if (view) this.gl.uniformMatrix4fv(this.uniformLocations.view, false, view);
        if (projection) this.gl.uniformMatrix4fv(this.uniformLocations.projection, false, projection); 
        if (model) this.gl.uniformMatrix4fv(this.uniformLocations.model, false, model);
        if (color) this.gl.uniform4fv(this.uniformLocations.color, color);
        if (texture !== undefined) { 
            this.gl.activeTexture(this.gl.TEXTURE0);
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
            this.gl.uniform1i(this.uniformLocations.textureSampler, 0);
        }
    }

    setModelMatrix(model) {
        this.gl.uniformMatrix4fv(this.uniformLocations.model, false, model);
    }

    setLights(lights) {

        const maxLights = 4;
        const lightPositions = [];
        const lightColors = [];
        const lightIntensities = [];

        for (let i = 0; i < maxLights; i++) {
            if (i < lights.length) {
                const l = lights[i];
                lightPositions.push(...l.position);
                lightColors.push(...l.color);
                lightIntensities.push(l.intensity);
            } else {
                // Fill unused slots with zeroes
                lightPositions.push(0,0,0);
                lightColors.push(0,0,0);
                lightIntensities.push(0,0,0);
            }
        }

        this.gl.uniform1i(this.uniformLocations.u_lightCount, Math.min(lights.length, maxLights));
        this.gl.uniform3fv(this.uniformLocations.u_lightPositions, new Float32Array(lightPositions));
        this.gl.uniform3fv(this.uniformLocations.u_lightColors, new Float32Array(lightColors));
        this.gl.uniform1fv(this.uniformLocations.u_lightIntensities, new Float32Array(lightIntensities));
    }

}

//#region Program

// Compile and link shader program
export function createProgram(gl, vsSource, fsSource) {

    function compile(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error(gl.getShaderInfoLog(shader));
        }
        return shader;
    }

    const vs = compile(gl.VERTEX_SHADER, vsSource);
    const fs = compile(gl.FRAGMENT_SHADER, fsSource);

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program));
    }

    return program;

}


//#region Create Shaders
// Passes an object of shader programs to Main.js. Access like myShaders.SolidColor
export function CreateShaders(gl) {
    
    const programTextureUV = createProgram(gl, shaders.vs_textureUV, shaders.fs_textureUV);
    const TextureUV = new Shader(gl, programTextureUV);

    const programSolidColor = createProgram(gl, shaders.vs_solidColor, shaders.fs_solidColor);
    const SolidColor = new Shader(gl, programSolidColor);

    const programLighting = createProgram(gl, shaders.vs_lighting, shaders.fs_lighting);
    const Lighting = new Shader(gl, programLighting);

    return {
        TextureUV,
        SolidColor,
        Lighting,
    }
}






//#region Shader Code






export const shaders = {

    //#region UV Texture
    // Vertex shader
    vs_textureUV: `
    attribute vec3 a_position;
    attribute vec2 uv;

    uniform mat4 u_model;
    uniform mat4 u_view;
    uniform mat4 u_projection;

    varying vec2 v_uv; // Passing UVs to the fragment shader

    void main() {
        gl_Position = u_projection * u_view * u_model * vec4(a_position, 1.0);
        v_uv = uv; // Pass UV to fragment shader
    }
    `,

    // Fragment shader
    fs_textureUV: `
    precision mediump float;

    uniform sampler2D textureSampler; // Texture Sampler

    varying vec2 v_uv; // Receiving the UVs

    void main() {
        gl_FragColor = texture2D(textureSampler, v_uv); // Sample texture at the given UV
    }
    `,

    //#region Solid Color

    vs_solidColor: `
        attribute vec3 a_position;

        uniform mat4 u_model;
        uniform mat4 u_view;
        uniform mat4 u_projection;

        void main() {
            gl_Position = u_projection * u_view * u_model * vec4(a_position, 1.0);
        }
    `,

    fs_solidColor: `
        precision mediump float;

        uniform vec4 u_color;

        void main() {
            gl_FragColor = u_color;
        }
    `,

    //#region Lighting
    vs_lighting: `
        precision mediump float;

        attribute vec3 a_position;
        attribute vec3 a_normal;

        uniform mat4 u_model;
        uniform mat4 u_view;
        uniform mat4 u_projection;

        varying vec3 v_lightPosition; // Optional, only needed if transforming th elight
        uniform vec3 u_lightPosition; // only needed if passing transformed light position

        varying vec3 v_normal;
        varying vec3 v_worldPosition;

        void main() {
            // Transform the position to world space
            vec4 worldPosition = u_model * vec4(a_position, 1.0);
            v_worldPosition = worldPosition.xyz;

            // Transform light position to world space (if necessary)
            v_lightPosition = (u_model * vec4(u_lightPosition, 1.0)).xyz;

            // Transform and normalize the normal (no need for manual inverse/transpose here)
            v_normal = normalize(mat3(u_model) * a_normal);  // Simple normal transformation

            // Final Position
            gl_Position = u_projection * u_view * worldPosition;
        }
    `,

    fs_lighting: `
        precision mediump float;

        #define MAX_LIGHTS 4

        uniform int u_lightCount;
        uniform vec3 u_lightPositions[MAX_LIGHTS];   // world-space position of light
        uniform vec3 u_lightColors[MAX_LIGHTS];      // RBG of light
        uniform float u_lightIntensities[MAX_LIGHTS]; // Light intensity
        uniform vec4 u_color;           // Material base color

        varying vec3 v_normal;
        varying vec3 v_worldPosition;

        void main () {
            vec3 normal = normalize(v_normal);
            vec3 color = vec3(0.0);

            for (int i = 0; i < MAX_LIGHTS; i++) {
                if (i >= u_lightCount) break;

                vec3 lightDir = normalize(u_lightPositions[i] - v_worldPosition);

                // Attenuation based on distance (optional, but more realistic)
                float distance = length(u_lightPositions[i] - v_worldPosition);
                float attenuation = 1.0 / (distance * distance);                

                // Diffuse shading
                float diffuse = max(dot(normal, lightDir), 0.0);
                vec3 lightColor = u_lightColors[i] * diffuse * u_lightIntensities[i] * attenuation;

                // Add ambient term (optional)
                float ambient = 0.2;

                color += lightColor;
            }            

            // Clamp the final color so it doesn't blow out
            gl_FragColor = vec4(color, 1.0);

           // debug -- visualize normals 
           // gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0); // Visualize normal direction
        }    
    `,

}