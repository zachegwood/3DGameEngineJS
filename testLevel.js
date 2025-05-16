import { SceneNode } from "./scene.js";
import { Entity } from "./entity.js";
import { Light } from "./lights.js";

import { createSquare, createTriangle, loadTexture, loadModel, createCube} from './meshShapes.js';


export function buildLevel(gl, myShaders) {
        // The scene that will hold all entities (game objects)
    const scene = new SceneNode();

    const texture = loadTexture(gl, "Art/testTile.png");


    //#region Create Shapes

    const triangle = new Entity( 
    {
        mesh: createTriangle(gl, 1),
        position: [0, 1, 0],
        shader: myShaders.SolidColor,
        color: [1.0, 1.0, 1.0, 1.0],
    });
    const square = new Entity(
    {
        mesh: createSquare(gl, 2), 
        shader: myShaders.TextureUV,
        texture: texture,
    });
    const triangle2 = new Entity(
    {
        mesh: createTriangle(gl, 1), 
        position: [-2, 0.5, -3], 
        shader: myShaders.TextureUV,
        texture: texture,
    });
    const square2 = new Entity(
    {
        mesh: createSquare(gl, 3), 
        position: [0, 0, 5.0], 
        shader: myShaders.Lighting,
        texture: texture,
    });
    const square3 = new Entity(
    {
        mesh: createSquare(gl, 10), 
        position: [0, 0, -12], 
        shader: myShaders.Lighting
    });

    scene.add(triangle);
    scene.add(square);
    scene.add(triangle2);
    scene.add(square2);
    scene.add(square3);

    const columnsArray = [];
    const columnCount = 16;
    let xSide = 1;
    let zDepth = 0;

    for (let i = 0; i < columnCount; i++) {    

        let randHeight = Math.random() * (15-2) + 2; // random height between 2 and 15

        const colCube = new Entity(
        {
            mesh: createCube(gl, 0.5),        
            shader: myShaders.Lighting
        });

        colCube.id = `colCube_${i}`;

        colCube.translate((xSide * 10), randHeight/2, zDepth);
        colCube.scale(1.0, randHeight, 1.0);

        columnsArray.push(colCube);

        xSide *= -1; // flip sides
        if (i % 2 !== 0) zDepth -= 10; // move back a row every other loop    
    }

    const colGroup = new SceneNode();
    columnsArray.forEach(c => colGroup.add(c));
    scene.add(colGroup);



    //#region Create Lights

    const lights = [
        
        new Light([1, 2, 5], [1, 1, 0], 1.0),
        new Light([-1, 2, 5], [1, 0, 0], 1.0),
        new Light([9, 2, 0], [0.5, 1, 1], 0.5),
        new Light([-9, 2, 0], [0.5, 1, 1], 1.0),
        new Light([9, 2, -10], [0.5, 1, 1], 1.0),
        new Light([-9, 2, -10], [0.5, 1, 1], 1.0),
        new Light([9, 2, -20], [0.5, 1, 1], 1.0),
        new Light([-9, 2, -20], [0.5, 1, 1], 2.0),
        new Light([9, 2, -30], [0.5, 1, 1], 2.0),
        new Light([-9, 2, -30], [0.5, 1, 1], 2.0),
        new Light([9, 2, -40], [0.5, 1, 1], 2.0),
        new Light([-9, 2, -40], [0.5, 1, 1], 2.0),
        new Light([9, 2, -50], [0.5, 1, 1], 2.0),
        new Light([-9, 2, -50], [0.5, 1, 1], 2.0),
    ]

    const lightsGroup = new SceneNode();
    lights.forEach(l => lightsGroup.add(l));
    scene.add(lightsGroup);

    // vars to let me access these things from main
    scene.testTriangle = triangle;
    scene.testLights = lights;

    // // Create a light
    // const pointLight = new Light(
    //     [0.0, 2.0, 5.0],    // Position above the mesh
    //     [0.0, 1.0, 1.0],    // White color
    //     1.0                 // Full intensity
    // );

    return scene;
}
