const readSplitJSON = (file) => {
    return new Promise((resolve, reject) => {
        let container = [];
        let loopCount = 0;
        let readNextJSON = () => {
            let loopCountString = (loopCount < 10 ? "000" : loopCount < 100 ? "00" : loopCount < 1000 ? "0" : "") + loopCount;
            let filename = "../output/" + file + "_" + loopCountString + ".json";

            console.log("Trying to read " + filename);
            try {
                let tempArr = require(filename);
                container.push(...tempArr);
                container.pop();
                tempArr = undefined;

                console.log(" Container now has " + container.length + " items");
                loopCount++;
                return readNextJSON();
            } catch (ex) {
                console.log("Done reading split JSON, returning " + container.length + " items");
                resolve(container);

                container = undefined;
                return true;
            }
        };

        return readNextJSON();
    });
};

module.exports = readSplitJSON;
