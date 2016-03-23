# Lilium CMS #

Lilium is a lightning-fast, online Content Management System built with node.js, without express. Its power resides in the cache engine running behind Lilium, which reduces CPU usage, RAM and database access.

Interpreting its own simple language, Lilium used LML (Lilium Markup Language) to create the templates and generate the served files. LML is user friendly, ressemble HTML and makes it easy for new developers or web designers to customize their very own themes (gardens).

## Installation guide

All NodeJS plugins are to be installed, and are documented in the package file so you can simply run *npm install* in the root folder where you setup Lilium.

### Required dependencies
#### *cairo*
**MAC:** `brew install pkg-config cairo libpng jpeg giflib`

**UBUNTU:**
`sudo apt-get install libcairo2-dev libjpeg8-dev libpango1.0-dev libgif-dev build-essential g++`

#### *Arty Signature font*
[Download link](http://www.1001fonts.com/arty-signature-font.html)
## NPM or GIT

#### nginx config

```
server {
        listen 8080; # or 80 if nginx listens to HTTP port

        server_name www.liliumcms.com liliumcms.com; # replace by domain
        port_in_redirect off;

        if ($http_host = "www.liliumcms.com") {
                rewrite ^ http://liliumcms.com$request_uri permanent;
        }

        location / {
                root /path/to/html/directory;
                try_files $uri/index.html @lilium;
        }

        location @lilium {
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header Host $http_host;
                proxy_set_header X-NginX-Proxy true;

                proxy_pass http://127.0.0.1:8282; # Lilium port
                proxy_redirect off;
        }
}
```


The CMS will be available on NPM and GitHub once ready to be released as a beta version.