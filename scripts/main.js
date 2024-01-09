// import { Rules } from "./particleRules.js";
import { Rules } from "./particleRulesGPU.js";
import { SeedLogic } from "./seedLogic.js";


// Import any other script files here, e.g.:
// import * as myModule from "./mymodule.js";

runOnStartup(async runtime =>
{
	// Code to run on the loading screen.
	// Note layouts, objects etc. are not yet available.
	runtime.Rules = new Rules(runtime);
	runtime.SeedLogic = new SeedLogic(runtime);
	
	// Load any scripts that need to be loaded before the project starts,
	loadScript(runtime, "./gpu-browser.min.js").then(() => {
		// console.log(window.GPU);
		runtime.gpu = new window.GPU.GPU();
	}).catch((error) => {
		console.error("Failed to load the script:", error);
	});
	
	
	runtime.addEventListener("beforeprojectstart", () => OnBeforeProjectStart(runtime));
});

async function OnBeforeProjectStart(runtime)
{
	// Code to run just before 'On start of layout' on
	// the first layout. Loading has finished and initial
	// instances are created and available to use here.
	createSliders(runtime);
	// gpuTest(runtime);
	
	runtime.addEventListener("tick", () => Tick(runtime));
}

function Tick(runtime)
{
	// Code to run every tick
	// Note runtime.objects is now available, containing
	// instances of all objects in the project.

	const FPSText = runtime.objects.FPSText.getFirstInstance();
	FPSText.text = String(runtime.fps);

	if (!runtime.Rules.isSimulating && !runtime.Rules.isLoading) {
		maxParticles(runtime, 800);
		protectFrictionInput(runtime);
		protectInteractionDistanceInput(runtime);
		sliderValueUpdate(runtime);
		sliderEnabledUpdate(runtime);
		settingParametersUpdate(runtime);
	} else if (runtime.Rules.isSimulating && !runtime.Rules.isLoading) {
		runtime.Rules.update();
	} else if (!runtime.Rules.isSimulating && runtime.Rules.isLoading) {
		loadNumberInputValues(runtime);
		loadSliderValues(runtime);
		loadSettingValues(runtime);
		runtime.Rules.isLoading = false;
	}
}

function gpuTest(runtime) {
	const gpu = runtime.gpu;
}

function loadScript(runtime, scriptUrl) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = scriptUrl;
        
        // Resolve the promise once the script is loaded
        script.onload = () => {
            resolve(script);
			// runtime.addEventListener("beforeprojectstart", () => OnBeforeProjectStart(runtime));
        };

        // Reject the promise if there's an error loading the script
        script.onerror = () => {
            reject(new Error(`Script load error for ${scriptUrl}`));
        };

        document.body.appendChild(script);
    });
}

function createSliders(runtime) {
	const startY = 170;
	const ySpacing = 30;
	const yCategorySpacing = 30;

	let currentY = startY;

	Object.keys(runtime.Rules.ruleSet).forEach((color, categoryIndex) => {
		Object.keys(runtime.Rules.ruleSet[color]).forEach((subColor, index) => {
			const slider = runtime.objects.attractionSlider.createInstance("options", 25, currentY, true);
			slider.color = color;
			slider.subColor = subColor;
			currentY += ySpacing;
		});
		currentY += yCategorySpacing;
	});
}

