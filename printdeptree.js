const dependencyTree = require('dependency-tree');
 
const deptree = dependencyTree({
    filename: process.argv[2] || 'index.prod.js',
    directory: __dirname,
    filter: path => path.indexOf('node_modules') === -1, // optional
    nonExistent: [] // optional
});

console.log(deptree);
