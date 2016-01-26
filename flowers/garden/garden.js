var Garden = function() {
  this.enable = function(_c, info, callback) {
    callback();
  }

  this.disable = function(callback){
    return callback();
  }
}

module.exports = new Garden();
