class uObject {
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

class uWords {
    contentStats(content) {
        let words = content.split(' ');
        let wCounts = {};
        let sortedWords = [];

        for (let i = 0; i < words.length; i++) {
            let word = words[i].toLowerCase().replace(/['".%!?,]/g, "");
            wCounts[word] = wCounts[word] ? wCounts[word] + 1 : 1;
        }

        let keys = Object.keys(wCounts);
        sortedWords = keys.sort(function(a, b) { return wCounts[a] - wCounts[b] }).reverse();

        return {
            words : {
                list : wCounts, 
                sorted : sortedWords
            }
        };
    }
}

class Utils {
    constructor() {
        this.objects = new uObject();
        this.words = new uWords();
    }
}

module.exports = new Utils;
