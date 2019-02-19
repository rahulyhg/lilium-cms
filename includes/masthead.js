const p = console.log;

if (global.__TEST && !global.__CI) {
    const lineCount = 14 / 2;
    const lineLength = 76 / 2;

    const spacing = " ".repeat(process.stdout.columns / 2 - lineLength);

    p(`\x1b[1m\x1b[35m${"\n".repeat(process.stdout.rows / 2 - lineCount / 2)}

${spacing}░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
${spacing}░░                                                                        ░░
${spacing}░░  | |    (_) (_)                       | || |   | |          | |        ░░
${spacing}░░  | |     _| |_ _   _ _ __ ___   __   _| || |_  | |_ ___  ___| |_ ___   ░░
${spacing}░░  | |    | | | | | | | '_ ' _ \\  \\ \\ / /__   _| | __/ _ \\/ __| __/ __|  ░░
${spacing}░░  | |____| | | | |_| | | | | | |  \\ \V /   | |   | ||  __/\\__ \\ |_\\__ \\  ░░
${spacing}░░  |______|_|_|_|\\__,_|_| |_| |_|   \\_/    |_|    \\__\\___||___/\\__|___/  ░░
${spacing}░░                                                                        ░░
${spacing}░░░░░░░░░░░░░░░░░░░  LOADING LILIUM BEFORE RUNNING TESTS  ░░░░░░░░░░░░░░░░░░
    
    ${"\n".repeat(process.stdout.rows / 2 - lineCount)}`);

} else {
    const lineCount = 15 / 2;
    const lineLength = 50 / 2;

    const spacing = " ".repeat(process.stdout.columns / 2 - lineLength);

    p(`\x1b[1m\x1b[35m${"\n".repeat(process.stdout.rows / 2 - lineCount / 2)}

${spacing}░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
${spacing}░░                                                 ░░
${spacing}░░  | |    (_) (_)                       | || |    ░░
${spacing}░░  | |     _| |_ _   _ _ __ ___   __   _| || |_   ░░
${spacing}░░  | |    | | | | | | | '_ ' _ \\  \\ \\ / /__   _|  ░░
${spacing}░░  | |____| | | | |_| | | | | | |  \\ \V /   | |    ░░
${spacing}░░  |______|_|_|_|\\__,_|_| |_| |_|   \\_/    |_|    ░░
${spacing}░░                                                 ░░
${spacing}░░░░░░░░░░░   RUNNING GARDENER AND CAIJ   ░░░░░░░░░░░
    
    ${"\n".repeat(process.stdout.rows / 2 - lineCount)}`);


}
