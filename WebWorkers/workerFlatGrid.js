import { biomeData, weightFunctions } from "../TerrainBiome/biomes.js";
import { BiomeBlender } from "../TerrainBiome/biomeBlender.js";
import { VoronoiRegions } from "../TerrainBiome/Voronoi.js";

const biomeBlender = new BiomeBlender(biomeData, weightFunctions);
const voronoi = new VoronoiRegions();

onmessage = function (e) {
    const { width, depth, segmentsX, segmentsZ, offsetX, offsetZ, debugBiomeColors, mapSize } = e.data;

    const positions = [];
    const indices = [];
    const uvs = [];
    const biomesArray = [];
    const colorsArray = [];    
    let yHighest = 0;
    let yLowest = 0;

    if (voronoi.seeds.length === 0) voronoi.generateSeeds(mapSize);

    //console.log(`map is ${mapSize}`);
    //voroni.generateSeeds(mapSize);

     for (let z = 0; z <= segmentsZ; z++) {
            for (let x = 0; x <= segmentsX; x++) {
    
                let posX = (x / segmentsX) * width - (width / 2); // center at (0,0)
                let posZ = (z / segmentsZ) * depth - (depth / 2);
    
                let worldX = posX + offsetX;
                let worldZ = posZ + offsetZ;


                const y = voronoi.getHeight(worldX, worldZ);

                if (y < yLowest) yLowest = y;
                if (y > yHighest) yHighest = y;



                //console.log(`workerFlatGrid => y is ${y}`);

                // new version using Voronoi Regions
               // const y = biomeBlender.getHeight(worldX, worldZ);


/*
                // Height + biome data
                const { noise, amp } = biomeBlender.getHeight(worldX,worldZ);
                const y = noise * amp;

                const weights = biomeBlender.getBiomeWeights(worldX,worldZ);
                

*/


                positions.push(posX, y, posZ);     
                uvs.push(x / segmentsX, z / segmentsZ);    

                continue;

                const weights = biomeBlender.getBiomeWeights(worldX,worldZ);

                // passed to shader for visualization. debug only
                biomesArray.push(biomeBlender.getBiomeValue(worldX, worldZ));

                // color map for debug rendering
                if (debugBiomeColors) {
                    const color = biomeBlender.getColorMap(weights);
                    colorsArray.push(...color);
                }   
            }        
        }
    
        // Generate indices for triangle strip
        for (let z = 0; z < segmentsZ; z++) {
            for (let x = 0; x < segmentsX; x++) {
                const i0 = z * (segmentsX + 1) + x;
                const i1 = i0 + 1;
                const i2 = i0 + segmentsX + 1;
                const i3 = i2 + 1;
    
                // First and second triangle
                indices.push(i0, i2, i1, i1, i2, i3);
            }
        }  
    
        postMessage({ positions, indices, uvs, biomes: biomesArray, biomeColors: colorsArray, yMax: yHighest, yMin: yLowest, seeds: voronoi.seeds});
    
};