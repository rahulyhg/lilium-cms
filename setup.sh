# Install native dependencies depending on OS
echo "Detecting OS before installing native dependencies"
OSuname="$(uname -s)"
case "${OSuname}" in
    Linux*)  sudo apt-get install libcairo2-dev libjpeg8-dev libpango1.0-dev libgif-dev build-essential g++ libkrb5-dev imagemagick;;
    Darwin*) brew install pkg-config cairo libpng jpeg giflib imagemagick;;
esac

# Install NPM module
echo "Installing NPM modules"
rm -rf node_modules
npm install

echo "Creating site, themes, and plugins directories"
mkdir sites
mkdir flowers
mkdir plugins

echo "Input theme github repo : "
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
mongo liliumdefault --quiet --eval "db.dropUser('liliumtest');"
mongo liliumdefault --quiet --eval "db.createUser({user: 'liliumdefault', pwd: 'liliumdefault', roles: ['readWrite']});"

echo "Inserting default roles"
defaultroles=`cat includes/defaultroles.json`
roleinsertquery="db.roles.insertMany(${defaultroles})"
defaultuser=`cat includes/defaultuser.json`
userinsertquery="db.entities.insert(${defaultuser})"
mongo liliumdefault --quiet --eval "db.roles.remove({})"
mongo liliumdefault --quiet --eval "${roleinsertquery}"
mongo liliumdefault --quiet --eval "db.entities.remove({})"
mongo liliumdefault --quiet --eval "${userinsertquery}"

echo "All done!"
echo 
echo "You can execute : npm run start"
echo "Lilium dashboard is located at localhost:8080"
echo 
echo "Default username : lilium"
echo "Default password : lilium"
echo 

exit 0
