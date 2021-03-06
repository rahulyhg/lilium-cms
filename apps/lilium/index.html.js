module.exports = cli => {
    let origin = cli._c.server.protocol + cli._c.server.url;
    let buildLocation = origin + "/lmlbackend";
    let fulldevenv = false;

    if (cli._c.env == "dev" && cli._c.v4devserver && cli._c.v4devserver.active) {
        buildLocation = `http://${cli._c.v4devserver.domain}:${cli._c.v4devserver.port}`;
        fulldevenv = true;
    }

    return `<!DOCTYPE html>
        <html>
            <head>
                <meta charset="UTF-8">

                <title>Lilium | ${cli._c.website.sitetitle}</title>
                <link rel="icon" type="image/png" href="${origin}/static/media/favicon.png">
                <link href="https://fonts.googleapis.com/css?family=Nunito+Sans|Oswald|Yanone+Kaffeesatz:700|Lora" rel="stylesheet">
                <link rel="stylesheet" href="https://pro.fontawesome.com/releases/v5.5.0/css/all.css" integrity="${cli._c.fontawesomeprointegrity||"sha384-j8y0ITrvFafF4EkV1mPW0BKm6dp3c+J9Fky22Man50Ofxo2wNe5pT1oZejDH9/Dt"}" crossorigin="anonymous">
                <link rel="stylesheet" type="text/css" href="${origin}/static/compiled/v4.css" />

                <link rel="stylesheet" type="text/css" href="${origin}/flatpickr/flatpickr.min.css" />    
            </head>
            <body>
                <div id="app"></div>

                <script>
                    window.liliumcms = ${JSON.stringify({
                        env : cli._c.env,
                        uid : cli._c.uid,
                        url : origin,
                        domain : cli._c.server.url.substring(2),
                        sitename : cli._c.website.sitetitle,
                        fulldevenv : !!fulldevenv
                    })};
                </script>
                
                <script src="${origin}/tinymce/tinymce.js"></script>
                <script src="${origin}/chartjs/Chart.min.js"></script>

                ${
                    fulldevenv ? `
                        <script async src="${buildLocation}/app.bundle.js"></script>
                        <script async src="${buildLocation}/vendors.app.bundle.js"></script>
                        <script async src="${buildLocation}/layout.app.bundle.js"></script>
                        <script async src="${buildLocation}/pages.app.bundle.js"></script>
                        <script async src="${buildLocation}/main.app.bundle.js"></script>
                    ` : `
                        <script src="${buildLocation}/main.bundle.js"></script>
                        <script src="${buildLocation}/preact.bundle.js"></script>
                        <script src="${buildLocation}/runtime.bundle.js"></script>
                        <script>__start_lilium__();</script>
                    `
                }
        </html>`.replace(/\n/g, '').replace(/\>\s*\</g, '><').replace(/\s\s+/g, ' ');
};
