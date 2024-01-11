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
            const totalParticles = simulationConstants[9];
            const particleIndex = this.thread.y;
            const attributeIndex = this.thread.x;
            let x = particleData[particleIndex][0];
            let y = particleData[particleIndex][1];
            let vx = particleData[particleIndex][2];
            let vy = particleData[particleIndex][3];
            const color = particleData[particleIndex][4];

            const particleCell = Math.floor(x / simulationConstants[0]) + (Math.floor(y / simulationConstants[0])) * simulationConstants[6];

            for (let xAxis = -1; xAxis <= 1; xAxis++) {
                for (let yAxis = -1; yAxis <= 1; yAxis++) {
                    const cellToCheck = particleCell + xAxis + (yAxis * simulationConstants[6]);
                    if (cellToCheck >= 0 || cellToCheck < simulationConstants[7]) { // Check if cell is within bounds
                        const startIndex = gridIndices[cellToCheck * 2];
                        const endIndex = gridIndices[cellToCheck * 2 + 1];

                        for (let j = 0; j < totalParticles; j++) {
                            if (j >= startIndex && j < endIndex && j !== particleIndex) { // Check if particle is within bounds and not the same particle
                                const bIndex = particleData[startIndex + j]; // Particle to check against
                                const bX = particleData[bIndex][0];
                                const bY = particleData[bIndex][1];
                                const bColor = particleData[bIndex][4];
                                // Calculate distance between particles
                                const dx = x - bX;
                                const dy = y - bY;
                                const dSquared = dx * dx + dy * dy;
                                const distance = Math.sqrt(dSquared);
                                return distance;
                                if (distance <= simulationConstants[0]) { // Check if particles are within interaction distance
                                    // Calculate force between particles
                                    const gravityConstant = ruleSet[color * 4 + bColor] / 10; // Retrieve the gravity constant from the ruleSet using color property
                                    const F = gravityConstant / distance; // F (force) is inversely proportional to distance (Newton's law of universal gravitation)
                                    // Calculate force components
                                    const fx = F * dx;
                                    const fy = F * dy;
                                    // Update velocity multiplied by friction
                                    vx += fx * simulationConstants[1];
                                    vy += fy * simulationConstants[1];
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
                vx *= -1; // Reverse velocity
                x += vx;
            } else if (x >= simulationConstants[3]) {
                vx *= -1; // Reverse velocity
                x += vx;
            }
            if (y <= 0) {
                vy *= -1; // Reverse velocity
                y += vy;
            } else if (y >= simulationConstants[4]) {
                vy *= -1; // Reverse velocity
                y += vy;
            }

            if (attributeIndex === 0) return x;
            if (attributeIndex === 1) return y;
            if (attributeIndex === 2) return vx;
            if (attributeIndex === 3) return vy;
            if (attributeIndex === 4) return color;
        }).setOutput([stride, particleDataLength]);
    }
}