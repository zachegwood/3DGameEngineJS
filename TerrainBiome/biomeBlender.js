import { generateSimplexNoise, fractalNoise } from "./simplexNoise.js";
import { lerp, smoothstep } from '../utils.js';
//import { VoronoiRegions } from "./Voronoi.js";


// called from inside workerFlatGrid.js <-- generateFlatGridAsync() in terrain.js <-- meshShapes.js


//#region Biome Blender
export class BiomeBlender {
    constructor(data, functions) {              

        // configs in from biomes.js
        this.biomeData = data;
        this.weightFunctions = functions();     
        
        //const voronoi = new VoronoiRegions();
    }

    getHeight(x, z) {




        // new version, using Voronoi Regions
        //let baseElevation = voronoi.getHeight();
        //let detailNoise = fractalNoise(params);


        //console.log(`BiomeBlender = baseElevation is ${baseElevation}`);


/*

        // Compute blended parameters and weights as before.
        const { params, weights } = this.getInterpolatedParams(x, z, this.biomeData);
        let rawNoise = fractalNoise(params);

        // Define your plateau parameters.
        const plateauThreshold = 0.55;         // If plateau weight exceeds this, force it.
        const plateauConstantValue = 0.5;       // The flat noise value you want for plateaus.
        
        let finalNoise;
        if (weights.plateau > plateauThreshold) {
            // If plateau dominates, override the noisy value completely.
            finalNoise = plateauConstantValue;
            } else {
                // Otherwise, linearly blend between the raw noise and the plateau constant.
                // You can adjust the blending curve as needed.
                let t = weights.plateau / plateauThreshold; 
                finalNoise = (1 - t) * rawNoise + t * plateauConstantValue;
            }

        return { noise: finalNoise, amp: params.amp };

*/
        return { baseElevation };
        
    }

    //#region ColorMap
    getColorMap(weights) {
        const colors = {
            plains: [0, 1, 0],      // green
            mountains: [1, 0, 0],   // red
            desert: [0, 0, 0],      // black
            plateau: [0, 0, 1],     // blue
        }

        const blendedColor = [
            weights.plains      * colors.plains[0] +
            weights.mountains   * colors.mountains[0] +
            weights.desert      * colors.desert[0] +
            weights.plateau     * colors.plateau[0], 

            weights.plains      * colors.plains[1] +
            weights.mountains   * colors.mountains[1] +
            weights.desert      * colors.desert[1] +
            weights.plateau     * colors.plateau[1],

            weights.plains      * colors.plains[2] +
            weights.mountains   * colors.mountains[2] +
            weights.desert      * colors.desert[2] +
            weights.plateau     * colors.plateau[2]
        ];

        return blendedColor;
    }

    getInterpolatedParams(x,z, biomeParams) {

        let weights = this.getBiomeWeights(x, z);

        let interpolated = {
            x: x,
            z: z,
            octaves: 0,
            lacunarity: 0,
            gain: 0,
            freq: 0,
            amp: 0
        };

        // Get biome value at this position (0 = plains, 1 = mountains)
        // allows smooth map variation
        //const biomeRaw = this.getBiomeValue(x, z);
        //let blend = smoothstep(0.3, 0.7, biomeRaw);

        //console.log(`plateau is ${weights.plateau}`);

        for (const biome in biomeParams) {
            let w = weights[biome] || 0;
            let params = biomeParams[biome];
            
            interpolated.octaves    += params.octaves * w;
            interpolated.lacunarity += params.lacunarity * w;
            interpolated.gain       += params.gain * w;
            interpolated.freq       += params.freq * w;
            interpolated.amp        += params.amp * w;
        }

        return { params: interpolated, weights: weights };

    }

    getBiomeValue(x,z) {

        // 1) continent mask: huge landmass
        const CONTINENT_FREQ = 0.0008;
        const continentValue = (generateSimplexNoise(x * CONTINENT_FREQ, z * CONTINENT_FREQ) + 1) / 2;

        // 2) biome mask: mountains vs plains
        const BIOME_FREQ = 0.0015; // Very low frequency => large smooth regions
        let biomeValue = generateSimplexNoise(x * BIOME_FREQ, z * BIOME_FREQ);

        // 3) Blend continent into biome
        // ex, 70% biome detail, 30% continent outline
        const blendedValue = lerp(biomeValue, continentValue, 0.3); // continental influence. 0.1-05

        return blendedValue;
    }

    getBiomeWeights(x,z) {
        const v = this.getBiomeValue(x,z);
        let weights = {};
        let total = 0;

        for (const [biome, fn] of Object.entries(this.weightFunctions)) {
            let w = fn(v);
            weights[biome] = w;
            total += w;
        }
        // Normalize weights
        if (total > 0) {
            for (const biome in weights) {
                weights[biome] /= total;
            }
        }   
        return weights;
    }

    //#region Climate Maps
}
