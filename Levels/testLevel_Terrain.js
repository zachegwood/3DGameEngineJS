import { SceneNode } from "./scene.js";
import { Entity } from "../entity.js";
import { Light } from "../lights.js";

import { createSquare, createTriangle, loadTexture, loadModel, createCube, createTerrainMesh} from '../meshShapes.js';
import { buildTerrain } from "../TerrainBiome/terrain.js";



export async function buildLevel(gl, myShaders) {
        // The scene that will hold all entities (game objects)
    const scene = new SceneNode();
    scene.id = `levelSceneParentNode`;

    const texture = loadTexture(gl, "Art/testTile.png");


    //#region Create Shapes

    const triangle = new Entity( 
    {
        mesh: createTriangle(gl, 1),
        position: [5, 5.5, 0],
        shader: myShaders.SolidColor,
        color: [1.0, 1.0, 1.0, 1.0],
        id: `triangle_1`,
    });
    
    const square2 = new Entity(
    {
        mesh: createSquare(gl, 3), 
        position: [0, 5, 0], 
        shader: myShaders.Lighting,
        texture: texture,
        id: `square_2`,
    });

    scene.add(triangle);
    scene.add(square2);


 //#region Terrain
    const terrain2 = await buildTerrain(gl);
    const chunksArray = Array.from(terrain2.values());
    for (let i = 0; i < terrain2.size; i++) {
        scene.add(chunksArray[i]);
    }



    //#region Create Lights  
    const lights = [
        
        new Light([1, 2, -32], [1, 1, 0], 1.0),
        new Light([-1, 2, 32], [1, 0, 0], 1.0),
        new Light([32, 2, 0], [0.5, 1, 1], 0.5),
        new Light([-32, 2, 0], [0.5, 1, 1], 1.0),
        new Light([0,8,0], [0,0,1], 0.5),
        new Light([-32,6,-32], [1,0,1], 0.5),
    ]

    const sunDir = [-0.5,-1,0.5];
    const sunColor = [.2, 0.8, 0.5];
    const sunIntensity = 0.2;
    const sun = new Light([0, 9, 0], sunColor, 1.0); // pos is just to see the debug box
    sun.direction = sunDir;
    sun.isSun = true;
    sun.intensity = sunIntensity;
    lights.push(sun);

    const lightsGroup = new SceneNode();
    lightsGroup.id = `LightsGroupSceneNode`;

    const lightCubes = new SceneNode();
    lightCubes.id = 'LightCubeSceneNode';


    //#region Lights Cubes
    lights.forEach(
        (l, index) => { 
            lightsGroup.add(l); 
            l.id = `light_${index}`;


            const lightCube = new Entity(
                {
                    mesh: createCube(gl, 0.25, 'trigger'), 
                    position: l.position, 
                    shader: myShaders.PreviewLight,
                    id: `${l.id}_previewCube`,
                    type: 'previewCube',
                });

             // Attach a per‐entity “before draw” hook that uploads that specific light’s uniforms.
            lightCube.onBeforeDraw = (gl, shaderObj) => {

                const program = shaderObj.program;

                // NOTE: `program` here will be myShaders.PreviewLight’s WebGLProgram,
                //       *after* gl.useProgram(program) has been called.
                const locColor     = gl.getUniformLocation(program, "u_lightColor");
                const locIntensity = gl.getUniformLocation(program, "u_lightIntensity");
                const locAmbient   = gl.getUniformLocation(program, "u_ambientStrength");

                gl.uniform3fv(locColor,     l.color);
                gl.uniform1f (locIntensity, l.intensity);
                gl.uniform1f (locAmbient,   0.1);
            };

            //lightCubes.add(lightCube);

    });    

    scene.add(lightCubes);
    scene.add(lightsGroup);

    // vars to let me access these things from main
    scene.testTriangle = triangle;
    scene.testLights = lights;

    // // How to Create a light
    // const pointLight = new Light(
    //     [0.0, 2.0, 5.0],    // Position above the mesh
    //     [0.0, 1.0, 1.0],    // White color
    //     1.0                 // Full intensity
    // );





    return scene;
}
