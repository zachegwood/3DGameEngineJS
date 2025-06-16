import { biomeData, weightFunctions } from "../TerrainBiome/biomes.js";
import { fractalNoise } from "../TerrainBiome/simplexNoise.js";
import { BiomeBlender } from "../TerrainBiome/biomeBlender.js";
import { VoronoiRegions } from "../TerrainBiome/Voronoi.js";
import { WORLD_SCALE, CHUNK_SIZE } from '/config.js'

const biomeBlender = new BiomeBlender(biomeData, weightFunctions);
const voronoi = new VoronoiRegions();

/*

    STEP ONE: Get continent noise. This happens in "Genreate Voronoi Seeds" below using Simplex Noise
    STEP TWO: Generate Voronoi Seeds (heights multiplied by that continent noise)
    STEP THREE: Interoplate between seeds (macro elevation)
    STEP FOUR: Fractal noise the result (micro elevation)

*/




onmessage = function (e) {
    const { width, depth, segmentsX, segmentsZ, offsetX, offsetZ, debugBiomeColors, mapSize } = e.data;

    const positions = [];
    const indices = [];
    const uvs = [];
    const biomesArray = [];
    const colorsArray = [];    
    let yHighest = 0;
    let yLowest = 0;

    if (voronoi.seeds.length === 0) voronoi.generateSeeds(mapSize * WORLD_SCALE);

    //console.log(`map is ${mapSize}`);
    //voroni.generateSeeds(mapSize);

     for (let z = 0; z <= segmentsZ; z++) {
            for (let x = 0; x <= segmentsX; x++) {

                // center at (0,0)
                let posX = ((x / segmentsX) * width - (width / 2)) * WORLD_SCALE; // changing unit scale
                let posZ = ((z / segmentsZ) * depth - (depth / 2)) * WORLD_SCALE;
    
                let worldX = posX + offsetX;
                let worldZ = posZ + offsetZ;

                const macroElevation = voronoi.getHeight(worldX, worldZ);

                // set up variation
                const fractalParams = {
                    x: worldX, z: worldZ,
                    octaves: 4,
                    freq: 0.01,
                    amp: 1.0,
                    lacunarity: 2.0,
                    gain: 0.5,
                }
                
                const microVariation = fractalNoise(fractalParams); // additional terrain...ness

                const y = macroElevation + microVariation * 0.25; // final height. voronoi + fractalNoise
                //const y = macroElevation;


                // change AABB shape based on new chunk terrain height
                if (y < yLowest) yLowest = y;
                if (y > yHighest) yHighest = y;

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