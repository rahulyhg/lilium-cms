let letItCrash = () => {
    let doIt = () => {
        throw new Error("This error was thrown on purpose.");
    };

    doIt();
}

class AddToStack {
    constructor() {
        
    }

    crash() {
        letItCrash();
    }
}

new AddToStack().crash();
