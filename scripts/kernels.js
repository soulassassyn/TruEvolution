export class Kernels {
    constructor(runtime, particleDataLength2D, simulationConstants) {
        this.runtime = runtime;
        this.simulationConstants = simulationConstants;
        this.interactionDistance = simulationConstants[0];
        this.friction = simulationConstants[1];
        this.interactionDistanceSquared = simulationConstants[2];
        this.vwidth = simulationConstants[3];
        this.vheight = simulationConstants[4];
        this.gridWidth = simulationConstants[5];
        this.gridHeight = simulationConstants[6];
        this.gridSize = simulationConstants[7];
        this.stride = simulationConstants[8];
        this.totalParticles = simulationConstants[9];
        this.initializeKernels(particleDataLength2D, this.stride);
    }
    
    runOutputTest() {
        const particleData = this.runtime.Rules.particleDataForGPU2D;
        const gridIndices = this.runtime.Rules.gridIndices2D;
        const ruleSetForGPU = this.runtime.Rules.ruleSetForGPU;
        return this.outputTest(particleData, gridIndices, this.simulationConstants, ruleSetForGPU);
    }
    
    initializeKernels(particleDataLength, stride) {
        // Kernel test environement for debugging
        this.outputTest = this.runtime.gpu.createKernel(function(particleData, gridIndices, simulationConstants, ruleSet) {
            // debugger;
            const totalParticles = simulationConstants[9];
            const particleIndex = this.thread.x;
            let x = particleData[particleIndex][0];
            let y = particleData[particleIndex][1];
            let vx = particleData[particleIndex][2];
            let vy = particleData[particleIndex][3];
            const color = particleData[particleIndex][4];
            const interactionDistance = simulationConstants[0];
            const friction = simulationConstants[1];
            const gridWidth = simulationConstants[5];
            const gridHeight = simulationConstants[6];
            const cellX = Math.floor(x / interactionDistance);
            const cellY = Math.floor(y / interactionDistance);

            for (let xAxis = -1; xAxis <= 1; xAxis++) {
                for (let yAxis = -1; yAxis <= 1; yAxis++) {
                    const checkX = cellX + xAxis;
                    const checkY = cellY + yAxis;
                    if (checkX >= 0 && checkX < gridHeight && checkY >= 0 && checkY < gridWidth) { // checkX and checkY are within bounds
                        const cellToCheck = checkY * gridWidth + checkX;
                        const startIndex = gridIndices[cellToCheck * 2];
                        const endIndex = gridIndices[cellToCheck * 2 + 1];

                        for (let j = startIndex; j < totalParticles; j++) {
                            if (j >= startIndex && j < endIndex && j !== particleIndex) { // Check if particle is within bounds and not the same particle
                                const bX = particleData[j][0];
                                const bY = particleData[j][1];
                                const bColor = particleData[j][4];

                                // Calculate distance between particles
                                const dx = x - bX;
                                const dy = y - bY;
                                const dSquared = dx * dx + dy * dy;
                                const distance = Math.sqrt(dSquared);
                                if (distance > 0 && distance <= interactionDistance) { // Check if particles are within interaction distance
                                    // Collision detection and resolution
                                    const minDistance = 2; // Since each particle has a size of 2x2
                                    // Check for collision
                                    if (distance < minDistance) {
                                        // Calculate overlap
                                        const overlap = 0.5 * (minDistance - distance);
                                        
                                        // Calculate the displacement needed for each particle along the line of centers
                                        const displacementX = overlap * (dx / distance);
                                        const displacementY = overlap * (dy / distance);
                                        
                                        // Adjust positions to resolve collision
                                        x += displacementX;
                                        y += displacementY;
                                    }
                                    // Calculate force between particles
                                    const gravityConstant = ruleSet[color * 4 + bColor]; // Retrieve the gravity constant from the ruleSet using color property
                                    const F = gravityConstant / distance; // F (force) is inversely proportional to distance (Newton's law of universal gravitation)
                                    // Calculate force components
                                    const fx = F * dx;
                                    const fy = F * dy;
                                    // Update velocity multiplied by friction
                                    vx += fx * friction;
                                    vy += fy * friction;
                                }
                            }
                        }
                    }
                }
            }
            x += vx;
            y += vy;

            // Bounce off walls by ensuring particles are within bounds and adjusting velocity
            if (x <= 0) {
                x = -x; // Reflect position from the boundary
                vx *= -1; // Reverse velocity
            } else if (x >= simulationConstants[3]) {
                x = 2 * simulationConstants[3] - x; // Reflect position from the boundary
                vx *= -1; // Reverse velocity
            }
            if (y <= 0) {
                y = -y; // Reflect position from the boundary
                vy *= -1; // Reverse velocity
            } else if (y >= simulationConstants[4]) {
                y = 2 * simulationConstants[4] - y; // Reflect position from the boundary
                vy *= -1; // Reverse velocity
            }

            return [ x, y, vx, vy ]
        }).setOutput([particleDataLength]);
    }
}