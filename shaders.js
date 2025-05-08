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
        };
    }

    use() {
        this.gl.useProgram(this.program);
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


//#region Shaders






export const shaders = {

    //#region UV Shader
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

    //#region Solid Shader

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

    vs_lighting: `
        precision mediump float;

        attribute vec3 a_position;
        attribute vec3 a_normal;

        uniform mat4 u_model;
        uniform mat4 u_view;
        uniform mat4 u_projection;

        varying vec3 v_normal;
        varying vec3 v_worldPosition;

        void main() {
            // Transform the position to world space
            vec4 worldPosition = u_model * vec4(a_position, 1.0);
            v_worldPosition = worldPosition.xyz;

            // Transform and normalize the normal (no need for manual inverse/transpose here)
            v_normal = normalize(mat3(u_model) * a_normal);  // Simple normal transformation

            // Final Position
            gl_Position = u_projection * u_view * worldPosition;
        }
    `,

    fs_lighting: `
        precision mediump float;

        uniform vec3 u_lightDirection; // should be normalized
        uniform vec4 u_color;

        varying vec3 v_normal;
        varying vec3 v_worldPosition;

        void main () {
            vec3 normal = normalize(v_normal);
            float lightFactor = max(dot(normal, -u_lightDirection), 0.0);

            vec3 baseColor = u_color.rgb * lightFactor;
            gl_FragColor = vec4(baseColor, u_color.a);
        }    
    `,

}