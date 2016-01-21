var Garden = function() {
  this.enable = function(_c, info, callback) {
    console.log(info);
    return callback();
  }

  this.disable = function(callback){
    return callback();
  }
}

module.exports = new Garden();
