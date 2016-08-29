![LML masthead.png](https://bitbucket.org/repo/yqaMzz/images/269442748-LML%20masthead.png)

# Lilium CMS #

Lilium is a lightning-fast, web based content management system built with Node.JS. Its power resides in the cache engine running behind Lilium, which reduces CPU usage, RAM and database access.

Interpreting its own simple language, Lilium used LML (Lilium Markup Language) to create the templates and generate the served files. LML is user friendly, ressemble HTML and makes it easy for new developers or web designers to customize their very own themes.

The platform has its own framework and unique API. Lilium makes it easy to create a mobile app for a website, and is network based. It can hold multiple domains for a single instance, can use multiple different databases, and is compatible with content delivery network services. 

## Installation guide

All NodeJS plugins are to be installed, and are documented in the package file so you can simply run *npm install* in the root folder where you setup Lilium.

### Required dependencies
*Might need **cairo***

**MAC:** `brew install pkg-config cairo libpng jpeg giflib imagemagick`

**UBUNTU:**
`sudo apt-get install libcairo2-dev libjpeg8-dev libpango1.0-dev libgif-dev build-essential g++ libkrb5-dev imagemagick`

#### Arty Signature font
[Download link](http://www.1001fonts.com/arty-signature-font.html)

## Working with nginx ##
###Experimental configuration file###

```
upstream lilium_proxy  {
        server 127.0.0.1:[LILIUM_PORT];
        keepalive 64;
}

map $http_sec_websocket_key $upgr {
    ""      "";           # If the Sec-Websocket-Key header is empty, send no upgrade header
    default "websocket";  # If the header is present, set Upgrade to "websocket"
}

map $http_sec_websocket_key $conn {
    ""      $http_connection;  # If no Sec-Websocket-Key header exists, set $conn to the incoming Connection header
    default "upgrade";         # Otherwise, set $conn to upgrade
}

server {
        listen 80;

        server_name www.DOMAIN.com DOMAIN.com;
        # port_in_redirect off;

        large_client_header_buffers 8 32k;
        index index.html;

        if ($http_host = "www.DOMAIN.com") {
                rewrite ^ http://DOMAIN.com$request_uri permanent;
        }

        location / {
                alias /absolute/path/to/html;
                try_files $uri $uri/ @lilium;
        }

        location /admin/* {
                try_files @lilium =404;
        }

        location @lilium {
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header Host $http_host;
                proxy_set_header X-NginX-Proxy true;

                # prevents 502 bad gateway error
                proxy_buffers 8 32k;
                proxy_buffer_size 64k;

                proxy_pass http://lilium_proxy;
                proxy_redirect off;

                # enables WS support
                proxy_http_version 1.1;
                proxy_set_header Upgrade $upgr;
                proxy_set_header Connection $conn;
        }
}
```

## Known Issues ##

### nginx ###
The latest **nginx** setup tests reflected an issue with session constancy, and is still experimental. Sockets seem to be working fine unless the session gets flushed. 

### pm2 ###
Lilium should be able to run under **pm2**, but has been showing some weird behaviours probably due to variables not being shared between instances. 