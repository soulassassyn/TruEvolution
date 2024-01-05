export class Rules {
    constructor(runtime) {
        this.runtime = runtime;
        this.layer = "interactive"
        this.isSimulating = false;
        this.isLoading = false;
        this.particles = {};
        // this.particles = {
        //     blue: [],
        //     red: [],
        //     yellow: [],
        //     green: [],
        // };
        this.grid = {};
        this.colorValues = {
            blue: 0.1,
            red: 0.5,
            yellow: 0.65,
            green: 0.8,
        }
        this.createdColors = {};
        this.ruleSet = {
            blue: {
                blue: 0,
                red: 0,
                yellow: 0,
                green: 0,
            },
            red: {
                red: 0,
                blue: 0,
                yellow: 0,
                green: 0,
            },
            yellow: {
                yellow: 0,
                blue: 0,
                red: 0,
                green: 0,
            },
            green: {
                green: 0,
                blue: 0,
                red: 0,
                yellow: 0,
            },
        }

        this.interactionDistance = 150,
        this.friction = 0.5,
        this.interactionDistanceSquared = this.interactionDistance * this.interactionDistance;
        this.vwidth = this.runtime.viewportWidth;
        this.vheight = this.runtime.viewportHeight;
    }

    // update() {
    //     if (!this.isSimulating) return;
    
    //     // Update the grid with the current particles
    //     this.updateGrid(this.particles);
    
    //     // Iterate over each cell in the grid
    //     for (let key in this.grid) {
    //         const particlesInCell = this.grid[key];
    
    //         // Iterate over each particle in the cell
    //         for (let i = 0; i < particlesInCell.length; i++) {
    //             const particle = particlesInCell[i];
    //             // Execute the rule for each particle against nearby particles
    //             this.rule(particle, this.getNearbyParticles(particle, this.interactionDistance));
    //         }
    //     }
    // }

    update() {
        if (!this.isSimulating) return;
        const data = this.packageData();
        const [ grid1, grid2 ] = this.splitGrid(2);

        const worker1 = new Worker("scripts/workerRule.js");
        const worker2 = new Worker("scripts/workerRule.js");

        worker1.postMessage([ data, grid1 ]);
        worker2.postMessage([ data, grid2 ]);
    }

    packageData() {
        const data = {
            createdColors: this.createdColors,
            ruleSet: this.ruleSet,
            interactionDistance: this.interactionDistance,
            interactionDistanceSquared: this.interactionDistanceSquared,
            friction: this.friction,
            grid: this.grid,
            vwidth: this.vwidth,
            vheight: this.vheight,
        }
        return data;
    }

    splitGrid(split) {
        const grid = this.grid;
        const gridKeys = Object.keys(grid);
        const gridLength = gridKeys.length;
        const gridSplit = Math.floor(gridLength / split);
        const grid1 = {};
        const grid2 = {};

        for (let i = 0; i < gridSplit; i++) {
            const key = gridKeys[i];
            grid1[key] = grid[key];
        }

        for (let i = gridSplit; i < gridLength; i++) {
            const key = gridKeys[i];
            grid2[key] = grid[key];
        }

        return [ grid1, grid2 ];        
    }

    createAllColors() {
        // Iterate over each color stored in createdColors and get the color and number of particles
        for (let color in this.createdColors) {
            let number = this.createdColors[color];
            this.create(number, color);
        }
    }
    
    create(number, color) {
        const vwidth = this.runtime.viewportWidth;
        const vheight = this.runtime.viewportHeight;
        for (let i = 0; i < number; i++) {
            const particle = this.runtime.objects.particle.createInstance(this.layer, this.random(vwidth), this.random(vheight));
            particle.effects[0].isActive = true;
            particle.effects[0].setParameter(0, this.colorValues[color]);
            particle.vx = 0;
            particle.vy = 0;
            particle.color = color;
            if (!this.particles[color]) this.particles[color] = [];
            this.particles[color].push(particle);
        }
    }
    
    random(number) {
        return Math.random() * number;
    }
    
    // Update the grid for spatial hashing
    updateGrid() {
        const gridSize = this.interactionDistance; // Size of each grid cell
        this.grid = {};
        
        // Iterate over each color array in the particles object
        for (let color in this.particles) {
            this.particles[color].forEach((particle) => {
                const x = Math.floor(particle.x / gridSize);
                const y = Math.floor(particle.y / gridSize);
                const key = `${x}_${y}`; // Unique key for the grid cell
                
                // If the cell doesn't exist, create an array for it
                if (!this.grid[key]) {
                    this.grid[key] = [];
                }
                
                // Add the particle to the cell
                this.grid[key].push(particle);
            });
        }
    }
    
    // // Get particles in the nearby cells including the cell of the current particle
    getNearbyParticles(particle, gridSize) {
        const nearbyParticles = [];
        const x = Math.floor(particle.x / gridSize);
        const y = Math.floor(particle.y / gridSize);
        
        // Check the surrounding cells including the particle's own cell
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const key = `${x + dx}_${y + dy}`;
                if (this.grid[key]) {
                    nearbyParticles.push(...this.grid[key]);
                }
            }
        }
        return nearbyParticles;
    }
    
    // Calculate the force between two particles
    calculateForce(a, b, g) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dSquared = dx * dx + dy * dy; // square of distance between particles
        if (dSquared >= 0 && dSquared < this.interactionDistanceSquared) {
            const F = g / Math.sqrt(dSquared); // calculate F only when needed
            return { fx: F * dx, fy: F * dy };
        }
        return { fx: 0, fy: 0 };
    }
    
    // Collision detection and resolution function
    resolveCollision(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = 2; // Since each particle has a size of 2x2
        
        // Check for collision
        if (distance < minDistance && distance > 0) {
            // Calculate overlap
            const overlap = 0.5 * (minDistance - distance);
            
            // Calculate the displacement needed for each particle along the line of centers
            const displacementX = overlap * (dx / distance);
            const displacementY = overlap * (dy / distance);
            
            // Adjust positions to resolve collision
            a.x += displacementX;
            a.y += displacementY;
            b.x -= displacementX;
            b.y -= displacementY;
        }
    }
    
    // Logic for simulation, p1 is a single particle, nearbyParticles are the particles to check against
    rule(p1, nearbyParticles) {
        let fx = 0; // force in x direction
        let fy = 0; // force in y direction
        let a = p1; // particle a
        
        // Calculate force with nearby particles
        nearbyParticles.forEach((b) => {
            if (a === b) return; // Skip interaction with itself
            
            // Resolve collision if any
            this.resolveCollision(a, b);    
            
            // Retrieve the gravity constant from the ruleSet, assuming particles have a color property
            let gravityConstant = this.ruleSet[a.color][b.color];
            
            const force = this.calculateForce(a, b, gravityConstant);
            fx += force.fx;
            fy += force.fy;
        });
        
        // Update velocity and position
        a.vx = (a.vx + fx) * this.friction;
        a.vy = (a.vy + fy) * this.friction;
        a.x += a.vx;
        a.y += a.vy;
        
        // Bounce off walls by ensuring particles are within bounds and adjusting velocity
        if (a.x <= 0) {
            a.x = -a.x; // Reflect position from the boundary
            a.vx *= -1; // Reverse velocity
        } else if (a.x >= this.vwidth) {
            a.x = 2 * this.vwidth - a.x; // Reflect position from the boundary
            a.vx *= -1; // Reverse velocity
        }
        if (a.y <= 0) {
            a.y = -a.y; // Reflect position from the boundary
            a.vy *= -1; // Reverse velocity
        } else if (a.y >= this.vheight) {
            a.y = 2 * this.vheight - a.y; // Reflect position from the boundary
            a.vy *= -1; // Reverse velocity
        }
    }
    
    startSimulation() {
        this.createAllColors();
        this.isSimulating = true;
    }
    
    resetSimulation() {
        this.isSimulating = false;
        this.particles = {};
        this.createdColors = {};
    }
    
    setSeedText() {
        const seedText = this.runtime.objects.seedText.getFirstInstance();
        const seed = this.runtime.Rules.createHash();
        
        seedText.text = seed;
    }
    
    randomizeSettings() {
        this.isLoading = true;
        
        // Randomize the ruleSet and createdColors
        for (let color in this.ruleSet) {
            let isColorActive = Math.random() > 0.1; // 90% chance of being active
            // If the color is not active, set all the values to 0 and delete the color from createdColors
            if (!isColorActive) {
                for (let affectingColor in this.ruleSet[color]) {
                    this.ruleSet[color][affectingColor] = 0;
                    delete this.createdColors[color];
                }
            } else {
                const numberOfParticles = Math.floor(this.randomRange(50, 250));
                this.createdColors[color] = numberOfParticles;
                for (let affectingColor in this.ruleSet[color]) {
                    this.ruleSet[color][affectingColor] = parseFloat(this.randomRange(-2, 2).toFixed(1));
                }
            }
        }
        
        this.friction = parseFloat(this.randomRange(0.1, 0.5).toFixed(1));
        this.interactionDistance = Math.floor(this.randomRange(50, 250));
        this.updateInteractionDistanceSquared();
    }
    
    randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }
    
    // Function to create a hash string from your variables
    createHash() {
        const createdColors = this.createdColors;
        const ruleSet = this.ruleSet;
        const interactionDistance = this.interactionDistance;
        const friction = this.friction;
        // Create an object with all the data
        const data = {
            createdColors,
            ruleSet,
            interactionDistance,
            friction
        };
        
        // Convert the object into a JSON string
        const jsonString = JSON.stringify(data);
        
        // Encode the JSON string into Base64 for easy sharing
        const encoded = btoa(jsonString);
        
        return encoded;
    }
    
    // Function to decode the hash string back into your variables
    loadFromHash(hashString) {
        this.isLoading = true;
        // Decode the Base64 string into a JSON string
        const decoded = atob(hashString);
        
        // Parse the JSON string back into an object
        const data = JSON.parse(decoded);
        
        // Here you would set your variables from the data object
        this.createdColors = data.createdColors;
        this.ruleSet = data.ruleSet;
        this.interactionDistance = data.interactionDistance;
        this.friction = data.friction;
    }
    
    updateInteractionDistanceSquared() {
        this.interactionDistanceSquared = this.interactionDistance * this.interactionDistance;
    }
}

