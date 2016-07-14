var log = undefined;
var _c = undefined;
var livevars = undefined;
var db;

var RegisteredProducts = new Array();

var RegisteredProductStatuses = [
    {name:"unpaid", displayName:"Unpaid"},
    {name:"paid", displayName:"Paid"},
    {name:"ongoing", displayName:"Ongoing"},
    {name:"paused", displayName:"Paused"},
    {name:"finished", displayName:"Finished"},
    {name:"invalid", displayName:"Invalid"}
];

var defaultProducts = [
    { "name":"dp-bb", "displayName":"Display - Big box (300x250)", "productType":"display", "priceBase":"cpm", "price":0.01, "active":true, "SKU":"-" },
    { "name":"dp-bbm", "displayName":"Display - Big box mobile (300x250)", "productType":"display", "priceBase":"cpm", "price":0.01, "active":true, "SKU":"-" },
    { "name":"dp-bi", "displayName":"Display - Billboard (970x250)", "productType":"display", "priceBase":"cpm", "price":0.01, "active":true, "SKU":"-" },
    { "name":"dp-ct", "displayName":"Display - Companion Takeover", "productType":"display", "priceBase":"unit", "price":500, "active":true, "SKU":"-" },
    { "name":"dp-ls", "displayName":"Display - Large Skyscraper (300x600)", "productType":"display", "priceBase":"cpm", "price":0.01, "active":true, "SKU":"-" },
    { "name":"dp-lb", "displayName":"Display - Leaderboard (728x90)", "productType":"display", "priceBase":"cpm", "price":0.01, "active":true, "SKU":"-" },
    { "name":"dp-sk", "displayName":"Display - Skin", "productType":"display", "priceBase":"cpm", "price":0.01, "active":true, "SKU":"-" },
    { "name":"dp-ss", "displayName":"Display - Skyscraper (160x600)", "productType":"display", "priceBase":"cpm", "price":0.01, "active":true, "SKU":"-" },
    { "name":"email", "displayName":"Email Discovery", "productType":"email", "priceBase":"unit", "price":500, "active":true, "SKU":"-" },
    { "name":"fb", "displayName":"Facebook", "productType":"facebook", "priceBase":"cpm", "price":0.008, "active":true, "SKU":"-" },
    { "name":"ig", "displayName":"Instagram", "productType":"instagram", "priceBase":"cpm", "price":0.01, "active":true, "SKU":"-" },
    { "name":"igo", "displayName":"Organic Instagram", "productType":"instagram", "priceBase":"unit", "price":500, "active":true, "SKU":"-" },
    { "name":"fbo", "displayName":"Organic Facebook", "productType":"facebook", "priceBase":"unit", "price":500, "active":true, "SKU":"-" },
    { "name":"two", "displayName":"Organic Twitter", "productType":"twitter", "priceBase":"unit", "price":200, "active":true, "SKU":"-" },
    { "name":"snapstory", "displayName":"Snapchat Story", "productType":"snapchat", "priceBase":"unit", "price":1000, "active":true, "SKU":"-" },
    { "name":"sponsedbas", "displayName":"Sponsored editorial - BASIC", "productType":"sponsedit", "priceBase":"unit", "price":750, "active":true, "SKU":"-" },
    { "name":"sponsedstand", "displayName":"Sponsored editorial - STANDARD", "productType":"sponsedit", "priceBase":"unit", "price":1500, "active":true, "SKU":"-" },
    { "name":"sponsedrev", "displayName":"Sponsored editorial revision", "productType":"other", "priceBase":"unit", "price":120, "active":true, "SKU":"-" },
    { "name":"sponsvid", "displayName":"Sponsored video", "productType":"video", "priceBase":"unit", "price":4000, "active":true, "SKU":"-" },
    { "name":"tw", "displayName":"Twitter", "productType":"twitter", "priceBase":"cpm", "price":0.01, "active":true, "SKU":"-" },
    { "name":"dp-vad", "displayName":"Display - Video In-Content Ad", "productType":"display", "priceBase":"cpm", "price":0.01, "active":true, "SKU":"-" },
    { "name":"dp-nad", "displayName":"Display - Native ad", "productType":"netdisc", "priceBase":"cpm", "price":0.01, "active":true, "SKU":"-" }
];

var Products = function () {
    var that = this;

    this.init = function(abspath, cc, cb) {
        log = require(abspath + "log.js");
        _c = cc;
        livevars = require(abspath + "livevars.js");
        db = require(abspath + "includes/db.js");

        this.registerLiveVar();
        this.loadDatabase(cc, cb);
    };

    var SingleProduct = function () {
        this.name = "";
        this.displayname = "";
        this.type = "";
        this.price = 0;
        this.priceBase = "";
        this.active = true;
    };

    this.loadDatabase = function(_c, cb) {
        log('Products', 'Checking products collection');
        db.createCollection(_c.default(), 'products', function(err, res) {
            if (!err) {
                log('Products', 'Created products collection');
                db.insert(_c.default(), 'products', defaultProducts, function(ierr, res) {
                    RegisteredProducts = defaultProducts;
                    log('Products', 'Inserted default products into database');
                    db.createCollections(_c.default(), ['campaigns', 'campaignHistory'], function(cerr, res) {
                        log('Products', 'Created campaign collections');
                        cb();
                    });
                });
            } else {
                db.findToArray(_c.default(), 'products', {}, function(err, arr) {
                    log('Products', 'Products collection found');
                    RegisteredProducts = arr;
                    cb();
                });
            }
        });
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
