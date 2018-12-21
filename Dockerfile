FROM ubuntu:18.04
RUN apt update
RUN apt install -y gnupg
RUN apt install -y ca-certificates
RUN apt remove --autoremove mongodb-*
RUN rm -f /etc/apt/sources.list.d/mongodb*.list
RUN apt update
RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 9DA31620334BD75D9DCB49F368818C72E52529D4
RUN echo "deb [ arch=amd64 ] https://repo.mongodb.org/apt/ubuntu bionic/mongodb-org/4.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-4.0.list
RUN apt update
RUN apt install -y mongodb-org
RUN mkdir -p /data/db
EXPOSE 27017
CMD /etc/init.d/mongod start
CMD mongo liliumtestdatabase --quiet --eval 'db.dropDatabase();'
CMD mongo liliumtestdatabase --quiet --eval "db.dropUser('liliumtest');"
CMD mongo liliumtestdatabase --quiet --eval "db.createUser({user: 'liliumtest', pwd: 'liliumtest', roles: ['readWrite']});"
CMD mongo liliumtestdatabase --quiet --eval 'db.themes.insert({"uName" : "narcity", "dName" : "Narcity Theme", "entry" : "narcity.js", active: true })'
CMD mongo liliumtestdatabase --quiet --eval 'db.lilium.insert({"codename" : "Tyche", "script" : "3.0.4.js", "features" : [ "Content Cache" ], "v" : "3.0.4"})'

FROM node:11
WORKDIR /usr/share/lilium/lilium-cms

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8080

RUN cd /usr/share/lilium/lilium-cms/tests && ./run.sh

CMD mongo liliumtestdatabase --quiet --eval 'db.dropDatabase();'
CMD mongo liliumtestdatabase --quiet --eval "db.dropUser('liliumtest');"
