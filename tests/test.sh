export TEST=true
mongo liliumtest --eval "db.createUser({user: 'liliumtest', pwd: 'liliumtest', roles: ['readWrite']});"
mongo liliumtest --eval 'db.themes.insert({"uName" : "narcity", "dName" : "Narcity Theme", "entry" : "narcity.js", active: true })'
mongo liliumtest --eval 'db.lilium.insert({"codename" : "Tyche", "script" : "3.0.4.js", "features" : [ "Content Cache" ], "v" : "3.0.4"})'
cp ./tests/liliutest.json ./sites/liliumtest.localhost:8080.json &&
node ./index.prod.js &&
rm ../sites/liliumtest.json
