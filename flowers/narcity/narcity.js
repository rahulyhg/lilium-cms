var Potager = function() {
  this.enable = function(_c, info, callback) {
    return callback();
  }

  this.disable = function(callback){
    return callback();
  }
}

module.exports = new Potager();
