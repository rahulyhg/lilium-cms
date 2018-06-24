module.exports.createNginxConfig = _c => `

upstream lilium_proxy  {
    server 127.0.0.1:8080;
    keepalive 64;
}

map $http_sec_websocket_key $upgr {
    ""      "";           
    default "websocket";  
}

map $http_sec_websocket_key $conn {
    ""      $http_connection;  
    default "upgrade";         
}

proxy_cache_path ${_c.server.html}/liliumcache levels=1:2 keys_zone=my_cache_lilium:10m max_size=10g inactive=60m use_temp_path=off;

server {
    listen 80;
    server_name ${_c.server.url.replace(/\/|www/g, '')} www.${_c.server.url.replace(/\/|www/g, '')};
    root ${_c.server.html}/;

    location /.well-known {
        try_files $uri =404;
    }

    location / {
        return 301 https://www.${_c.server.url.replace(/\/|www/g, '')}$request_uri;
    }
}

`;

module.exports.createNginxExtendedConfig = _c =>`

server {
    listen 443 ssl; 
    ssl_certificate /etc/letsencrypt/live/www.${_c.server.url.replace(/\/|www/g, '')}/fullchain.pem; 
    ssl_certificate_key /etc/letsencrypt/live/www.${_c.server.url.replace(/\/|www/g, '')}/privkey.pem;
    ssl_session_cache shared:le_nginx_SSL:1m;
    ssl_session_timeout 1440m; 

    ssl_protocols TLSv1 TLSv1.1 TLSv1.2; 
    ssl_prefer_server_ciphers on; 

    ssl_ciphers "ECDHE-ECDSA-AES128-GCM-SHA256 ECDHE-ECDSA-AES256-GCM-SHA384 ECDHE-ECDSA-AES128-SHA ECDHE-ECDSA-AES256-SHA ECDHE-ECDSA-AES128-SHA256 ECDHE-ECDSA-AES256-SHA384 ECDHE-RSA-AES128-GCM-SHA256 ECDHE-RSA-AES256-GCM-SHA384 ECDHE-RSA-AES128-SHA ECDHE-RSA-AES128-SHA256 ECDHE-RSA-AES256-SHA384 DHE-RSA-AES128-GCM-SHA256 DHE-RSA-AES256-GCM-SHA384 DHE-RSA-AES128-SHA DHE-RSA-AES256-SHA DHE-RSA-AES128-SHA256 DHE-RSA-AES256-SHA256 EDH-RSA-DES-CBC3-SHA"; # managed by Certbot

    server_name ${_c.server.url.replace(/\/|www/g, '')} www.${_c.server.url.replace(/\/|www/g, '')};
    # port_in_redirect off;

    large_client_header_buffers 8 32k;
    index index.html;

    if ($http_host = "${_c.server.url.replace(/\/|www/g, '')}") {
        rewrite ^ https://www.${_c.server.url.replace(/\/|www/g, '')}$request_uri permanent;
    }

    location =/lilium {
        if ($http_cookie ~* "lmlsid" ) {
                return 302 https://www.${_c.server.url.replace(/\/|www/g, '')}/liliumflower;
        }

        return 204;
    }

    location /api {
        proxy_cache my_cache_lilium;
        proxy_cache_revalidate on;
        proxy_cache_min_uses 3;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_lock on;

        add_header 'Access-Control-Allow-Origin' "$http_origin";
        add_header 'Access-Control-Allow-Methods' 'OPTIONS, GET, POST';
        add_header 'Access-Control-Allow-Headers' 'lmltoken, lmlterms, corsorigin, lmltopic, lmlqid, lmlaid, t';
        add_header 'Access-Control-Expose-Headers' 'lmltoken';

        alias ${_c.server.html}/;
        try_files $uri.json @lilium;
    }

    location ~ /as/ {
            add_header 'Access-Control-Allow-Origin' "$http_origin";
            add_header 'Content-Type' 'application/json';

            alias ${_c.server.html}/;
            try_files $uri =404;
    }

    location ~ /lmlsug(.*).json {
            add_header 'Access-Control-Allow-Origin' "$http_origin";
            add_header 'Access-Control-Allow-Methods' 'OPTIONS, GET';
            add_header 'hit' 'cache';
            add_header 'Content-Type' 'application/json';

            alias ${_c.server.html}/lmlsug$1.json;
    }

    location / {
        proxy_cache my_cache_lilium;
        proxy_cache_revalidate on;
        proxy_cache_min_uses 3;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_lock on;
        add_header 'lml-country-code' "$http_cf_ipcountry";

        alias ${_c.server.html}y/;
        try_files $uri $uri.html $uri.rss @lilium;
    }

    location /whereami {
            add_header 'lml-country-code' "$http_cf_ipcountry";
            return 204;
    }

    location @lilium {
        proxy_set_header X-Real-IP $http_cf_connecting_ip;
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

`;