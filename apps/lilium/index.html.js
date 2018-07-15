module.exports = cli => `<!DOCTYPE html>
<html>
    <head>
        <title>Lilium | ${cli._c.website.sitetitle}</title>
        <link rel="icon" type="image/png" href="${cli._c.server.protocol}${cli._c.server.url}/static/media/favicon.png">
        <link href="https://fonts.googleapis.com/css?family=Nunito+Sans" rel="stylesheet">
        <link rel="stylesheet" href="https://pro.fontawesome.com/releases/v5.1.0/css/all.css" integrity="sha384-87DrmpqHRiY8hPLIr7ByqhPIywuSsjuQAfMXAE0sMUpY3BM7nXjf+mLIUSvhDArs" crossorigin="anonymous">
        <link rel="stylesheet" type="text/css" href="${cli._c.server.protocol}${cli._c.server.url}/lilium.css" />
    </head>
    <body>
        <div id="app"></div>
        <script src="/tinymce/tinymce.js"></script>
        <script src="/lmlbackend/app.bundle.js"></script>
    </body>
</html>`;