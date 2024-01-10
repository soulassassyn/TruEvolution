import { Kernels } from "./kernels.js";

export class Rules {
    constructor(runtime) {
        this.runtime = runtime;
        this.layer = "interactive"
        this.isSimulating = false;
        this.isLoading = false;
        this.particlesArray = [];
        this.particleMap = new Map();
        this.grid = {};
        this.colorValues = { blue: 0.1, red: 0.5, yellow: 0.65, green: 0.8 }
        this.colorToIndex = { blue: 0, red: 1, yellow: 2, green: 3 }
        this.createdColors = {};
        this.ruleSet = {
            blue: { blue: 0, red: 0, yellow: 0, green: 0 },
            red: { blue: 0, red: 0, yellow: 0, green: 0 },
            yellow: { blue: 0, red: 0, yellow: 0, green: 0 },
            green: { blue: 0, red: 0, yellow: 0, green: 0 },
        }
        // Simulation constants
        this.interactionDistance = 150,
        this.friction = 0.5,
        this.interactionDistanceSquared = this.interactionDistance * this.interactionDistance;
        this.vwidth = this.runtime.viewportWidth;
        this.vheight = this.runtime.viewportHeight;
        this.gridWidth = Math.ceil(this.vwidth / this.interactionDistance);
        this.gridHeight = Math.ceil(this.vheight / this.interactionDistance);
        this.gridSize = this.gridWidth * this.gridHeight;
        this.stride = 5; // Number of variables per particle, used to calculate the location in the flattened particleDataForGPU array
        this.totalParticles = 0;
        
        // Data structures for GPU
        this.particleDataForGPU2D = null;
        this.particleDataFromGPU = null;
        this.gridStartIndices = null;
        this.ruleSetForGPU = null;
        this.simulationConstants = null;
    }
    
    async initializeDataStructures() {
        this.totalParticles = this.particlesArray.length;
        // this.particleDataForGPU = new Float32Array(this.totalParticles * this.stride);
        this.particleDataForGPU2D = new Array(this.totalParticles);
        for (let i = 0; i < this.totalParticles; i++) {
            this.particleDataForGPU2D[i] = new Float32Array(this.stride);
        }
        this.particleDataFromGPU = new Float32Array(this.totalParticles * this.stride);
        this.gridIndices = new Int16Array(this.gridSize * 2);
        this.gridIndices2D = new Int16Array(this.gridSize * 2);
        this.ruleSetForGPU = new Int8Array(16);
        const particleDataLength = this.particleDataForGPU2D.length;
        this.simulationConstants = new Float32Array([this.interactionDistance, this.friction, this.interactionDistanceSquared, this.vwidth, this.vheight, this.gridWidth, this.gridHeight, this.gridSize, this.stride, this.totalParticles]);
        this.runtime.Kernels = new Kernels(this.runtime, particleDataLength, this.simulationConstants); // Create GPU kernels with proper variables for this simulation
        console.log(this.particleDataForGPU2D);
        console.log(this.gridIndices2D);
        console.log(this.ruleSetForGPU);
    }

    update() {
        if (!this.isSimulating) return;
    
        // Update the grid with the current particles
        this.updateParticleCells();
        this.packageAllDataForGPU();
        
        // Send package to GPU
        const returnData = this.runtime.Kernels.runOutputTest();
        // console.log(this.runtime.Kernels.runOutputTest());

        // Update particle data
        this.updateParticleData(returnData);
    }

    // Update the grid for spatial hashing
    updateParticleCells() {
        this.grid = {};
        this.particlesArray.forEach((particle) => {
            const cellX = Math.floor(particle.x / this.interactionDistance);
            const cellY = Math.floor(particle.y / this.interactionDistance);
            const cell = cellX + (cellY * this.gridHeight);
            particle.cell = cell;
            if (!this.grid[cell]) {
                this.grid[cell] = [];
            }
            this.grid[cell].push(particle);
        });

        this.fillBlankGridCells();
    }

    // Fill in blank cells in the grid, this is necesary for correctly mapping indices for the GPU to use later
    fillBlankGridCells() {
        for (let i = 0; i < this.gridSize; i++) {
            if (!this.grid[i]) {
                this.grid[i] = [];
            }
        }
    }

    packageAllDataForGPU() {
        // this.packageParticleDataForGPU();
        this.packageParticleDataForGPU2D();
        // this.createGridIndexArrayForGPU();
        this.createGridIndexArrayForGPU2D();
    }

    // Package particle data in order of which cell they are in according to the grid
    packageParticleDataForGPU() {
        let globalIndex = 0;
        // Iterate over each grid cell
        Object.keys(this.grid).forEach((cellIndex) => {
            const cell = this.grid[cellIndex];
            // Add each particle's properties to the flattened array
            for (let currentCellIndex = 0; currentCellIndex < cell.length; currentCellIndex++) {
                const i = globalIndex;
                const particle = cell[currentCellIndex];
                this.particleDataForGPU[i * this.stride] = particle.x;
                this.particleDataForGPU[i * this.stride + 1] = particle.y;
                this.particleDataForGPU[i * this.stride + 2] = particle.vx;
                this.particleDataForGPU[i * this.stride + 3] = particle.vy;
                this.particleDataForGPU[i * this.stride + 4] = this.colorToIndex[particle.color];
                // this.particleDataForGPU[i * this.stride + 4] = particle.fx;
                // this.particleDataForGPU[i * this.stride + 5] = particle.fy;

                globalIndex++;
            }
        });
    }

