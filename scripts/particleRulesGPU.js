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
            red: { red: 0, blue: 0, yellow: 0, green: 0 },
            yellow: { yellow: 0, blue: 0, red: 0, green: 0 },
            green: { green: 0, blue: 0, red: 0, yellow: 0 },
        }
        // Simulation constants
        this.interactionDistance = 150,
        this.friction = 0.5,
        this.interactionDistanceSquared = this.interactionDistance * this.interactionDistance;
        this.vwidth = this.runtime.viewportWidth;
        this.vheight = this.runtime.viewportHeight;
        this.gridWidth = Math.ceil(this.vwidth / this.interactionDistance);
        this.gridHeight = Math.ceil(this.vheight / this.interactionDistance);
        // Data structures for GPU
        this.stride = 7; // Number of variables per particle, used to calculate the location in the flattened particleDataForGPU array
        this.particleDataForGPU = null;
        this.particleDataFromGPU = null;
        this.gridDataForGPU = null;
        this.ruleSetForGPU = null;
    }
    
    update() {
        if (!this.isSimulating) return;
    
        // Update the grid with the current particles
        this.updateParticleCells();
        this.packageAllDataForGPU();
        
        // Send package to GPU
        
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
        console.log(this.grid);
    }

    async initializeDataStructures() {
        const numberOfPartciles = this.particlesArray.length;
        this.particleDataForGPU = new Float32Array(numberOfPartciles * this.stride);
        this.particleDataFromGPU = new Float32Array(numberOfPartciles * this.stride);
        this.gridDataForGPU = new Int32Array(this.interactionDistance * this.interactionDistance * numberOfPartciles); // gridWidth and gridHeight are the number of cells in a row and column respectively, particlesPerCell is the max number of particles you expect in a cell
        this.ruleSetForGPU = new Int8Array(16);
    }

    packageAllDataForGPU() {
        this.packageParticleDataForGPU();
        this.packageGridForGPU(this.grid);
    }

    packageParticleDataForGPU() {
        for (let i = 0; i < this.particlesArray.length; i++) {
            const particle = this.particlesArray[i];
            this.particleDataForGPU[i * this.stride] = particle.x;
            this.particleDataForGPU[i * this.stride + 1] = particle.y;
            this.particleDataForGPU[i * this.stride + 2] = particle.vx;
            this.particleDataForGPU[i * this.stride + 3] = particle.vy;
            this.particleDataForGPU[i * this.stride + 4] = particle.fx;
            this.particleDataForGPU[i * this.stride + 5] = particle.fy;
            this.particleDataForGPU[i * this.stride + 6] = this.colorToIndex[particle.color];
        }
    }

    packageGridForGPU(gridData) {
        for (let i = 0; i < gridData.length; i++) {
            const cell = gridData[i];
            const startIndex = cell.startIndex;
            const endIndex = cell.endIndex;
            const cellIndex = i * particlesPerCell;
            for (let j = startIndex; j < endIndex; j++) {
                this.gridDataForGPU[cellIndex + j] = j;
            }
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

    updateParticleData(updatedParticles) {
        for (let i = 0; i < updatedParticles.length; i++) {
            const particle = updatedParticles[i];
            let index = this.particleMap.get(particle.id);
            let a = this.particlesArray[index];
            a.x = particle.wx;
            a.y = particle.wy;
            a.vx = particle.vx;
            a.vy = particle.vy;
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