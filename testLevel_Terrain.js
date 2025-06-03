import { SceneNode } from "./scene.js";
import { Entity } from "./entity.js";
import { Light } from "./lights.js";

import { createSquare, createTriangle, loadTexture, loadModel, createCube, createTerrainMesh} from './meshShapes.js';
import { generateFlatGrid,  } from "./terrain.js";



export function buildLevel(gl, myShaders) {
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
    // const square = new Entity(
    // {
    //     mesh: createSquare(gl, 2), 
    //     shader: myShaders.TextureUV,
    //     texture: texture,
    //     id: `square_1`,
    // });
    // const triangle2 = new Entity(
    // {
    //     mesh: createTriangle(gl, 1), 
    //     position: [-2, 0.5, -3], 
    //     shader: myShaders.TextureUV,
    //     texture: texture,
    //     id: `triangle_2`,
    // });
    const square2 = new Entity(
    {
        mesh: createSquare(gl, 3), 
        position: [0, 5, 0], 
        shader: myShaders.TextureUV,
        texture: texture,
        id: `square_2`,
    });
    // const square3 = new Entity(
    // {
    //     mesh: createSquare(gl, 10), 
    //     position: [0, 0, -12], 
    //     shader: myShaders.Lighting,
    //     id: `square_3`,
    // });

    //     const slopeSmall = new Entity(
    // {
    //     mesh: createSquare(gl, 10, `trigger`), 
    //     position: [0, 0, -15], 
    //     shader: myShaders.TextureUV,
    //     texture: texture,
    //     id: `slopeSmall`
    // });
    // slopeSmall.rotateX(-15);
    // scene.add(slopeSmall);


    scene.add(triangle);
    // scene.add(square);
    // scene.add(triangle2);
    scene.add(square2);
    // scene.add(square3);


 //#region Terrain
     const terrain = new Entity(
    {
        mesh: createTerrainMesh(gl), 
        position: [0, 0, 0],
        shader: myShaders.Lighting,
        texture: texture,
        id: `terrain_1`,
    });
    scene.add(terrain);
    console.log(terrain);






    // //const columnsArray = [];
    // const columnCount = 16;
    // let xSide = 1;
    // let zDepth = 0;

    // const colGroup = new SceneNode();
    // colGroup.id = "columnGroupSceneNode";
    // //columnsArray.forEach(c => colGroup.add(c));
    // scene.add(colGroup);

    // for (let i = 0; i < columnCount; i++) {    

    //     let randHeight = Math.random() * (15-2) + 2; // random height between 2 and 15

    //     const colCube = new Entity(
    //     {
    //         mesh: createCube(gl, 0.5),        
    //         shader: myShaders.Lighting,
    //         id: `colCube_${i}`,
    //     });

    //     colCube.translate((xSide * 10), randHeight/2, zDepth);
    //     colCube.scale(1.0, randHeight, 1.0);

    //     //columnsArray.push(colCube);

    //     colGroup.add(colCube);

    //     xSide *= -1; // flip sides
    //     if (i % 2 !== 0) zDepth -= 10; // move back a row every other loop    
    // }





    //#region Create Lights

    
   

    const lights = [
        
        new Light([1, 2, 5], [1, 1, 0], 1.0),
        new Light([-1, 2, 5], [1, 0, 0], 1.0),
        new Light([9, 2, 0], [0.5, 1, 1], 0.5),
        new Light([-9, 2, 0], [0.5, 1, 1], 1.0),
        // new Light([9, 2, -10], [0.5, 1, 1], 1.0),
        // new Light([-9, 2, -10], [0.5, 1, 1], 1.0),
        // new Light([9, 2, -20], [0.5, 1, 1], 1.0),
        // new Light([-9, 2, -20], [0.5, 1, 1], 2.0),
        // new Light([9, 2, -30], [0.5, 1, 1], 2.0),
        // new Light([-9, 2, -30], [0.5, 1, 1], 2.0),
        // new Light([9, 2, -40], [0.5, 1, 1], 2.0),
        // new Light([-9, 2, -40], [0.5, 1, 1], 2.0),
        // new Light([9, 2, -50], [0.5, 1, 1], 2.0),
        // new Light([-9, 2, -50], [0.5, 1, 1], 2.0),
        new Light([0,8,0], [0,0,1], 0.5),
    ]

    const sunDir = [0,-1,0];
    const sunColor = [1, 0, 0];
    const sun = new Light([0, 9, 0], sunColor, 1.0);
    sun.direction = sunDir;
    sun.isSun = true;
    lights.push(sun);

    const lightsGroup = new SceneNode();
    lightsGroup.id = `LightsGroupSceneNode`;

    const lightCubes = new SceneNode();
    lightCubes.id = 'LightCubeSceneNode';



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

            lightCubes.add(lightCube);

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
