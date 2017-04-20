const p = console.log;

const lib = {
    mysql : require('mysql'),
    bfj : require('bfj')
};

const HOST = {
    host : "ec2-52-4-107-39.compute-1.amazonaws.com",
    user : "root",
    database : "narcity_live",
    password : "q5oygaIEvxHf"
};

const CHUNK_SIZE = 3000;
const QUERIES = {
    listAllTables : "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'narcity_live'",
    selectTable : "SELECT * FROM ",
    count : "SELECT COUNT(0) AS total FROM ",
    limit : " LIMIT " + CHUNK_SIZE + " OFFSET "
};

const DATA = {
    tables : [],
    rows : {}
};

const GLOB = {
    connection : undefined
};

const getHandle = () => {
    let connection = lib.mysql.createConnection(HOST);
    connection.connect();
    connection.on('error', () => {
        connection = getHandle();
        GLOB.connection = connection;
    });

    return connection;
};

const closeHandle = (handle) => {
    handle.end();
};

const logMemory = () => {

}

const watchMemory = () => {
    setInterval(logMemory, 10000);
};

const getTableList = (handle, done) => {
    handle.query(QUERIES.listAllTables, (err, tables) => {
        for (let i = 0; i < tables.length; i++) {
            DATA.tables.push(tables[i].TABLE_NAME);
            DATA.rows[tables[i].TABLE_NAME] = [];
        }

        done();
    });
};

const storeTableData = (handle, table, send) => {
    let offset = 0;
    let gTotal = 0;
    let loopCount = 0;

    let runOffset = () => {
        handle.query(QUERIES.selectTable + table + QUERIES.limit + offset, (err, rows, cols) => {
            p('     Table ' + table + ", offset " + offset + " / " + gTotal + " ; Memory Usage : " + (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2) + " Mb");

            if (rows.length == 0) {
                return send();
            }

            offset += CHUNK_SIZE;
            let data = [];
            let loopCountString = (loopCount < 10 ? "000" : loopCount < 100 ? "00" : loopCount < 1000 ? "0" : "") + loopCount;
            let filename = 'output/' + table + "_" + loopCountString + ".json";
            console.log("        Writing " + filename);
            let outputfile = require('fs').createWriteStream(filename);
            outputfile.write("[");
            for (let i = 0; i < rows.length; i++) {
                outputfile.write(JSON.stringify(rows[i]) + ",");
            }
            outputfile.end('{}]');

            loopCount++;
            setTimeout(runOffset, 1);
        });
    };

    handle.query(QUERIES.count + table, (err, rows, cols) => {
        p(" > Working with table " + table + ", total rows : " + rows[0].total);
        gTotal = rows[0].total;
        runOffset();
    });
};

const saveDataToFile = () => {
    closeHandle(GLOB.connection);
    p("Done!");
    
    process.exit();
};

watchMemory();
GLOB.connection = getHandle();
getTableList(GLOB.connection, () => {
    let index = -1;
    let nextTable = () => {
        index++;
        
        if (DATA.tables[index]) {
            storeTableData(GLOB.connection, DATA.tables[index], nextTable);
        } else {
            saveDataToFile();
        }
    };

    nextTable();
});
