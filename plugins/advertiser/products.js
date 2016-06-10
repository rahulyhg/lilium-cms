var log = undefined;
var _c = undefined;
var livevars = undefined;
var db;

var RegisteredProducts = new Object();
var RegisteredProductTypes = new Object();
var RegisteredPriceBases = new Object();

var Products = function () {
    var that = this;

    this.init = function(abspath, _c, cb) {
        log = require(abspath + "log.js");
        _c = _c;
        livevars = require(abspath + "livevars.js");
        db = require(abspath + "includes/db.js");

        this.registerLiveVar();

        db.findToArray(_c.default(), 'products', {}, function (err, arr) {
            for (var i = 0; i < arr.length; i++) {
                that.registerProduct(arr[i]); 
            }
    
            db.findToArray(_c.default(), 'producttypes', {}, function (err, arr) {
                for (var i = 0; i < arr.length; i++) {
                    that.registerProductType(arr[i].name, arr[i].displayName);
                }
    
                db.findToArray(_c.default(), 'productpricebases', {}, function (err, arr) {
                    for (var i = 0; i < arr.length; i++) {
                        that.registerPriceBase(arr[i].name, arr[i].displayName, arr[i].divider);
                    }

                    log('Products', 'Loaded products info from database');
                    cb();
                });
            });
        });
    };

    var SingleProduct = function () {
        this.name = "";
        this.displayname = "";
        this.type = "";
        this.price = 0;
        this.priceBase = "";
        this.active = true;
    };

    this.createEmptyProduct = function () {
        return new SingleProduct();
    };

    this.getTypeOfProduct = function(prodid) {
        var prodT = undefined;
        try {
            prodT = RegisteredProductTypes[RegisteredProducts[prodid].productType];
        } catch (err) {
            prodT = err;
        }

        return prodT;
    };

    this.getProduct = function (key) {
        if (this.productIsRegistered(key)) {
            var product = Object.assign({}, RegisteredProducts[key]);

            product.productType = this.getProductType(product.productType);
            product.priceBase = this.getPriceBase(product.priceBase);

            return product;
        } else {
            throw new Error("[ProductException] Product with key " + key + " does not exist");
        };
    };

    this.getProductType = function (key) {
        if (this.productTypeIsRegistered(key)) {
            return Object.assign({}, RegisteredProductTypes[key]);
        } else {
            throw new Error("[ProductException] Product type with key " + key + " does not exist");
        }
    }

    this.getPriceBase = function (key) {
        if (this.productPriceBaseIsRegistered(key)) {
            return Object.assign({}, RegisteredPriceBases[key]);
        } else {
            throw new Error("[ProductException] Price base with key " + key + " does not exist");
        }
    }

    this.productIsRegistered = function (key) {
        return typeof RegisteredProducts[key] !== 'undefined';
    };

    this.productTypeIsRegistered = function (key) {
        return typeof RegisteredProductTypes[key] !== 'undefined';
    };

    this.productPriceBaseIsRegistered = function (key) {
        return typeof RegisteredPriceBases[key] !== 'undefined';
    };

    this.registerProduct = function (productObject) {
        if (this.productIsRegistered(productObject.name)) {
            throw new Error("[ProductException] Product with key " + productObject.name + " is already registered");
        } else {
            RegisteredProducts[productObject.name] = productObject;
        }
    };

    this.registerProductType = function (keyName, displayName) {
        if (this.productTypeIsRegistered(keyName)) {
            throw new Error("[ProductException] Product type with key " + keyName + " is already registered");
        } else {
            RegisteredProductTypes[keyName] = {
                name: keyName,
                displayName: displayName
            };
        }
    };

    this.registerPriceBase = function (keyName, displayName, divider) {
        if (this.productPriceBaseIsRegistered(keyName)) {
            throw new Error("[ProductException] Product price base with key " + keyName + " is already registered");
        } else {
            RegisteredPriceBases[keyName] = {
                name: keyName,
                displayName: displayName,
                divider: divider
            };
        }
    };

    var getProductStatuses = function(cb) {
        db.findToArray('productstatus', {}, function(err, arr) {
            cb(arr);
        });
    };

    var keyValToArray = function (obj) {
        var arr = new Array();
        for (key in obj) {
            arr.push(obj[key]);
        }

        return arr;
    };

    this.registerLiveVar = function () {
        livevars.registerLiveVariable('products', function (cli, levels, params, callback) {
            var ftc = levels[0];

            if (ftc) {
                switch (ftc) {
                case "all":
                    callback(RegisteredProducts);
                    break;
                case "tyoes":
                    callback(keyValToArray(RegisteredProductTypes));
                    break;
                case "pricebases":
                    callback(keyValToArray(RegisteredPriceBases));
                    break;
                case "statuses":
                    getProductStatuses(callback);
                    break;
                default:
                    callback("[ProductException] Undefined action : " + ftc);
                    break;
                }
            } else {
                callback("[ProductException] Root level if forbidden. A first level must be defined");
            }
        });
    };
};

module.exports = new Products();
