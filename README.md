![LML masthead copy.png](https://bitbucket.org/repo/yqaMzz/images/422959623-LML%20masthead%20copy.png)

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

## Known Issues ##

### nginx ###
The latest **nginx** setup tests reflected no issue with session constancy, but the setup is still experimental. 
Sockets seem to be working fine unless the session gets flushed. 

### pm2 ###
Lilium should be able to run under **pm2**, but has been showing some weird behaviours when forked into multiple threads, probably due to variables not being shared between instances.

### Gardener ###
The forked version requires Redis installed. Not stable yet since messages are not passed and cached items are inconsistent + chat is buggy.

## Contributors ##

* Erik Desjardins
* Samuel Rondeau-Millaire
* Daniel McAuley
* Narcity Media inc.

## License ##
This software does not come with a license. 

## Copyright ##
© Erik Desjardins, 2016
