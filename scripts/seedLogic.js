export class SeedLogic {
    constructor(runtime) {
        this.runtime = runtime;
    }

    setSeedText() {
        const seedText = this.runtime.objects.seedText.getFirstInstance();
        const seed = this.createHash();
        
        seedText.text = seed;
    }
    
    randomizeSettings() {
        this.runtime.Rules.isLoading = true;
        
        // Randomize the ruleSet and createdColors
        for (let color in this.runtime.Rules.ruleSet) {
            let isColorActive = Math.random() > 0.1; // 90% chance of being active
            // If the color is not active, set all the values to 0 and delete the color from createdColors
            if (!isColorActive) {
                for (let affectingColor in this.runtime.Rules.ruleSet[color]) {
                    this.runtime.Rules.ruleSet[color][affectingColor] = 0;
                    delete this.runtime.Rules.createdColors[color];
                }
            } else {
                const numberOfParticles = Math.floor(this.randomRange(50, 250));
                this.runtime.Rules.createdColors[color] = numberOfParticles;
                for (let affectingColor in this.runtime.Rules.ruleSet[color]) {
                    this.runtime.Rules.ruleSet[color][affectingColor] = parseFloat(this.randomRange(-2, 2).toFixed(1));
                }
            }
        }
        
        this.runtime.Rules.friction = parseFloat(this.randomRange(0.1, 0.5).toFixed(1));
        this.runtime.Rules.interactionDistance = Math.floor(this.randomRange(50, 250));
        this.updateInteractionDistanceSquared();
    }
    
    randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }
    
    // Function to create a hash string from your variables
    createHash() {
        const createdColors = this.runtime.Rules.createdColors;
        const ruleSet = this.runtime.Rules.ruleSet;
        const interactionDistance = this.runtime.Rules.interactionDistance;
        const friction = this.runtime.Rules.friction;
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
        this.runtime.Rules.isLoading = true;
        // Decode the Base64 string into a JSON string
        const decoded = atob(hashString);
        
        // Parse the JSON string back into an object
        const data = JSON.parse(decoded);
        
        // Here you would set your variables from the data object
        this.runtime.Rules.createdColors = data.createdColors;
        this.runtime.Rules.ruleSet = data.ruleSet;
        this.runtime.Rules.interactionDistance = data.interactionDistance;
        this.runtime.Rules.friction = data.friction;
    }
    
    updateInteractionDistanceSquared() {
        this.runtime.Rules.interactionDistanceSquared = this.runtime.Rules.interactionDistance * this.runtime.Rules.interactionDistance;
    }
}