var log = require('./log.js');
var _c = require('./config.js');

var RegisteredProducts = new Object();
var RegisteredProductTypes = new Object();
var RegisteredPriceBases = new Object();

var Products = function() {
	var SingleProduct = function() {
		this.name = "";
		this.displayname = "";
		this.type = "";
		this.price = 0;
		this.priceBase = "";
		this.active = true;
	};

	this.createEmptyProduct = function() {
		return new SingleProduct();
	};

	this.getProduct = function(key) {
		if (this.productIsRegistered(key)) {
			var product = Object.assign({}, RegisteredProducts[key]);

			product.productType = this.getProductType(product.productType);
			product.priceBase = this.getPriceBase(product.priceBase);

			return product;
		} else {
			throw "[ProductException] Product with key " + key + " does not exist";
		};
	};

	this.getProductType = function(key) {
		if (this.productTypeIsRegistered(key)) {
			return Object.assign({}, RegisteredProductTypes[key]);
		} else {	
			throw "[ProductException] Product type with key " + key + " does not exist";
		}
	}

	this.getPriceBase = function(key) {
		if (this.productPriceBaseIsRegistered(key)) {
			return Object.assign({}, RegisteredPriceBases[key]);
		} else {	
			throw "[ProductException] Price base with key " + key + " does not exist";
		}
	}

	this.productIsRegistered = function(key) {
		return typeof RegisteredProducts[key] !== 'undefined';
	};

	this.productTypeIsRegistered = function(key) {
		return typeof RegisteredProductTypes[key] !== 'undefined';
	};

	this.productPriceBaseIsRegistered = function(key) {
		return typeof RegisteredPriceBases[key] !== 'undefined';
	};
		
	this.registerProduct = function(productObject) {
		if (this.productIsRegistered(productObject.name)) {
			throw "[ProductException] Product with key " + productObject.name + " is already registered";
		} else {
			RegisteredProducts[productObject.name] = productObject;
		}
	};

	this.registerProductType = function(keyName, displayName) {
		if (this.productTypeIsRegistered(keyName)) {
			throw "[ProductException] Product type with key " + keyName + " is already registered";
		} else {
			RegisteredProductTypes[keyName] = {
				name : keyName,
				displayName : displayName
			};
		}
	};

	this.registerPriceBase = function(keyName, displayName, divider) {	
		if (this.productPriceBaseIsRegistered(keyName)) {
			throw "[ProductException] Product price base with key " + keyName + " is already registered";
		} else {
			RegisteredPriceBases[keyName] = {
				name : keyName,
				displayName : displayName,
				divider : divider
			};
		}
	};
};

module.exports = new Products();
