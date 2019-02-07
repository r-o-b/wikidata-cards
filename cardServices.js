/**
 * @name wiki api (non-wikidata)
 *
 * @fileOverview
 * MeidaWiki API Service for Angular
 *
 */
 
/**
 * @exampleHelpers
 *  var factory = angular.bootstrap(document, ['cardServices']).get('Wiki');
 */
 
var cardServices = angular.module('cardServices', []);

cardServices.factory('Wiki', function($log, $http, $q) {
    $log.debug("Wiki service start");

    /**********************************************************
                            SETUP SECTION
    **********************************************************/

    var factory = {};
    factory.pedia = {} // Wikipedia -- en.wikipedia.org/wiki/Special:ApiSandbox
    
    //Set default params for $http calls
    var httpParamDefaults = {};
    httpParamDefaults.pedia = {callback: 'JSON_CALLBACK', format: 'json', action: 'query'};
    
    
    /******************************************************
                XHR SECTION FOR WIKIPEDIA
    ******************************************************/
    
    /**
     * This function is like going to a Wikipedia category page (one that starts with "Category:") and returning an array of all of the page titles on that page but with the following removed:
     *    Duplicates
     *    'Special' pages that I don't consider 'cardable' (as determined by isTitleCard function)
     * This also seems to be equivalent to a manual Wikipedia search for 'incategory', such as:
     *      http://en.wikipedia.org/w/index.php?title=Special%3ASearch&profile=all&search=incategory%3A+%22Planets+of+the+solar+system%22&fulltext=Search
     * Example of the API call this function makes:
     *     'https://en.wikipedia.org/w/api.php?callback=JSON_CALLBACK&action=query&list=categorymembers&format=json&cmtitle=Category%3APresidents%20of%20the%20United%20States&cmprop=title&cmlimit=200'
     * Example call from API sandbox:
     *     https://en.wikipedia.org/wiki/Special:ApiSandbox#action=query&list=categorymembers&format=json&cmtitle=Category%3APlanets%20of%20the%20Solar%20System&cmprop=title&cmlimit=200
     * @param {string} catName - Category to search for (don't include the "Category:" in front). This IS case-sensitive, unfortunately, because of the API it calls.
     * @returns {Object} Promise, for Success and Error functions; calls success with array of page titles within the Category: page, or error with $http params.
     * @example
     * factory.pedia.getList("notAPageJunsdfslkdsdfsdffgdfgdfg")        // promises []
     * factory.pedia.getList("")                                        // promises []
     * factory.pedia.getList("Continents")                              // resolves
     * factory.pedia.getList("Category:Planets of the Solar System")    // resolveswith []
     * factory.pedia.getList("Planets of the Solar System")             // resolveswith ["Classical planet", "Earth", "Eleventh planet", "Inferior and superior planets", "Jupiter", "Mars", "Mercury (planet)", "Neptune", "Outer planets", "Planetary atmospheres of the Solar System", "Planetary mnemonic", "Planetary nomenclature", "Planetary rings", "Planetary satellite systems", "Saturn", "Uranus", "Venus"]
     */
    factory.pedia.getList = function(catName) {
        var deferred = $q.defer();
        
        if (!catName) { //don't do $http stuff if clearly bad input, such as ""
            deferred.resolve([]);
        } else {
        
            var catTitle = "Category:" + catName;
            $http({
                // method: 'JSONP',
                method: 'GET',
                url: 'https://en.wikipedia.org/w/api.php',
                params: {
                    // callback: 'JSON_CALLBACK',
                    origin: '*',
                    action: 'query',
                    list: 'categorymembers',
                    format: 'json',
                    cmtitle: catTitle,
                    cmprop: 'title',
                    cmlimit: '200'
                }
            }).
            success( function(data, status, headers, config) {
                if (!data.query.categorymembers) { //i.e., if page wasn't found
                    deferred.resolve([]);
                }
                
                var arrayOfObjects = data.query.categorymembers;
                //$log.debug("pedia.getList Found category with " + arrayOfObjects.length + " pages"); //would do $scope.statuses.push if in controller
                
                var arrayOfTitles = arrayOfObjects.map( function(eachObj) {
                    return eachObj.title;
                });
                
                // remove any titles that are the same as the name of the category (e.g., set of "Jasminum" cards shouldn't include one called "Jasminum"
                arrayOfTitles = _.filter(arrayOfTitles, function(eachTitle) {
                    return eachTitle != catTitle;
                });
                
                //titles starting with "Category:", remove that part
                arrayOfTitles = _.map(arrayOfTitles, function(eachTitle) {
                        if (eachTitle.substring(0,9) == "Category:") {
                            eachTitle = eachTitle.substring(9);
                        }
                        return eachTitle;
                    });
            
                arrayOfTitles = _.filter(arrayOfTitles, isTitleCard);
                arrayOfTitles.sort();
                arrayOfTitles = _.uniq(arrayOfTitles); //for example, q=Torah books would have duplicates
            
                deferred.resolve(arrayOfTitles);
            }).
            error(deferred.reject);
        }
        return deferred.promise;
    }
    
    /**
     * Like going to a Wikipedia category page (one starting with "Category:"), and getting all of the page titles
     *      from the "Subcategories" section of the page
     * Like manual search (key is "category: incategory: Citrus"):
     *      http://en.wikipedia.org/w/index.php?title=Special%3ASearch&profile=default&search=category%3A+incategory%3A+Citrus&fulltext=Search
     * Another good place to manually see how categories fit together:
     *      http://en.wikipedia.org/wiki/Special:CategoryTree
     * Call it makes looks like:
     *      http://en.wikipedia.org/wiki/Special:ApiSandbox#action=query&list=categorymembers&format=json&cmtitle=Category%3ACitrus&cmprop=title&cmnamespace=14&cmtype=subcat&cmlimit=20
     * example: "Citrus" (http://en.wikipedia.org/wiki/Category:Citrus) should return ["Citron", "Citrus diseases", "Citrus hybrids", "Citrus production", "Citrus sodas", "Grapefruit", "Lemon dishes", "Marmalade", "Oranges"]
     * @param {string} catName - Category to get subcats for (don't include the "Category:" in front). The Wikipedia API returns an error if this isn't a valid category name/page title.
     * @returns {Object} Promise, for Success and Error functions; calls success with array of page titles within the Category: page (with "Category:" removed, or error with $http params
     * @example
     * factory.pedia.getSubcats("Citrus")       // resolveswith ["Citric acid cycle", "Citron", "Citrus diseases", "Citrus dishes", "Citrus drinks", "Citrus hybrids", "Kumquats", "Citrus production"]
     */
    factory.pedia.getSubcats = function(catName) {
        var deferred = $q.defer();
        
        if (catName === "") {
            $log.debug("Wiki.pedia.getSubcats() was passed empty string, will return empty array");
            deferred.resolve([]);
            return deferred.promise;
        }
        
        var catTitle = "Category:" + catName;
        $http({
            // method: 'JSONP',
            method: 'GET',
            url: 'https://en.wikipedia.org/w/api.php',
            params: {
                // callback: 'JSON_CALLBACK',
                origin: "*",
                action: 'query',
                list: 'categorymembers',
                format: 'json',
                cmtitle: catTitle,
                cmtype: 'subcat',
                cmnamespace: 14,
                cmlimit: 20,
                cmprop: 'title'
            }
        }).
        success( function(data, status, headers, config) {
            var arrayOfObjects = data.query.categorymembers;
            $log.debug("pedia.getSubcats() success with arrayOfObjects: ", arrayOfObjects);
            
            var arrayOfTitles = [];
            //turn array of objects that have title propery into array of titles, AND remove "Category:" from their starts
            for (var i=0; i<arrayOfObjects.length; i++) {
                arrayOfTitles.push( arrayOfObjects[i].title.substring(9) );
            }
            
            $log.debug("pedia.getSubcats() resolving promise with arrayOfTitles == ", arrayOfTitles);
            deferred.resolve(arrayOfTitles);
        }).
        error(deferred.reject);
        
        return deferred.promise;
    }
    
    /**
     * This function gets the Wikipedia category pages that most closely match the search term
     * Equivalent to manual search of the the following, except taking only the titles (not including "Category:"):
     *      http://en.wikipedia.org/w/index.php?title=Special%3ASearch&profile=advanced&search=Mars&fulltext=Search&ns14=1&redirs=1&profile=advanced
     * Call it makes looks like:
     *      http://en.wikipedia.org/wiki/Special:ApiSandbox#action=query&list=search&format=json&srsearch=Mars&srnamespace=14&srlimit=10
     *      It doesn't seem to matter if you include "Category:" at the front of the search term or not
     * @param {string} searchTerm - Term to look for in category titles. Underlying API doesn't seem to be case-sensitive.
     * @returns {Object} Promise, for Success and Error functions; calls success with array of Category page titles with "Category:" removed from front, or error with $http params.
     * @example
     * factory.pedia.getCatSearch("notAPageJunsdfslkdsdfsdffgdfgdfg")     // promises []
     * factory.pedia.getCatSearch("Continents")                           // resolves
     * factory.pedia.getCatSearch("Mars")                                 // resolveswith ["Mars", "Low-importance Mars articles", "Mid-importance Mars articles", "High-importance Mars articles", "Top-importance Mars articles", "Mars stubs", "B-Class Mars articles", "Martian meteorites", "FA-Class Mars articles", "GA-Class Mars articles"]
     * factory.pedia.getCatSearch("Planets of the solar system")          // resolveswith ["Planets of the Solar System", "Venus", "Mercury (planet)", "Uranus", "Jupiter", "Neptune", "Earth", "Mars", "Outer planets", "Saturn"]
     * factory.pedia.getCatSearch("Planets of the Solar Systm")           // resolveswith ["Planets of the solar system"]
     */
    factory.pedia.getCatSearch = function(searchTerm) {
        var deferred = $q.defer();
        
        if (searchTerm === "") {
            $log.debug("Wiki.pedia.getCatSearch() was passed empty string, will return empty array");
            deferred.resolve([]);
            return deferred.promise;
        }
        
        $http({
            // method: 'JSONP',
            method: 'GET',
            url: 'https://en.wikipedia.org/w/api.php',
            params: {
                // callback: 'JSON_CALLBACK',
                origin: '*',
                action: 'query',
                list: 'search',
                format: 'json',
                srprop: '',
                srsearch: searchTerm,
                srnamespace: 14,
                srlimit: 10
            }
        }).
        success( function(data, status, headers, config) {
            var arrayOfCats = [];
            if (data.error) {
                $log.warn("Wiki.pedia.getCatSearch(", searchTerm, ") success but server error; data == ", data);
            } else {
                var arrayOfObjects = data.query.search;
                $log.debug("Wiki.pedia.getCatSearch(", searchTerm, ") success arrayOfObjects == ", arrayOfObjects);
                if (arrayOfObjects.length > 0) {
                    //turn array of objects that have title propery into array of titles; remove "Category:" from start
                    for (var i=0; i<arrayOfObjects.length; i++) {
                        arrayOfCats.push( arrayOfObjects[i].title.substring(9) );
                    }
                } else {
                    if (data.query.searchinfo.suggestion) {
                        arrayOfCats = [ capFirstLetter(data.query.searchinfo.suggestion) ];
                    }
                }
                $log.debug("Wiki.pedia.getCatSearch(", searchTerm, ") resolving with arrayOfCats == ", arrayOfCats);
            }
            deferred.resolve(arrayOfCats);
        }).
        error(deferred.reject);
        
        return deferred.promise;
    }
    
    function capFirstLetter(str) {
        return str.substring(0,1).toUpperCase() + str.substring(1);
    }
    
    /**
     * 
     * * **** It is NOT like (the forthcoming): looking up the Categories: on the bottom of that page (minus the hidden categories)--maybe that would be closer to "list=iwbacklinks", or "list=search", or ***"prop=categories"--ummm, I think the only thing 'wrong' with what's below is that is doesn't have "Category:" in front of the title
     * Equivalent manual search:
     *      ? I don't see anything designed to do this on http://en.wikipedia.org/wiki/Help:Searching
     * Call is like:
     *      http://en.wikipedia.org/wiki/Special:ApiSandbox#action=query&prop=categories&format=json&clshow=!hidden&cllimit=10&titles=Continent&redirects=
     * @param {String} titleOfPage - Title of a Wikipedia page that we want to get. Yes, it must be a valid page title.
     * @returns {Array} Array of Wikipedia category page titles, without the "Category:" in front.
     * @example factory.pedia.getCats("Contintent") ==> ["Continents"]
     */
    var pediaGetCatsCache = {};
    factory.pedia.getCats = function (titleOfPage) {
        var deferred = $q.defer();
        
        if (titleOfPage === "" || titleOfPage === "Category:") {
            $log.debug("Wiki.pedia.getCats() wasn't passed real title of page parameter, will resolve with empty array");
            deferred.resolve([]);
            return deferred.promise;
        }
        
        if (pediaGetCatsCache[titleOfPage]) {
            $log.debug("Wiki.pedia.getCats(" + titleOfPage + ") resolving from cache with value: ", pediaGetCatsCache[titleOfPage]);
            deferred.resolve(pediaGetCatsCache[titleOfPage]);
        } else {
            pediaGetCatsCache[titleOfPage] = deferred.promise;
            $http({
                // method: 'JSONP',
                method: 'GET',
                url: 'https://en.wikipedia.org/w/api.php',
                params: {
                    // callback: 'JSON_CALLBACK',
                    origin: '*',
                    action: 'query',
                    prop: 'categories',
                    format: 'json',
                    clshow: '!hidden',
                    cllimit: 10,
                    titles: titleOfPage,
                    redirects: ''
                }
            }).
            success( function(data, status, headers, config) {
                if (data.query.pages["-1"]) { //this doesn't handle the case where the page DOES exist but doesn't have any categories (like "Category:Cars"), which is turned into an empty array by _.map
                    pediaGetCatsCache[titleOfPage] = [];
                    deferred.resolve([]);
                } else {
                    var arrayOfObjects = _.findOnlyProp(data.query.pages).categories;
                    
                    //turn array of objects that have title propery into array of titles, AND remove "Category:" from their starts
                    var arrayOfTitles = _.map( arrayOfObjects, function(eachObject) {
                        return eachObject.title.substring(9);
                    });
                    
                    $log.debug("Wiki.pedia.getCats(" + titleOfPage + ") resolving promise with arrayOfTitles == ", arrayOfTitles);
                    pediaGetCatsCache[titleOfPage] = arrayOfTitles;
                    deferred.resolve(arrayOfTitles);
                }
            }).
            error( function(error) {
                $log.debug("Wiki.pedia.getCats(" + titleOfPage + ") error with error: ", error);
                pediaGetCatsCache[titleOfPage] = [];
                deferred.reject(error);
            });
        }
        
        return deferred.promise;
    }
    
    /**
     * This function is like .pedia.getCatSearch(), except it returns a single best result (or empty string)
     * @param {string}
     * @return {Promise} promise that resolves with a string
     * @example
     * factory.pedia.getBestCat("notAPageJunsdfslkdsdfsdffgdfgdfg")     // promises ""
     * factory.pedia.getBestCat("Planets of the Solar System")          // promises "Planets of the Solar System"
     * factory.pedia.getBestCat("planets of the solar system")          // promises "Planets of the Solar System"
     * factory.pedia.getBestCat("Carnivorous Plants")                   // promises "Carnivorous plants"
     * factory.pedia.getBestCat("CARNIVOROUS PLANTS")                   // promises "Carnivorous plants"
     * factory.pedia.getBestCat("US Presidents")                        // promises ""
     * factory.pedia.getBestCat("Carnivorous plant")                    // promises "Carnivorous plants"
     * factory.pedia.getBestCat("Extinct birds of North America")       // promises "Extinct birds of North America"
     */
    factory.pedia.getBestCat = function (attemptedTitle) {
        return factory.pedia.getCatSearch(attemptedTitle).then( function(arrayOfTitles) {
            $log.debug(".pedia.getBestCat() arrayOfTitles: ", arrayOfTitles);
            arrayOfTitles = arrayOfTitles.filter( factory.isCardSet );
            if (arrayOfTitles.includes( attemptedTitle)) {
                return attemptedTitle; //because for case like "Extinct birds of North America" exact match isn't 1st in array
            } else {
                return arrayOfTitles.find( factory.isCardSet ) || "";
            }
        }).catch( function(err) {
            return "";
        });
    }
    
    /******************************************************
            WIKIPEDIA-RELATED FUNCTION -- not sure yet where permanent home should be
    ******************************************************/
    
    
    /**
     * Check if a Wikipedia category page title is one of the special types that wouldn't work well as a card set
     * @param {String} aTitle - category page title to check, NOT starting with the "Category:" part
     * @returns {Boolean} True unless title would for sure not make a good card set
     * @example
     * factory.isCardSet('Lists by continent')              // => false
     * factory.isCardSet('Low-importance Chicago articles') // => false
     * factory.isCardSet('Presidents of the United States') // => true
     * factory.isCardSet('Africa')                          // => true
     */
    factory.isCardSet = function (aTitle) {
        var isOk = true;
        var dontKeepStarts =
        ["Wikipedia featured", //like "Dwarf planets" would give search suggestion of "Wikipedia featured topics Dwarf planets featured content"
        "Wikipedia categories", //e.g. "Wikipedia categories named after continents" for search "Continents"
        "Lists of", //I tried a couple and, predictibly, they seemed bad
        "Lists by", //e.g. "Lists by continent" for search "Continents"
        "Lists and", //e.g. "Lists and galleries of flags" for search "Flags of the United States"
        "Lists relating to", //e.g. with search "U.S. Presidents"
        //"Definition of", I think this one is sometimes ok, like "Definition of racism controversy"
        //"Galleries of", At least make sure not to filter out ones like "National Galleries of Scotland"
        "Template:", //I've never seen it come up, but I'm assuming...
        "Categories by", //e.g. "Categories by state of the United States" for "States of the United States"
        "Template-Class", //or one shows up for search "U.S. Presidents"
        "Redirects from", //for example, "Interstate Highways in Wisconsin" shouldn't show "Redirects from highway in region without possibilities"
        "WikiProject Missing", //or get a bad one for "Sleep medicine"
        "WikiProject", //like "WikiProject Colorado" for search "U.S. states"
        "Comparison of", //"Comparison of assessments" MIGHT be ok, but others I found not too good
        "Wikipedian", //or one shows up for search "U.S. Presidents" and "Dulcimer"
        "Set indices", //or one shows up for search "Dulcimer"
        "Articles using", //e.g. "Hair color" would have "Articles using Infobox character with deprecated parameters"
        "Wikipedia books on", //e.g., "Abrahamic religions" would have "Wikipedia books on Abrahamic religions"
        "Wikipedia free files",
        "Public domain files",
        "Files with restricted",
        "Pages with ",
        "Pages containing ",
        "Wikipedia requested ",
        "Files with",
        "X1"] 
        function isBadStart(stringToCheck) {
            return !!dontKeepStarts.find( function(eachStart) {
                return stringToCheck.startsWith(eachStart);
            });
        }
        var dontKeepEnds =
        [" articles",
        " articles needing attention", //like "Presidents of the U.S." would give search suggestion "U.S. Presidents articles needing attention"
        " articles needing expert attention", //like "Presidents of the U.S." would give search suggestion "U.S. Presidents articles needing expert attention"
        " stubs", //like "Flags of the United States" would give search suggestion "United States flag stubs"
        "-related lists", //like "Flags of the United States" would give search suggestion "United States history-related lists"
        " list errors",
        " templates", //like "Periodic table" would give search suggestion "Periodic table templates"
        " navigational boxes"
        ];
        function isBadEnd(stringToCheck) {
            return !!dontKeepEnds.find( function(eachEnd) {
                return stringToCheck.endsWith(eachEnd);
            });
        }
        var dontKeepContains =
        ["disambiguation", // like "Disambiguation pages"
        "Wikipedia sockpuppets",
        "articles with",
        "articles needing",
        "data templates"]; // e.g., search for "U.S. state flags" would have "Country data templates of Georgia"
        function isBadContains(stringToCheck) {
            return !!dontKeepContains.find( function(eachContain) {
                return stringToCheck.toUpperCase().includes(eachContain.toUpperCase());
            });
        }
        return !isBadEnd(aTitle) && !isBadStart(aTitle) && !isBadContains(aTitle);
    }
    
    
    /******************************************************
            WIKIPEDIA-RELATED PRIVATE FUNCTIONS
    ******************************************************/
    
    /**
     * Check if a Wikipedia page title is one of the 'not-thing' special types that wouldn't work well as a card
     * @param {String} aTitle - Page title to check.
     * @returns {Boolean} True unless title is list, gallery, etc.
     */
    function isTitleCard(aTitle) {
        var isOk = true;
        var dontKeep =
        ["List of",
        "Lists of",
        "Definition of",
        "Timeline of",
        "Gallery of",
        "Template:",
        "Comparison of",
        "Portal:"];
        _.each(dontKeep, function(eachDont) {
            if ( aTitle.substring(0,eachDont.length) == eachDont ) {
                isOk = false;
            }
        });
        return isOk;
    }

    
    
    return factory;
});