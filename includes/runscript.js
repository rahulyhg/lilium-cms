global.liliumenv = {
    mode : "script",
    parent : this,
    script : require('process').argv[2]
};

const Lilium = require('../lilium');
const lilium = new Lilium();

lilium.cms();
