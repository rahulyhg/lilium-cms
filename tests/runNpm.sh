export TEST=true

echo "> Creating old site directory"
mkdir -p oldsites

echo "> Moving possible old sites in case last test crashed"
mv oldsites/* ../sites/*

echo "> Storing old sites, if any, in work directory"
mv ../sites/* oldsites/

echo "> Copying test site config into sites directory"
cp ./testsite.json ../sites/default.json

echo "> Creating test databases at liliumtest"
mongo liliumtestdatabase --quiet --eval 'db.dropDatabase();'
mongo liliumtestdatabase --quiet --eval "db.dropUser('liliumtest');"
mongo liliumtestdatabase --quiet --eval "db.createUser({user: 'liliumtest', pwd: 'liliumtest', roles: ['readWrite']});"
mongo liliumtestdatabase --quiet --eval "db.themes.insert({ uName : 'lilium-violet-theme', active : true });"

echo "> Cloning Violet theme"
cd ../flowers && git clone https://github.com/narcitymedia/lilium-violet-theme && cd ../tests

echo "> Running tests from main.js"
cd .. && node tests/app/main.js 
cd tests

echo "> Removing test config from websites"
rm ../sites/default.json

echo "> Moving back existing sites into their origin directory"
mv oldsites/* ../sites/

echo "> Removing test database"
mongo liliumtestdatabase --quiet --eval 'db.dropDatabase();'
mongo liliumtestdatabase --quiet --eval "db.dropUser('liliumtest');"

echo 
echo "> All done!"
echo

exit 0
