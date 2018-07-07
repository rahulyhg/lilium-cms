module.exports = cli => `<!DOCTYPE html>
<html>
    <head>
        <title>Lilium | ${cli._c.website.sitetitle}</title>
        <link rel="icon" type="image/png" href="${cli._c.server.protocol}${cli._c.server.url}/static/media/favicon.png">
        <link href="https://fonts.googleapis.com/css?family=Nunito+Sans" rel="stylesheet">
        <link rel="stylesheet" type="text/css" href="${cli._c.server.protocol}${cli._c.server.url}/lilium.css" />
    </head>
    <body>
        <div id="app"></div>
        <script src="/lmlbackend/app.bundle.js"></script>
    </body>
</html>`;