var log = require('./log.js');
var livevars = require('./livevars.js');
var postleaf = require('./postleaf.js');

var Quiz = function() {
    this.registerPostLeaf = function() {
        postleaf.registerLeaf('quiz', 'Quiz', 'addQuizToPost', 'renderQuiz');
    };
};

module.exports = new Quiz();
