export TEST=true

echo "> Storing old sites, if any, in work directory"
mkdir -p oldsites
mv ../sites/* oldsites/

echo "> Copying test site config into sites directory"
cp ./testsite.json ../sites/default.json

echo "> Moving to app directory"
cd app

echo "> Running tests from main.js"
node main.js

echo "> Moving back to original work directory"
cd ..

echo "> Removing test config from websites"
rm ../sites/default.json

echo "> Moving back existing sites into their origin directory"
mv oldsites/* ../sites/

echo 
echo "> All done!"
echo
