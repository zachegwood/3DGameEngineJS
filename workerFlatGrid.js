import { biomeData, weightFunctions } from "./biomes.js";
import { BiomeBlender } from "./biomeBlender.js";

const biomeBlender = new BiomeBlender(biomeData, weightFunctions);

onmessage = function (e) {
    const { width, depth, segmentsX, segmentsZ, offsetX, offsetZ, debugBiomeColors } = e.data;

    const positions = [];
    const indices = [];
    const uvs = [];
    const biomesArray = [];
    const colorsArray = [];    

     for (let z = 0; z <= segmentsZ; z++) {
            for (let x = 0; x <= segmentsX; x++) {
    
                let posX = (x / segmentsX) * width - (width / 2); // center at (0,0)
                let posZ = (z / segmentsZ) * depth - (depth / 2);
    
                let worldX = posX + offsetX;
                let worldZ = posZ + offsetZ;

                // Height + biome data
                const { noise, amp } = biomeBlender.getHeight(worldX,worldZ);
                const weights = biomeBlender.getBiomeWeights(worldX,worldZ);
                const y = noise * amp;

                positions.push(posX, y, posZ);     
                uvs.push(x / segmentsX, z / segmentsZ);    

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
    
        postMessage({ positions, indices, uvs, biomes: biomesArray, biomeColors: colorsArray });
    
};