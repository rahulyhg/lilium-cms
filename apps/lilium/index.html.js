module.exports = cli => `<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">

        <title>Lilium | ${cli._c.website.sitetitle}</title>
        <link rel="icon" type="image/png" href="${cli._c.server.protocol}${cli._c.server.url}/static/media/favicon.png">
        <link href="https://fonts.googleapis.com/css?family=Nunito+Sans|Oswald|Yanone+Kaffeesatz:700|Lora" rel="stylesheet">
        <link rel="stylesheet" href="https://pro.fontawesome.com/releases/v5.5.0/css/all.css" integrity="sha384-j8y0ITrvFafF4EkV1mPW0BKm6dp3c+J9Fky22Man50Ofxo2wNe5pT1oZejDH9/Dt" crossorigin="anonymous">
        <link rel="stylesheet" type="text/css" href="${cli._c.server.protocol}${cli._c.server.url}/static/compiled/v4.css" />
        <link rel="stylesheet" type="text/css" href="${cli._c.server.protocol}${cli._c.server.url}/flatpickr/flatpickr.min.css" />    
    </head>
    <body>
        <div id="app"></div>
        <script src="${cli._c.server.protocol}${cli._c.server.url}/tinymce/tinymce.js"></script>
        <script src="${cli._c.server.protocol}${cli._c.server.url}/chartjs/Chart.min.js"></script>
        <script src="${cli._c.server.protocol}${cli._c.server.url}/lmlbackend/app.bundle.js"></script>
        <script src="${cli._c.server.protocol}${cli._c.server.url}/lmlbackend/vendors.app.bundle.js"></script>
        <script src="${cli._c.server.protocol}${cli._c.server.url}/lmlbackend/main.app.bundle.js"></script>
    </body>
</html>`.replace(/\n/g, '').replace(/\>\s*\</g, '><');
