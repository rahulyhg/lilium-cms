![LML masthead](https://www.narcitymedia.com/wp-content/uploads/2017/08/422959623-LML-masthead-copy.png)

# Lilium CMS #

Lilium is a lightning-fast, web based content management system built with Node.JS. Its power resides in the cache engine running behind Lilium, which reduces CPU usage, RAM and database access.

Interpreting its own simple language, Lilium uses LML (Lilium Markup Language) to create the templates and generate the served files. LML is user friendly, ressemble HTML and makes it easy for new developers or web designers to customize their very own themes.

The platform has its own framework and unique API. Lilium makes it easy to create a mobile app for a website, and is network based. It can hold multiple domains for a single instance, can use multiple different databases, and is compatible with content delivery network services. 

## Installation guide

All NodeJS plugins are to be installed, and are documented in the package file so you can simply run *npm install* in the root folder where you setup Lilium.

### Required dependencies
*Might need **cairo***

**MAC:** `brew install pkg-config cairo libpng jpeg giflib imagemagick`

**UBUNTU:**
`sudo apt-get install libcairo2-dev libjpeg8-dev libpango1.0-dev libgif-dev build-essential g++ libkrb5-dev imagemagick`

### Language detection
Lilium uses *franc* to detect languages and currently supports English and French.

## I want to code, too
See the [Lilium CMS Wiki](https://github.com/narcitymedia/lilium-cms/wiki) and get started!

## Working with nginx
### Experimental configuration file

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

proxy_cache_path /usr/share/lilium/html/nginxcache levels=1:2 keys_zone=my_cache:10m max_size=10g inactive=60m use_temp_path=off;

server {
        listen 80;

        server_name website.com;
        # port_in_redirect off;

        large_client_header_buffers 8 32k;
        index index.html;

        location / {
                proxy_cache my_cache;
                proxy_cache_revalidate on;
                proxy_cache_min_uses 3;
                proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
                proxy_cache_lock on;

                alias /usr/share/lilium/html/website/;
                try_files $uri $uri.html @lilium;
        }

        location /(admin|login)/ {
                try_files @lilium =404;
        }

        location @lilium {
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header Host $http_host;
                proxy_set_header Host $host;
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

## Production version ##
4.1.0

## Founder ##
* Erik Desjardins

## Contributors ##

* Erik Desjardins
* Samuel Rondeau-Millaire
* Daniel McAuley
* Era Sinbandith
* Narcity Media inc.

![bitmoji](https://render.bitstrips.com/v2/cpanel/9188364-18598575_8-s1-v1.png?transparent=1&palette=1&width=246)

## License ##
This software does not come with a license. 

## Copyright ##
© Narcity Media, 2017