    packageParticleDataForGPU2D() {
        let globalIndex = 0;
        // Iterate over each grid cell
        Object.keys(this.grid).forEach((cellIndex) => {
            const cell = this.grid[cellIndex];
            // Add each particle's properties to the flattened array
            for (let currentCellIndex = 0; currentCellIndex < cell.length; currentCellIndex++) {
                const i = globalIndex;
                const particle = cell[currentCellIndex];
                this.particleDataForGPU2D[i][0] = particle.x;
                this.particleDataForGPU2D[i][1] = particle.y;
                this.particleDataForGPU2D[i][2] = particle.vx;
                this.particleDataForGPU2D[i][3] = particle.vy;
                this.particleDataForGPU2D[i][4] = this.colorToIndex[particle.color];
                // this.particleDataForGPU2D[i][4] = particle.fx;
                // this.particleDataForGPU2D[i][5] = particle.fy;

                globalIndex++;
            }
        });
    }

    createGridIndexArrayForGPU() {
        // Each cell is represented by two elements (start and end index), hence gridSize * 2
        let particleIndex = 0;
    
        // startIndex and endIndex are the indices of the first and last particle in the cell
        // startIndex is inclusive, endIndex is exclusive
        for (let cell = 0; cell < this.gridSize; cell++) {
            const startIndex = particleIndex;
            const endIndex = startIndex + (this.grid[cell].length * this.stride);
    
            // Assign start and end indices for each cell
            this.gridIndices[cell * 2] = startIndex;
            this.gridIndices[cell * 2 + 1] = endIndex;
    
            particleIndex += (this.grid[cell].length * this.stride);
        }
    }

    createGridIndexArrayForGPU2D() {
        // Each cell is represented by two elements (start and end index), hence gridSize * 2
        let particleIndex = 0;

        // startIndex and endIndex are the indices of the first and last particle in the cell
        // startIndex is inclusive, endIndex is exclusive
        for (let cell = 0; cell < this.gridSize; cell++) {
            const startIndex = particleIndex;
            const endIndex = startIndex + (this.grid[cell].length);

            // Assign start and end indices for each cell
            this.gridIndices2D[cell * 2] = startIndex;
            this.gridIndices2D[cell * 2 + 1] = endIndex;

            particleIndex += (this.grid[cell].length);
        }
    }

    // Only called once at the start of the simulation as the ruleSet doesn't change during the simulation
    packageRuleSetForGPU() {
        let index = 0;
        for (let color in this.ruleSet) {
            for (let subColor in this.ruleSet[color]) {
                this.ruleSetForGPU[index] = this.ruleSet[color][subColor] * 10; // Multiply by 10 to avoid floating point numbers (this.ruleSetForGPU is an Int8Array)
                index++;
            }
        }
    }

    updateParticleData(returnData) {
        let globalIndex = 0;
        // Iterate over each grid cell
        Object.keys(this.grid).forEach((cellIndex) => {
            const cell = this.grid[cellIndex];
            // Add each particle's properties to the flattened array
            for (let currentCellIndex = 0; currentCellIndex < cell.length; currentCellIndex++) {
                const i = globalIndex;
                const particle = cell[currentCellIndex];
                this.cleanData(returnData[i], i);
                particle.x = returnData[i][0];
                particle.y = returnData[i][1];
                particle.vx = returnData[i][2];
                particle.vy = returnData[i][3];
                particle.fx = returnData[i][4];

                globalIndex++;
            }
        });
    }

    cleanData(data, index) {
        if (!data) return;
        if (data[0] === data[0]) return;
        for (let i = 0; i < data.length - 1; i++) {
            // Check if data is NaN
            if (data[i] !== data[i]) {
                data[i] = this.particleDataForGPU2D[index][i];
            }
        }
    }

    async createAllColors() {
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
            const x = this.random(vwidth);
            const y = this.random(vheight);
            const particle = this.runtime.objects.particle.createInstance(this.layer, x, y);
            particle.effects[0].isActive = true;
            particle.effects[0].setParameter(0, this.colorValues[color]);
            particle.id = particle.uid;
            particle.vx = 0; // velocity in x direction
            particle.vy = 0; // velocity in y direction
            particle.fx = 0; // force in x direction
            particle.fy = 0; // force in y direction
            particle.color = color;
            particle.cell = null;

            this.particlesArray.push(particle);
        }
    }
    
    random(number) {
        return Math.random() * number;
    }
    
    async startSimulation() {
        this.isLoading = true;
        await this.createAllColors();
        await this.initializeDataStructures();
        this.packageRuleSetForGPU();
        console.log("Loading complete");
        this.isSimulating = true;
        this.isLoading = false;
    }
    
    resetSimulation() {
        this.isSimulating = false;
        this.particles = {};
        this.particlesArray = [];
        this.createdColors = {};
    }
}