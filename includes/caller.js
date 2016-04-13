/**
 * Creates a __caller variable in the global scope.
 * __caller gives the complete filename (with abs path) of the file calling the function.
 */
var Caller = function () {
    Object.defineProperty(global, '__caller', {
    get: function() {
            var orig = Error.prepareStackTrace;
            Error.prepareStackTrace = function(_, stack) {
                return stack;
            };
            var err = new Error;
            Error.captureStackTrace(err, arguments.callee);
            var stack = err.stack;
            Error.prepareStackTrace = orig;

            return stack[2].getFileName();
        }
    });
}

module.exports = new Caller();
