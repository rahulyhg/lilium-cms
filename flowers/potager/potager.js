var Potager = function() {
  this.enable = function(_c, info, callback) {
    console.log('Potager is enabled');
    return callback();
  }

  this.disable = function(callback){
    return callback();
  }
}

module.exports = new Potager();
