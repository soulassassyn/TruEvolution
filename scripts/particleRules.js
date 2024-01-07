export class Rules {
    constructor(runtime) {
        this.runtime = runtime;
        this.layer = "interactive"
        this.isSimulating = false;
        this.isLoading = false;
        this.particlesArray = [];
        this.particleMap = new Map();
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

        this.worker1 = new Worker("./workerRule.js");
        this.worker2 = new Worker("./workerRule.js");
        this.worker3 = new Worker("./workerRule.js");
        this.worker4 = new Worker("./workerRule.js");
    }

    update() {
        if (!this.isSimulating) return;

        // Update the grid with the current particles
        this.updateGrid(this.particlesArray);

        // Package the data for the worker
        const data = this.packageData();
        const [ particles1, particles2, particles3, particles4 ] = this.splitParticles(4);
        // const [ grid1, grid2, grid3, grid4 ] = this.splitGrid(4);

        // Post the data to the workers
        // this.worker1.postMessage([ data, grid1 ]);
        // this.worker2.postMessage([ data, grid2 ]);
        // this.worker3.postMessage([ data, grid3 ]);
        // this.worker4.postMessage([ data, grid4 ]);
        this.worker1.postMessage([ data, particles1 ]);
        this.worker2.postMessage([ data, particles2 ]);
        this.worker3.postMessage([ data, particles3 ]);
        this.worker4.postMessage([ data, particles4 ]);

        // Listen for messages from the workers
        this.worker1.onmessage = (e) => {
            const updatedParticles = e.data;
            this.workerUpdateParticles(updatedParticles);
        }
        this.worker2.onmessage = (e) => {
            const updatedParticles = e.data;
            this.workerUpdateParticles(updatedParticles);
        }
        this.worker3.onmessage = (e) => {
            const updatedParticles = e.data;
            this.workerUpdateParticles(updatedParticles);
        }
        this.worker4.onmessage = (e) => {
            const updatedParticles = e.data;
            this.workerUpdateParticles(updatedParticles);
        }
    }

    packageData() {
        const data = {
            ruleSet: this.ruleSet,
            interactionDistance: this.interactionDistance,
            interactionDistanceSquared: this.interactionDistanceSquared,
            grid: this.grid,
        }
        return data;
    }

    splitParticles(split) {
        const particles = this.particlesArray;
        const numberOfPartciles = particles.length;
        const numberOfParticlesPerWorker = Math.floor(numberOfPartciles / split);
        const particles1 = [];
        const particles2 = [];
        const particles3 = [];
        const particles4 = [];

        for (let i = 0; i < numberOfParticlesPerWorker; i++) {
            particles1.push(particles[i]);
        }
        for (let i = numberOfParticlesPerWorker; i < numberOfParticlesPerWorker * 2; i++) {
            particles2.push(particles[i]);
        }
        for (let i = numberOfParticlesPerWorker * 2; i < numberOfParticlesPerWorker * 3; i++) {
            particles3.push(particles[i]);
        }
        for (let i = numberOfParticlesPerWorker * 3; i < numberOfPartciles; i++) {
            particles4.push(particles[i]);
        }

        return [ particles1, particles2, particles3, particles4 ];
    }

    // splitGrid(split) {
    //     const grid = this.grid;
    //     const gridKeys = Object.keys(grid);
    //     const numberOfPartciles = this.particlesArray.length;
    //     const numberOfParticlesPerWorker = Math.floor(numberOfPartciles / split);
    //     const gridLength = gridKeys.length;
    //     const gridSplit = Math.floor(gridLength / split);
    //     const grid1 = {};
    //     const grid2 = {};
    //     const grid3 = {};
    //     const grid4 = {};

    //     for (let i = 0; i < gridSplit; i++) {
    //         const key = gridKeys[i];
    //         grid1[key] = grid[key];
    //     }
    //     for (let i = gridSplit; i < gridSplit * 2; i++) {
    //         const key = gridKeys[i];
    //         grid2[key] = grid[key];
    //     }
    //     for (let i = gridSplit * 2; i < gridSplit * 3; i++) {
    //         const key = gridKeys[i];
    //         grid3[key] = grid[key];
    //     }
    //     for (let i = gridSplit * 3; i < gridLength; i++) {
    //         const key = gridKeys[i];
    //         grid4[key] = grid[key];
    //     }

    //     return [ grid1, grid2, grid3, grid4 ];        
    // }

    workerUpdateParticles(updatedParticles) {
        for (let i = 0; i < updatedParticles.length; i++) {
            const particle = updatedParticles[i];
            let index = this.particleMap.get(particle.id);
            let a = this.particlesArray[index];
            a.x = particle.wx;
            a.y = particle.wy;
            a.vx = particle.vx;
            a.vy = particle.vy;
            let fx = particle.fx;
            let fy = particle.fy;
            
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
    }

    createAllColors() {
        // Iterate over each color stored in createdColors and get the color and number of particles
        for (let color in this.createdColors) {
            let number = this.createdColors[color];
            this.create(number, color);
        }
        this.mapParticles(); // Map the particles to the particleMap for fast lookup later
    }
    
    create(number, color) {
        const vwidth = this.runtime.viewportWidth;
        const vheight = this.runtime.viewportHeight;
        for (let i = 0; i < number; i++) {
            const x = this.random(vwidth);
            const y = this.random(vheight);
            const particle = this.runtime.objects.particle.createInstance(this.layer, x, y);
            particle.effects[0].isActive = true;
            particle.effects[0].setParameter(0, this.colorValues[color]);
            particle.vx = 0;
            particle.vy = 0;
            particle.wx = x; // X variable for the worker
            particle.wy = y; // Y variable for the worker
            particle.fx = 0; // force in x direction
            particle.fy = 0; // force in y direction
            particle.id = particle.uid;
            particle.color = color;

            this.particlesArray.push(particle);
        }
    }

    mapParticles() {
        this.particlesArray.forEach((particle, index) => {
            this.particleMap.set(particle.uid, index);
        });
    }
    
    random(number) {
        return Math.random() * number;
    }
    
    // Update the grid for spatial hashing
    updateGrid() {
        const gridSize = this.interactionDistance; // Size of each grid cell
        this.grid = {};
        
        for (let i = 0; i < this.particlesArray.length; i++) {
            const particle = this.particlesArray[i];
            particle.wx = particle.x; // Update wx variable for the worker
            particle.wy = particle.y; // Update wy variable for the worker
            const x = Math.floor(particle.x / gridSize);
            const y = Math.floor(particle.y / gridSize);
            const key = `${x}_${y}`; // Unique key for the grid cell
            
            // If the cell doesn't exist, create an array for it
            if (!this.grid[key]) {
                this.grid[key] = [];
            }
                
            // Add the particle to the cell
            this.grid[key].push(particle);
        }
    }
    
    startSimulation() {
        this.createAllColors();
        this.isSimulating = true;
    }
    
    resetSimulation() {
        this.isSimulating = false;
        this.particles = {};
        this.particlesArray = [];
        this.createdColors = {};
    }
}

// OLD LOGIC

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

// // Logic for simulation, p1 is a single particle, nearbyParticles are the particles to check against
// rule(p1, nearbyParticles) {
    //     let fx = 0; // force in x direction
    //     let fy = 0; // force in y direction
    //     let a = p1; // particle a
    
    //     // Calculate force with nearby particles
    //     nearbyParticles.forEach((b) => {
        //         if (a === b) return; // Skip interaction with itself
        
        //         // Resolve collision if any
        //         this.resolveCollision(a, b);    
        
        //         // Retrieve the gravity constant from the ruleSet, assuming particles have a color property
        //         let gravityConstant = this.ruleSet[a.color][b.color];
        
        //         const force = this.calculateForce(a, b, gravityConstant);
        //         fx += force.fx;
        //         fy += force.fy;
        //     });
        
        //     // Update velocity and position
        //     a.vx = (a.vx + fx) * this.friction;
        //     a.vy = (a.vy + fy) * this.friction;
        //     a.x += a.vx;
        //     a.y += a.vy;
        
        //     // Bounce off walls by ensuring particles are within bounds and adjusting velocity
        //     if (a.x <= 0) {
            //         a.x = -a.x; // Reflect position from the boundary
            //         a.vx *= -1; // Reverse velocity
            //     } else if (a.x >= this.vwidth) {
                //         a.x = 2 * this.vwidth - a.x; // Reflect position from the boundary
                //         a.vx *= -1; // Reverse velocity
                //     }
                //     if (a.y <= 0) {
//         a.y = -a.y; // Reflect position from the boundary
//         a.vy *= -1; // Reverse velocity
//     } else if (a.y >= this.vheight) {
    //         a.y = 2 * this.vheight - a.y; // Reflect position from the boundary
    //         a.vy *= -1; // Reverse velocity
    //     }
    // }

    // // // Get particles in the nearby cells including the cell of the current particle
    // getNearbyParticles(particle, gridSize) {
    //     const nearbyParticles = [];
    //     const x = Math.floor(particle.x / gridSize);
    //     const y = Math.floor(particle.y / gridSize);
        
    //     // Check the surrounding cells including the particle's own cell
    //     for (let dx = -1; dx <= 1; dx++) {
    //         for (let dy = -1; dy <= 1; dy++) {
    //             const key = `${x + dx}_${y + dy}`;
    //             if (this.grid[key]) {
    //                 nearbyParticles.push(...this.grid[key]);
    //             }
    //         }
    //     }
    //     return nearbyParticles;
    // }
    
// // Calculate the force between two particles
// calculateForce(a, b, g) {
//     const dx = a.x - b.x;
//     const dy = a.y - b.y;
//     const dSquared = dx * dx + dy * dy; // square of distance between particles
//     if (dSquared >= 0 && dSquared < this.interactionDistanceSquared) {
//         const F = g / Math.sqrt(dSquared); // calculate F only when needed
//         return { fx: F * dx, fy: F * dy };
//     }
//     return { fx: 0, fy: 0 };
// }

// // Collision detection and resolution function
// resolveCollision(a, b) {
//     const dx = a.x - b.x;
//     const dy = a.y - b.y;
//     const distance = Math.sqrt(dx * dx + dy * dy);
//     const minDistance = 2; // Since each particle has a size of 2x2
    
//     // Check for collision
//     if (distance < minDistance && distance > 0) {
//         // Calculate overlap
//         const overlap = 0.5 * (minDistance - distance);
        
//         // Calculate the displacement needed for each particle along the line of centers
//         const displacementX = overlap * (dx / distance);
//         const displacementY = overlap * (dy / distance);
        
//         // Adjust positions to resolve collision
//         a.x += displacementX;
//         a.y += displacementY;
//         b.x -= displacementX;
//         b.y -= displacementY;
//     }
// }