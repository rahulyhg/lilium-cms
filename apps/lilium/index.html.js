module.exports = cli => `<!DOCTYPE html>
<html>
    <head>
        <title>Lilium | ${cli._c.website.sitetitle}</title>
        <link rel="icon" type="image/png" href="${cli._c.server.protocol}${cli._c.server.url}/static/media/favicon.png">
        <link href="https://fonts.googleapis.com/css?family=Nunito+Sans|Oswald|Yanone+Kaffeesatz:700|Lora" rel="stylesheet">
        <link rel="stylesheet" href="https://pro.fontawesome.com/releases/v5.1.0/css/all.css" integrity="sha384-87DrmpqHRiY8hPLIr7ByqhPIywuSsjuQAfMXAE0sMUpY3BM7nXjf+mLIUSvhDArs" crossorigin="anonymous">
        <link rel="stylesheet" type="text/css" href="${cli._c.server.protocol}${cli._c.server.url}/lilium.css" />
        <link rel="stylesheet" type="text/css" href="${cli._c.server.protocol}${cli._c.server.url}/flatpickr/flatpickr.min.css" />    
    </head>
    <body>
        <div id="app"></div>
        <script src="/tinymce/tinymce.js"></script>
        <script src="/chartjs/Chart.min.js"></script>
        <script src="/lmlbackend/app.bundle.js"></script>
    </body>
</html>`;
