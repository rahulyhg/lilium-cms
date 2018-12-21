FROM ubuntu:18.04
RUN apt update
RUN apt install -y gnupg ca-certificates redis-server
RUN apt remove --autoremove mongodb-*
RUN rm -f /etc/apt/sources.list.d/mongodb*.list
RUN apt update
RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 9DA31620334BD75D9DCB49F368818C72E52529D4
RUN echo "deb [ arch=amd64 ] https://repo.mongodb.org/apt/ubuntu bionic/mongodb-org/4.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-4.0.list
RUN apt update
RUN apt install -y mongodb-org

EXPOSE 27017
RUN mongod --fork --logpath /var/log/mongodb.log --config /etc/mongod.conf --port 27017 --bind_ip_all
#RUN mongo liliumtestdatabase --quiet --eval 'db.dropDatabase();'
#RUN mongo liliumtestdatabase --quiet --eval "db.dropUser('liliumtest');"
#RUN mongo liliumtestdatabase --quiet --eval "db.createUser({user: 'liliumtest', pwd: 'liliumtest', roles: ['readWrite']});"
#RUN mongo liliumtestdatabase --quiet --eval 'db.themes.insert({"uName" : "narcity", "dName" : "Narcity Theme", "entry" : "narcity.js", active: true })'
#RUN mongo liliumtestdatabase --quiet --eval 'db.lilium.insert({"codename" : "Tyche", "script" : "3.0.4.js", "features" : [ "Content Cache" ], "v" : "3.0.4"})'

#RUN redis-server & 

FROM node:11
WORKDIR /usr/share/lilium/lilium-cms

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8080
WORKDIR /usr/share/lilium/lilium-cms/tests
RUN ./run.sh

#RUN mongo liliumtestdatabase --quiet --eval 'db.dropDatabase();'
#RUN mongo liliumtestdatabase --quiet --eval "db.dropUser('liliumtest');"
