import { lerp, smoothstep } from './terrain.js'


//  Data for defining biomes. 
//  Make sure to add to both of these (biomeData AND weightFunctions)


//#region Biome Data
export const biomeData = {
    plains: {
        octaves:    5,
        lacunarity: 2.0,
        gain:       0.5,
        freq:       0.02,
        amp:        4.0
    },
    mountains: {
        octaves:    5,
        lacunarity: 2.0,
        gain:       0.4,
        freq:       0.01,
        amp:        150.0
    },
    desert: {
        octaves:    4,
        lacunarity: 2.0,
        gain:       0.3,
        freq:       0.015,
        amp:        0.8
    },
    plateau: {
        octaves:    1,
        lacunarity: 2.0,
        gain:       0.2,
        freq:       0.012,
        amp:        40.0
    },
}



//#region Weight F(n)s
export function weightFunctions() { // getBiomeValue is binded dependency from BiomeBlender

    // v is the biomeValue from terrain.js, which calls this function

    return {
        plains: (v) => { 
            return (1 - smoothstep(0.2, 0.5, v)) + 0.05;
        },
        mountains: (v) => { 
            return smoothstep(0.5, 0.9, v) + 0.05;
        },
        desert: (v) => { 
            let d = 1 - Math.abs(v - 0.45) / 0.25;
            return Math.max(d, 0) + 0.05;
        },
        plateau: (v) => { 
            return (1 - smoothstep(0.0, 0.2, v)) + 0.05;
        },
    }
}
