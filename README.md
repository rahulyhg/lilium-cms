![LML masthead](https://www.narcitymedia.com/wp-content/uploads/2019/02/masthead.png)

# Lilium CMS V4 #
Lilium is a lightning-fast, web based content management system built with Node.JS. Its power resides in its intelligent caching engine which reduces CPU usage, RAM, and database access.

If server-side rendering is preferred over client-side rendering, Lilium offers a simplified way of generating HTML documents, storing them on disk or RAM, and serving them faster than most HTML preprocessors. It is possible to use either LML2 which ressembles PHP, or LML3 which is an easy to use routine using Javascript template strings.

The platform has its own framework and unique API. Lilium makes it easy to create a mobile app for a website, and is network based. It can hold multiple domains for a single instance, can use multiple different databases. It is compatible with content delivery network services. 

Lilium does not use Express, Mongoose, or other heavy libraries. Instead, it implements its own web server using native NodeJS libraries.

## Open source details
Narcity Media is using Lilium CMS in production. However, it is currently using the V3. That means this version is not ready for production just yet. We still invite you to try the CMS and have fun with it, but we recommend to wait until the V4 is stable before deploying a website. 

## Installation guide

All NodeJS packages are to be installed, and are documented in the package file. You can simply run *npm run setupdev* in the Lilium root folder.

## Automated installation

Lilium was built on Linux, and is meant to be run on Linux. Even though it will technically work on Mac, Lilium is not guaranteed to be stable on other operation systems. 

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

You can clone Lilium in your favourite installation directory. At Narcity Media, we like to use `/usr/share/lilium` or `~/dev/lilium`. Make sure the directory is owned by you, **not by root**. Also make sure to install it in a directory that is also owned by you since other sibling directories might be needed. 

Simply `cd` to the directory you want to use, and `git clone https://github.com/narcitymedia/lilium-cms`. 

Then, `cd lilium-cms` and `npm install && npm run setupdev`.

Once the installation process exits, you can start the CMS using `npm start` or `node index.prod.js`. Your browser should load the CMS if you browse to `localhost:8080/lilium`.

The development username and password are : `lilium` and `lilium`. Make sure to change them if you plan on deploying on a production machine. 

## Web panel for development
The CMS frontend is located under `/apps/lilium`. It is a [Preact app](https://preactjs.com), and is transpiled using Webpack and Babel. 

### Required dependencies
**MAC:** 
`brew install pkg-config cairo libpng jpeg giflib imagemagick redis`

**UBUNTU:**
`sudo apt-get install libcairo2-dev libjpeg8-dev libpango1.0-dev libgif-dev build-essential g++ libkrb5-dev imagemagick redis-server`

The dependencies will be installed automatically during the `npm run setupdev` process. You can however install then manually if you prefer. 

### Localhost connections to MongoDB 
If mongo still refuses to connect from NodeJS eventhough it works using the terminal cli, you might have to enable or disable authentication from your mongo config file (typically located in `/etc/mongod.conf`, under `security: authentication`). 

This information can be found easily online using search queries such as "Enable MongoDB authentication". We ran into this issue on multiple occasion, and it ended up being a different solution every time. 

### MongoDB with `brew`
On Mac, sometimes the MongoDB service will refuse connections from Lilium for obscure reasons. Our temporary solution it to start a `mongod` instance in a seperate terminal and add the desired parameters including the database path and authentation db. You also get an additional output stream from `mongod`. 

There likely is a better solution to make this work with `brew service`, but like mentionned earlier, we don't actively support MacOS nor do we recommend to run Lilium in production on a different OS than Linux. 

## I want to code, too
That must mean you're amazing. See the [Lilium CMS Wiki](https://github.com/narcitymedia/lilium-cms/wiki) and get started!

## Script mode
It is possible to run a Javascript file in script mode. It will prevent Lilium from loading the listeners, CAIJ and other modules related to networking. The websites and databases will still be loaded on a single thread, and the script passed as an argument will be executed. 

`node ./includes/runscript.js [script.js]`

## Random quote API
In older version, we used a random quote provider to add a cute message to The Daily Lilium, which is Lilium's newspaper.

http://api.forismatic.com/api/1.0/?method=getQuote&format=json&lang=en

## Working with nginx

[Nginx](https://www.nginx.com/) works well with Lilium. The following configuration is the most simplified version you can use. The config works with a Lilium instance located at `/usr/share/lilium/lilium-cms`, and runs at port `8080`.

Since Lilium does not handle HTTPS requests, using nginx in front of Lilium makes it possible to have a fully operational SSL website running on Lilium, without the SSL overhead during the local proxy upstream. 

Using [Certbot](https://certbot.eff.org/) or [LetsEncrypt](https://letsencrypt.org/), you can quicky generate an HTTPS cert. 

### Basic nginx configuration file
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

        location /(lilium|login)/ {
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
* [Erik Desjardins](https://github.com/rykdesjardins)

## Contributors ##

* [Erik Desjardins](https://github.com/rykdesjardins)
* [Samuel Rondeau-Millaire](https://github.com/samrm111)
* [Daniel McAuley](https://github.com/DM87)
* [Gabriel Cardinal](https://github.com/Gaboik)
* [Narcity Media inc.](https://github.com/narcitymedia)

![bitmoji](https://render.bitstrips.com/v2/cpanel/9188364-18598575_8-s1-v1.png?transparent=1&palette=1&width=246)

## License ##
Mozilla Public License Version 2.0

## About the license
_TL;DR : You can use the CMS to make money as long as it remains open source. The typical use case involves no additional work._

Both individuals and businesses are allowed to use Lilium CMS. 
You are allowed to host a copy of Lilium CMS, modify it, redistribute it, create something different with it. 

One important thing to note : you **must** disclose the source code, copyright, and must document any modification done. A copy of the license must be available. However, this does not mean you need to credit Narcity Media on your website or anything of the sort. Simply make the source code available and highlight the modifications if any. 

That being said, you can still use Lilium CMS for almost any purposes. 

Like most open source licenses, Narcity Media is not liable if anything happens with your server, data, etc. Lilium CMS does not come with a warranty. 

The previous information is not legal advice, but should give you a good idea.

Mozilla Public License Version 2.0 is a simple, permissive license with conditions easy to respect. There have a [great FAQ here](https://www.mozilla.org/en-US/MPL/2.0/FAQ/).

## Copyright ##
© Narcity Media, 2019
