/**
 * @exampleHelpers
 * function promiseTrueIn2() {
 *   return new Promise( function(res,rej) {
 *     setTimeout( function() {
 *       res(true);
 *     }, 2000)
 *   });
 * }
 */



/**
 * Lodash mixins
 * @author 
 * @license MIT
 */
(function(undefined){
	'use strict';

	// Node.js support
	var _;
	var mixins = {};
	if(typeof require === 'function'){
		_ = require('lodash');
		module.exports = mixins;
	} else{
		_ = window._;
	}

    /**
    * @private
     * finds the number of items in an array that are truey for the function provided
     * if collection passed in doesn't have length property, or has length of 0, 0 is returned
     * @param {Array} an array of whatever type of items to be tested
     * @param {Function} function each item will be tested with
     * @return {number} number of items in the list for which the function returned truey
     * @example
     * _.findCountTrue( [], function() { return true; } )                                                                        // 0
     * _.findCountTrue( [ 1, 2, 3 ], function() { return true; } )                                                               // 3
     * _.findCountTrue( [ 1, 2, 3 ], function() { return false; } )                                                              // 0
     * _.findCountTrue( [ 1, 2, 3 ], function(n) { return n===2; } )                                                             // 1
     * _.findCountTrue( [ 1, 2, 3, 4 ], function(n) { return n%2===0; } )                                                        // 2
     * _.findCountTrue( [ ['pizza','pizza','pizza'], ['cake'], ['cake'] ], function(list) { return _.includes(list,'cake') } )   // 2
     */
    function findCountTrue(allItems, testFun) {
      var allItemsLength = allItems.length;
      if (!allItemsLength) { //if .length is 0 or undefined, we won't count
        return 0;
      } else {
          return _.reduce( allItems, function(total, item) {
            if ( testFun(item) ) {
                return total + 1;
            } else {
                return total;
            }
          }, 0);
      }
    }
    
    /**
     * finds the portion of items in an array that are truey for the function provided
     * if collection passed in doesn't have length property, or has length of 0, 0 is returned
     * @param {Array} an array of whatever type of items to be tested
     * @param {Function} function each item will be tested with
     * @return {number} ratio of true to total items in the list (so between 0 and 1 inclusive)
     * @example
     * _.findRatioTrue( [ 1, 2, 3 ], function() { return true; } )                                                                // 1
     * _.findRatioTrue( [ 1, 2, 3 ], function() { return false; } )                                                               // 0
     * _.findRatioTrue( [ 1, 2, 3 ], function(n) { return n===2; } )                                                              // 1/3
     * _.findRatioTrue( [ 1, 2, 3, 4 ], function(n) { return n%2===0; } )                                                         // .5
     * _.findRatioTrue( [ ['pizza','pizza','pizza'], ['cake'], ['cake'] ], function(list) { return _.includes(list,'cake') } )    // 2/3
     */
    function findRatioTrue(allItems, testFun) {
      var allItemsLength = allItems.length;
      if (!allItemsLength) { //if .length is 0 or undefined, we won't count
        return 0;
      } else {
          return findCountTrue(allItems, testFun)/allItemsLength;
      }
    }
    
    
	_.extend(mixins, {
		
        /**
         * Retrieves the element in the middle of an array.
		 * @param {Array} theArray - The array.
		 * @returns {*} - The array element.
         * @examples
         * _.findMidEl(['one'])                         // => 'one'
         * _.findMidEl(['one','two'])                   // => 'two'
         * _.findMidEl(['one','two','three'])           // => 'two'
         * _.findMidEl([true, false, true, false])      // => true
         * _.findMidEl([ {'prop':'val'} ])              // => new Object ({'prop':'val'})
		 */
		findMidEl: function(theArray){
            var middleIndex = Math.floor(theArray.length / 2); //we want the median element, but round down because of case of just 1 card
            return theArray[middleIndex];
		},
        
        /**
         * Retrieves the element that occurs the most times in the array.
         * First tested it out here: http://jsfiddle.net/79cqJ/13/
		 * @param {Array} theArray - The array.
		 * @returns {*} - The array element.
         * @examples
         * _.findMode( ['one'] )     // => 'one'
         * _.findMode( [1, 1, 2, 2, 2, 1, 4, 9834545, 1] )   // => 1
         * _.findMode( [true, false, true, false, true] )     // => true
         * _.findMode( ['one','test','test','one','two','two','three','test','test'] )     // => 'test'
		 */
        findMode: function(theArray){
            var options = _.uniq( theArray ); //what are all of the possible answers?
            var results = []; //will hold number of times each of those possibilities comes up (so results[0] is the count for options[0], etc)
            _.forEach( options, function(eachOption) {
                var count = 0;
                _.forEach( theArray, function(eachVal) {
                    if (eachVal === eachOption) {
                        count++;
                    }
                 });
                results.push(count);
            });
            return options[ _.indexOf( results, _.max(results) ) ]; //the winning answer (in options) is the one with the highest count (in results)
        },
        
        /**
         * If what's passed in is a string instead of an array, this will make it an array with that string as the only element.
		 * @param {String | Array} incoming - The string or array that we want to be an array.
		 * @returns {Array} - An array, either the same as passed in, or with the passed-in string inside it.
         * @examples
         * _.guarArrayOfStrings('one')             // => ['one']
         * _.guarArrayOfStrings(['one','two'])     // => ['one','two']
         * _.guarArrayOfStrings(123)               // => ['123']
         * _.guarArrayOfStrings('')                // => []
		 */
		guarArrayOfStrings: function(incoming){
            var out = incoming;
            if (!incoming) {
                out = [];
            } else if ( _.isString(incoming) ) {
                out = [incoming];
            } else if ( _.isNumber(incoming) ) {
                out = [ "" + incoming ];
            }
            return out;
		},
        
        
        /**
         * find the word that occurs on the most of the lists
         * @param {Array} a list of lists of strings
         * @return {string} the word on those lists that occurs on the most lists
         * @example
         * _.findMostSharedWord( [ ['pizza'] ] )                                         // 'pizza'
         * _.findMostSharedWord( [ ['pizza','pizza','pizza'], ['cake'], ['cake'] ] )     // 'cake'
         * _.findMostSharedWord( [ ['planet', 'sun'], ['earth', 'planet'], ['moon'] ] )  // 'planet'
         */
        findMostSharedWord: function(allLists) {

          var allWords = _.flatten(allLists);

          var allUniqueWords = _.uniq(allWords);

          var allCounts = allUniqueWords.map( function(eachWord) {
            var eachWordCount = allLists.filter( function(eachList){
                return eachList.find( function(eachListWord) {
                    return eachListWord === eachWord;
                });
            }).length;
            return {
                'word': eachWord,
                'count': eachWordCount
            };
          });

          var bestWord = _.max(allCounts, function(val) {return val.count});

          return bestWord.word;

        },
        
        
        /**
         * returns a promise that resolves with the first 'success' of the array that's passed in. the array can contain:
         *     Promise -- 'success' if it resolves instead of rejects
         *     Function that returns a Promise -- 'success' if the return promise resolves instead of rejects
         *     Anything else  (e.g. number, string) -- always a success; will get wrapping with Promise.resolve();
         * the point is that once we find a 'success' we do NOT wait for Promises or run functions later in the input array
         * @param {Array} array of promises (or functions or values--see above)
         * @return {Promise} returns a promise that either resolves with the resolve of the first promise (run sequentially) that resolves instead of rejects, or, rejects with whatever the last Promise in the array rejected with
         * @example
         * _.findFirstProm( 'notArray' )                                                       // rejects
         * _.findFirstProm( [] )                                                               // rejects
         * _.findFirstProm( [5] )                                                              // resolveswith 5
         * _.findFirstProm( [Promise.resolve(true)] )                                          // resolveswith true
         * _.findFirstProm( [promiseTrueIn2()] )                                               // resolveswith true
         * _.findFirstProm( [Promise.reject(), Promise.resolve("word")] )                      // resolveswith "word"
         * _.findFirstProm( [Promise.reject(), function(){return Promise.resolve("fun")} ] )   // resolveswith "fun"
         * _.findFirstProm( [Promise.reject(), Promise.reject() ] )                            // rejectswith undefined
         * _.findFirstProm( [Promise.reject(), Promise.reject(), new Promise( function() {throw new Error('err');} ) ] ) // rejects
         * _.findFirstProm( [Promise.reject(), function() { return new Error('err');} ] )      // resolves
         */
        findFirstProm: function(promArray) {
          var promsLength = promArray.length;
          if ( !Array.isArray(promArray) || promsLength===0 || promsLength===undefined) {
            return Promise.reject(undefined);
          }
          
          var fullPromPath = Promise.reject();
          promArray.forEach( function(eachProm) {
            var nextRejHandler;
            if (typeof eachProm === 'function') {
                nextRejHandler = eachProm;
            } else if ( (typeof eachProm !== 'object' || !eachProm.then) ) {
                nextRejHandler = function() { return Promise.resolve( eachProm ) };
            } else {
               nextRejHandler = function() { return eachProm; };
            }
            fullPromPath = fullPromPath.then( null, nextRejHandler );
          });
          
          return fullPromPath;
        },//end findFirstProm()
        
        /**
         * given array of functions and array of arguments for those functions, finds first function that doesn't return undefined and returns its name and result in this form:
         * {
         *   'func': <name of function>,
         *   'result': <result of that function>
         * }
         * if no function is found, .func and .result are both undefined
         * @param {Array} array of functions
         * @param {Array} array of parameters to give those functions
         * @return {Object} with .func name of function found and .result what that function returned
         * @example
         * _.findFirstFuncName( [function one(){return true}], [] )                                    // new Object ( {'func':'one','result':true} )
         * _.findFirstFuncName( [function two(){return undefined}], [] )                               // new Object ( {'func':undefined,'result':undefined} )
         * _.findFirstFuncName( [ function two(){return undefined}, function one(){return true} ], [] )      // new Object ( {'func':'one','result':true} )
         * _.findFirstFuncName( [ function is(it){return it;}, function isNot(it){return !it;} ], [false] )  // new Object ( {'func':'isNot','result':true} )
         */
        findFirstFuncName: function(funcList,args) {
            var funcName;
            var result;
            funcList.find( function(eachFunc) {
                funcName = eachFunc.name;
                result = eachFunc.apply(null,args);
                return result;
            });
            if (result === undefined) {
                funcName = undefined;
            }
            return {
                'func':funcName,
                'result':result
            };
        },//end findFirstFuncName()
        
        /**
         * @private
         * @param {Object} object that has only one property (if it has more, this function will return the one in the 'first' key, which isn't, because of the JavaScript language itself, guarantied to be consistent, so this function won't throw an error, but it's not really a good use case, either)
         * @return {various} returns the *value* of the property, so could be an object or anything
         * @example
         * _.findOnlyProp( {'outer': 'value'} )                                                 // => "value"
         * _.findOnlyProp( { 'OUTER': {'inner':'value'} } )                                     // => new Object ({ 'inner': 'value' })
         * _.findOnlyProp( { 'out': [ {'obj':'value'}, 'be', ['complic','ated'] ] } )           // => [ {'obj':'value'}, 'be', ['complic','ated'] ]
         */
        findOnlyProp: function(outerObject) {
            return outerObject[Object.keys(outerObject)[0]];
        },
        
        /**
         * @param {string} message - words to log to console before the variable
         * @param {various} variable - what to log to console after the message
         * @return {undefined}
         * @example
         * _.logMessVar('error in fun: ', 'me')       // => undefined
         * _.logMessVar('one')('two')                 // => undefined
         * _.logMessVar('mess')({"I'm an":"object"})  // => undefined
         */
        logMessVar: _.curry( function(message, variable) {
            console.log(message, variable);
        }),
        
        findCountTrue: findCountTrue, //see tests in @private version above
        
        findRatioTrue: findRatioTrue, //see tests in @private version above
        
        /**
         * finds the portion of objects in an array that have the given property
         * if collection passed in doesn't have length property, or has length of 0, 0 is returned
         * @param {Array} an array of objects
         * @param {string} prop to check for
         * @return {number} ratio of objects in the list that have that prop (so between 0 and 1 inclusive)
         * @example
         * _.findRatioWithProp( [ {'key':'value' } ], 'key' )                                                                // 1
         * _.findRatioWithProp( [ {'key':'value' } ], 'nonsense' )                                                           // 0
         * _.findRatioWithProp( [ {'key':'value' }, {'different':'value'} ], 'key' )                                         // .5
         * _.findRatioWithProp( [ {'we':{'go':'deep'}} ], 'we.go' )                                                          // 1
         */
        findRatioWithProp: function(allObjs, prop) {
          return findRatioTrue( allObjs, function(eachObj) {
            return _.get(eachObj, prop);
          });
        },
        
        /**
         * @param {Object} key-value pairs
         * @return {string} serialized and encoded for use like query-string of url
         * @example
         * _.paramsToURI( {"one":"hello", "two_word":"world"} )                                     // => "one=hello&two_word=world"
         */
        paramsToURI: function(paramsObj) {
          return Object.keys(paramsObj).map(function(k) {
            return encodeURIComponent(k) + "=" + encodeURIComponent(paramsObj[k]);
          }).join('&');
        }
        
	});
	_.mixin(mixins);
})();