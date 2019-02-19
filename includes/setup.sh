echo "Moving to Lilium root directory"
cd ..

# Install native dependencies depending on OS
echo "Detecting OS before installing native dependencies"
OSuname="$(uname -s)"
case "${OSuname}" in
    Linux*)  sudo apt-get install libcairo2-dev libjpeg8-dev libpango1.0-dev libgif-dev build-essential g++ libkrb5-dev imagemagick redis-server;;
    Darwin*) brew install pkg-config cairo libpng jpeg giflib imagemagick redis;;
esac

# Install NPM module
echo "Installing NPM modules"
rm -rf node_modules
npm install

echo "Creating site, themes, and plugins directories"
mkdir sites
mkdir flowers
mkdir plugins

echo "Input / Paste theme github repo URL : "
read themeurl

echo "Cloning ${themeurl} in theme directory"
cd flowers 
git clone ${themeurl} 
cd */
npm install 

echo "Back in Lilium root directory"
cd ../..

echo "Copying default site into sites directory"
cp includes/defaultsite.json sites/default.json

echo "Creating development database"
mongo liliumdefault --quiet --eval 'db.dropDatabase();'
mongo liliumdefault --quiet --eval "db.dropUser('liliumdefault');"
mongo liliumdefault --quiet --eval "db.createUser({user: 'liliumdefault', pwd: 'liliumdefault', roles: ['readWrite']});"

echo "Inserting default roles"
defaultroles=`cat includes/defaultroles.json`
roleinsertquery="db.roles.insertMany(${defaultroles})"
mongo liliumdefault --quiet --eval "db.roles.remove({})"
mongo liliumdefault --eval "${roleinsertquery}"

echo "Inserting default user lilium"
defaultuser=`cat includes/defaultuser.json`
userinsertquery="db.entities.insert(${defaultuser})"
mongo liliumdefault --quiet --eval "db.entities.remove({})"
mongo liliumdefault --eval "${userinsertquery}"

echo "Inserting default edition Uncategorized"
defaultedition=`cat includes/defaultedition.json`
editioninsertquery="db.editions.insert(${defaultedition})"
mongo liliumdefault --quiet --eval "db.editions.remove({})"
mongo liliumdefault --eval "${editioninsertquery}"

echo "Inserting default section Category"
defaultsection=`cat includes/defaultsection.json`
sectioninsertquery="db.sections.insert(${defaultsection})"
mongo liliumdefault --quiet --eval "db.sections.remove({})"
mongo liliumdefault --eval "${sectioninsertquery}"

echo "Setting current version to 4.0.1"
mongo liliumdefault --eval 'db.lilium.insert({ "v" : "4.0.1" })';

echo "Running tests"
npm run test

echo "  READY TO RUN  "
echo 
echo "You can execute : npm run start"
echo "Lilium dashboard is located at localhost:8080"
echo 
echo "Default username : lilium"
echo "Default password : lilium"
echo 

exit 0
