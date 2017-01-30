class Utils {
    pulloutProp(obj, prop) {
        if (typeof prop == "string") {
            prop = prop.split('.');
        }

        let finalVal = obj;
        prop.forEach((pname) => {
            finalVal = finalVal[pname];
        });
        
        return finalVal;
    }
}

module.exports = new Utils;
