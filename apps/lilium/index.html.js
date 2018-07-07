module.exports = cli => `<!DOCTYPE html>
<html>
    <head>
        <title>Lilium | ${cli._c.website.sitetitle}</title>
        <link rel="icon" type="image/png" href="${cli._c.server.protocol}${cli._c.server.url}/static/media/favicon.png">
    </head>
    <body>
        <div id="app"></div>
        <script src="/lmlbackend/app.bundle.js"></script>
    </body>
</html>`;