function sliderValueUpdate(runtime) {
    // Retrieve all instances of sliders
    const sliders = runtime.objects.attractionSlider.getAllInstances();
    const ruleSet = runtime.Rules.ruleSet;
	const colorColors = {
		red: "[color=#fd4848]",
		blue: "[color=#4890fd]",
		yellow: "[color=#fdeb48]",
		green: "[color=#6cfd48]",
	}

    // Iterate through each slider
    sliders.forEach((slider) => {
        // Get the color categories and value from each slider
        const color = slider.color;
        const subColor = slider.subColor;
        const value = slider.value;
		let ruleText;
		if (value < 0) {
			ruleText = `${value} | ${colorColors[color]}${color}[/color] is attracted to ${colorColors[subColor]}${subColor}[/color]`;
		} else if (value > 0) {
			ruleText = `${value} | ${colorColors[color]}${color}[/color] is repelled from ${colorColors[subColor]}${subColor}[/color]`;
		} else if (value == 0) {
			ruleText = `${value} | ${colorColors[color]}${color}[/color] and ${colorColors[subColor]}${subColor}[/color] have no interaction`;
		}

        // Update the ruleSet with the new value from the slider
        ruleSet[color][subColor] = value;

        // Access the text child of the slider
        const textObject = slider.getChildAt(0);

        if (textObject) {
            textObject.text = ruleText;
        }
    });
}

function maxParticles(runtime, max) {
	const numberInput = runtime.objects.numberInput.getAllInstances();

	numberInput.forEach((input) => {
		const number = Number(input.text);
		if (number < 0) {
			input.text = "0";
		}
		if (number > max) {
			input.text = String(max);
		}
	});
}

function protectFrictionInput(runtime) {
	const settingInput = runtime.objects.settingInput.getAllInstances();

	settingInput.forEach((setting) => {
		if (setting.instVars.setting == "friction") {
			const number = Number(setting.text);

			if (number < 0.1) {
				setting.text = "0.1";
			}
			if (number > 0.5) {
				setting.text = "0.5";
			}
		}
	});
}

function protectInteractionDistanceInput(runtime) {
	const settingInput = runtime.objects.settingInput.getAllInstances();

	settingInput.forEach((setting) => {
		if (setting.instVars.setting == "interactionDistance") {
			const number = Number(setting.text);

			if (number < 1) {
				setting.text = "1";
			}
			if (number > 200) {
				setting.text = "200";
			}
		}
	});
}

function sliderEnabledUpdate(runtime) {
	const numberInput = runtime.objects.numberInput.getAllInstances();
	const sliders = runtime.objects.attractionSlider.getAllInstances();
	const colors = [];
	const createdColors = runtime.Rules.createdColors;
	
	numberInput.forEach((input) => {
		const color = input.instVars.color;
		let number = Number(input.text);
		if (number != 0 && !isNaN(number)) {
			colors.push(color);
			createdColors[color] = number;
		} else {
			delete createdColors[color];
		}
	});

	sliders.forEach((slider) => {
		const color = slider.color;
		const subColor = slider.subColor;

		if (colors.includes(color) && colors.includes(subColor)) {
			slider.isEnabled = true;
		} else {
			slider.isEnabled = false;
		}
	});
}

function settingParametersUpdate(runtime) {
	const settingInput = runtime.objects.settingInput.getAllInstances();
	
	settingInput.forEach((input) => {
		const setting = input.instVars.setting;
		const value = Number(input.text);
		
		runtime.Rules[setting] = value;
	});
	runtime.SeedLogic.updateInteractionDistanceSquared();
}

// Load functions
function loadNumberInputValues(runtime) {
	const numberInput = runtime.objects.numberInput.getAllInstances();

	numberInput.forEach((input) => {
		const color = input.instVars.color;
		const value = runtime.Rules.createdColors[color];

		input.text = String(value);
	});
}

function loadSliderValues(runtime) {
	const sliders = runtime.objects.attractionSlider.getAllInstances();
	const ruleSet = runtime.Rules.ruleSet;

	sliders.forEach((slider) => {
		const color = slider.color;
		const subColor = slider.subColor;
		const value = ruleSet[color][subColor];

		slider.value = value;
	});
}

function loadSettingValues(runtime) {
	const settingInput = runtime.objects.settingInput.getAllInstances();

	settingInput.forEach((input) => {
		const setting = input.instVars.setting;
		const value = runtime.Rules[setting];

		input.text = String(value);
	});
}