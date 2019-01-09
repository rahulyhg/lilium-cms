![LML masthead](https://www.narcitymedia.com/wp-content/uploads/2018/08/masthead.png)

# Lilium CMS V4 #
Lilium is a lightning-fast, web based content management system built with Node.JS. Its power resides in it intelligent caching engine which reduces CPU usage, RAM, and database access.

If server-side rendering is preferred over client-side rendering, Lilium offers a simplified way of generating HTML documents, storing them on disk or RAM, and serving them faster than most HTML preprocessors. It is possible to use either LML2 which ressembles PHP, or LML3 which is an easy to use routine using Javascript template strings.

The platform has its own framework and unique API. Lilium makes it easy to create a mobile app for a website, and is network based. It can hold multiple domains for a single instance, can use multiple different databases, and is compatible with content delivery network services. 

Lilium does not use Express, Mongoose, or other heavy libraries. Instead, it implements its own web server. 

## Installation guide

All NodeJS packages are to be installed, and are documented in the package file so you can simply run *npm run setupdev* in the root folder where you setup Lilium.

## Automated installation

Lilium was built on Linux, and is meant to be ran on Linux. Even though it will technically work on Mac, Lilium is not guaranteed to be stable on other operation systems. 

The CMS requires NodeJS v8+, and MongoDB v3+. You can follow online tutorials on how to install both of these before running the npm scripts, but it's a faily simple process. 

### Installing NodeJS 
You can follow [this tutorial](https://nodejs.org/en/download/package-manager) from the official NodeJS website.

From [the nodesource instructions](https://github.com/nodesource/distributions/blob/master/README.md#installation-instructions)
```
# Using Ubuntu
curl -sL https://deb.nodesource.com/setup_11.x | sudo -E bash -
sudo apt-get install -y nodejs

# Using Debian, as root
curl -sL https://deb.nodesource.com/setup_11.x | bash -
apt-get install -y nodejs
```

### Installing MongoDB
You can follow [this tutorial](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/) from the official MongoDB website.

#### Only run one of the following depending on your Ubuntu distro
```
# For Ubuntu 18
echo "deb [ arch=amd64 ] https://repo.mongodb.org/apt/ubuntu bionic/mongodb-org/4.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.0.list

# For Ubuntu 16
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/4.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.0.list

# For Ubuntu 14
echo "deb [ arch=amd64 ] https://repo.mongodb.org/apt/ubuntu trusty/mongodb-org/4.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.0.list
```

Then 

```
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo service mongod start
```

And MongoDB should be running. To make sure the installation was successful, you can open a shell using `mongo`. 

### Installing Lilium for development

You can clone Lilium in your favourite installation directory. At Narcity Media, we like to use `/usr/share/lilium` or `~/dev/lilium`. Make sure the directory is owned by you, **not by root**. 

Simply `cd` to the directory you want to use, and `git clone https://github.com/narcitymedia/lilium-cms`. 

Then, `cd lilium-cms` and `npm run setupdev`.

Once the installation process exists, you can start the CMS using `npm start`. Your browser should load the CMS if you browse to `localhost:8080/lilium`.

The development username and password are : `lilium` and `lilium`.

## Web panel for development
The CMS frontend is located under `/apps/lilium` and is transpiled using Webpack and Babel. 

### Required dependencies
**MAC:** 
`brew install pkg-config cairo libpng jpeg giflib imagemagick`

**UBUNTU:**
`sudo apt-get install libcairo2-dev libjpeg8-dev libpango1.0-dev libgif-dev build-essential g++ libkrb5-dev imagemagick`

The dependencies will be installed automatically during the `npm run setupdev` process. You can however install then manually if you prefer. 

## I want to code, too
See the [Lilium CMS Wiki](https://github.com/narcitymedia/lilium-cms/wiki) and get started!

## Script mode
It is possible to run a Javascript file in script mode. It will prevent Lilium from loading the listeners, CAIJ and other modules related to networking. The websites and databases will still be loaded on a single thread, and the script passed as an argument will be executed. 

`node runscript.js [script.js]`

## Random quote API
http://api.forismatic.com/api/1.0/?method=getQuote&format=json&lang=en

## Working with nginx

Nginx works well with Lilium. The following configuration is the most simplified version you can use. The config works with a Lilium instance located at `/usr/share/lilium/lilium-cms`, and runs at post `8080`.

Since Lilium does not handle HTTPS requests, using nginx in front of Lilium makes it possible to have a fully operational SSL website running on Lilium, without the SSL overhead during the local proxy upstream. 

### Experimental configuration file
```
upstream lilium_proxy  {
        server 127.0.0.1:8080;
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

        server_name localhost;
        # port_in_redirect off;

        large_client_header_buffers 8 32k;
        index index.html;

        location / {
                proxy_cache my_cache;
                proxy_cache_revalidate on;
                proxy_cache_min_uses 3;
                proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
                proxy_cache_lock on;

                alias /usr/share/lilium/html/default/;
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
* Gabriel Cardinal
* Narcity Media inc.

![bitmoji](https://render.bitstrips.com/v2/cpanel/9188364-18598575_8-s1-v1.png?transparent=1&palette=1&width=246)

## License ##
This software does not come with a license. 

## Copyright ##
© Narcity Media, 2018
