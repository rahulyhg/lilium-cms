const fs = require('fs');

const rootFiles = [
    ...fs.readdirSync('.').map(x => './' + x)
].filter(x => x.endsWith('.js'));

const deps = {};

const getDeps = (file, pass = 0) => {
    try {
        const lines = fs.readFileSync(file).toString().split('\n');
        deps[file] = deps[file] || [];

        lines.forEach(line => {
            const reg = /require\(["']([./a-zA-Z0-9]+)["']\)/;
            const result = reg.exec(line);
            if (result && result[1].startsWith('.')) {
                let filename = result[1].replace(/\.\./g, '.');
                if (!filename.endsWith('.js') && !filename.endsWith('.json')) {
                    filename += '.js';
                }

                deps[file].push(filename);

                if (pass < 5) {
                    getDeps(filename, pass + 1);
                }
            }
        });

        deps[file] = Array.from(new Set(deps[file]));
    } catch (err) { }
}

rootFiles.forEach(x => {
    getDeps(x);
});

let singledep = process.argv[2];

if (singledep) {
    if (!singledep.startsWith('.')) {
        singledep = './' + singledep;
    }

    Object.keys(deps).filter(x => deps[x].includes(singledep)).forEach(x => console.log(x));
} else {
    console.log(deps);
}