// OLD LOGIC

// update() {
//     if (!this.isSimulating) return;
//     const colors = Object.keys(this.createdColors);
//     // Iterate over each color for the affected group of particles
//     for (let affectedColor of colors) {
//         // Iterate over each color for the affecting group of particles
//         for (let affectingColor of colors) {
//             // Retrieve the gravity constant from the ruleSet
//             let gravityConstant = this.ruleSet[affectedColor][affectingColor];
//             // Execute the rule for the affected and affecting color pair
//             this.rule(this.particles[affectedColor], this.particles[affectingColor], gravityConstant);
//         }
//     }    
// }

// // logic for simulation, p1 and p2 are arrays of particles, g is the gravity constant
// rule(p1, p2, g) {    
    //     for (let i = 0; i < p1.length; i++) {
        //         let fx = 0; // force in x direction
        //         let fy = 0; // force in y direction
        //         let a = p1[i]; // particle a
        
        //         // calculate force
        //         for (let j = 0; j < p2.length; j++) {
            //             let b = p2[j]; // particle b
            //             let dx = a.x - b.x;
            //             let dy = a.y - b.y;
            //             let dSquared = dx * dx + dy * dy; // square of distance between particles
            //             if (dSquared > 0 && dSquared < this.interactionDistanceSquared) {
                //                 let F = g / Math.sqrt(dSquared); // calculate F only when needed
                //                 fx += F * dx;
                //                 fy += F * dy;
//             }
//         }

//         // update velocity and position
//         a.vx = (a.vx + fx) * this.friction;
//         a.vy = (a.vy + fy) * this.friction;
//         a.x += a.vx;
//         a.y += a.vy;

//         // bounce off walls by ensuring particles are within bounds
//         if (a.x <= 0 || a.x >= this.vwidth) {
//             a.x = Math.max(1, Math.min(a.x, this.vwidth - 1));
//             a.vx *= -1;
//         }
//         if (a.y <= 0 || a.y >= this.vheight) {
//             a.y = Math.max(1, Math.min(a.y, this.vheight - 1));
//             a.vy *= -1;
//         }
//     }
// }