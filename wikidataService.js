/**
 * @name wikidata api
 *
 * @fileOverview
 * WDAPI Service for Angular (Wikidata API proxy/REST-ifier)
 *
 */

 
var wikidataService = angular.module('wikidataService', []);

wikidataService.config(function($httpProvider) {
    $httpProvider.defaults.cache = true;
});

wikidataService.factory('WD', function($log, $http, $q) {
    $log.debug("WD service start");

    
/**********************************************************
                        SETUP SECTION
**********************************************************/

    var urlBase = "https://wikidataclean.herokuapp.com/"; // "http://localhost:5000/"

    var factory = {};
    factory.data = {}; // Wikidata -- wikidata.org/wiki/Special:ApiSandbox
    
    
    //show = whether to display it as a row on a card
    //label = "label" from Wikidata
    //mult = multiple values allowed by Wikidata? -- I don't think there's an easy way to know!
    //type = "data type" from Wikidata, used to retrieve property & possibly formatting for display; examples:
    //    column 1: what property page says (e.g. wikidata.org/wiki/Property:P227 says "Data type String")
    //    column 2: path and value from JSON API (e.g. P227 > mainsnak > datavalue > type == "string")
    //    column 3: path to value in JSON API
    //    column 4: other notes?
    //  all paths start with "P227"[#].mainsnak.datavalue.
    //
    //      "Item"                   type == "wikibase-entityid"    value.numeric-id                  value.entity-type == "item"
    //      "String"                 type == "string"               value                   
    //      "Commons media file"     type == "string"               value                             e.g P18 ("image"); also P373 ("Commons category")
    //      "URL"                    type == "string"               value                             e.g Q328 ("English Wikipedia") P856 ("official website")
    //      "Time"                   type == "time"                 value.time
    //      "Quantity"               type == "quantity"             value.amount
    //      "Geographic coordinates" type == "globecoordinate"      value.latitude and value.longitude   e.g. Q43788 ("Madision") P625 ("coordinate location")
    //
    var propertyList = {}

    var propList = {"P1005":false,"P1006":false,"P1014":false,"P1015":false,"P1017":false,"P1025":false,"P1036":false,"P1047":false,"P1051":false,"P107":false,"P1070":false,"P1116":false,"P1157":false,"P1185":false,"P1207":false,"P1222":false,"P1245":false,"P1248":false,"P1256":false,"P1263":false,"P1273":false,"P1280":false,"P1284":false,"P1296":false,"P1309":false,"P1343":false,"P1367":false,"P1368":false,"P1375":false,"P1415":false,"P1417":false,"P1421":false,"P1422":false,"P1430":false,"P1438":false,"P1566":false,"P1667":false,"P1670":false,"P1695":false,"P1711":false,"P1727":false,"P1741":false,"P1745":false,"P1747":false,"P1749":false,"P1761":false,"P1772":false,"P18":false,"P1816":false,"P1819":false,"P1839":false,"P1842":false,"P1895":false,"P1935":false,"P1939":false,"P1964":false,"P212":false,"P213":false,"P214":false,"P227":false,"P231":false,"P243":false,"P244":false,"P245":false,"P268":false,"P269":false,"P270":false,"P271":false,"P279":false,"P281":false,"P297":false,"P298":false,"P299":false,"P300":false,"P31":false,"P345":false,"P349":false,"P361":false,"P373":false,"P396":false,"P407":false,"P409":false,"P424":false,"P434":false,"P435":false,"P436":false,"P496":false,"P502":false,"P508":false,"P535":false,"P549":false,"P590":false,"P592":false,"P627":false,"P635":false,"P646":false,"P649":false,"P650":false,"P661":false,"P662":false,"P665":false,"P683":false,"P685":false,"P691":false,"P715":false,"P815":false,"P829":false,"P830":false,"P842":false,"P846":false,"P850":false,"P865":false,"P866":false,"P882":false,"P883":false,"P901":false,"P902":false,"P906":false,"P910":false,"P935":false,"P947":false,"P949":false,"P950":false,"P951":false,"P957":false,"P960":false,"P961":false,"P966":false,"P982":false,"P998":false};
    
    /**
     * @param {Object} raw claims object (.claims property of raw card)
     * @return {Array} array of the claims that we will want to display
     * @todo: there's a problem with "part of" (P361), for example with Q76 in "Presidents of the United States"--maybe I had previously used a 'part of' call in cardServices.js that returned a single value, or had filtered it out earlier?
     * @example
     * factory.getClaimsToShow( {} )                         // []
     * factory.getClaimsToShow( { 'keep':'me' } )            // [ 'me' ]
     * factory.getClaimsToShow( { 'P1005':'not me' } )       // []
     */
    factory.getClaimsToShow = function(claimsObj) {
        $log.debug("WD.getClaimsToShow() start with claimsObj: ", claimsObj);
        return _.filter(claimsObj, function(eachClaim, eachKey) {
            return !( propList[eachKey] === false ); //not on the list (i.e. undefined) is ok, but on the list and false is NOT ok
        });
    };
    
    
    /******************************************************
                WIKIDATA SECTION (excluding XHR)
    ******************************************************/
    
    
    /**
     * @param {Object} clean wikidata object
     * @param {string} prop we want to get (like 'P361') -- of type 'wikibase-item'
     * @return {Array} array of the individual string values
     * @example
     * var ent = { 'claims': {
     *   "P31":{"property":"P31","datatype":"wikibase-item","value":"mood, emotion","labels":"instance of"},
     *   "P910":{"property":"P910","datatype":"wikibase-item","value":"Category:Happiness"}
     *  } };
     * getClaimValues( ent, 'P910' )            // => ['Category:Happiness']
     * getClaimValues( ent, 'P31' )             // => ['mood', 'emotion']
     * getClaimValues( ent, 'P999999990' )      // => []
     */
    factory.data.getClaimValues = function (cleanObject, prop) {
        var valString = _.get(cleanObject, 'claims.'+prop+'.value', "");
        //$log.debug("splitClaimValues() valString: ", valString);
        var valArray = valString.split(', ');
        return _.compact(valArray);
    }
    
    /**
     * @param {Object} an entity from the clean/labeled WDAPI, which has a .sitelinks property holding an array
     * @return {string} the title of the commons page, or undefined if there isn't one
     * @example
     * getCommonsTitle( {'sitelinks':["//commons.wikimedia.org/wiki/Earth"]} )      // => "Earth"
     * getCommonsTitle( {'sitelinks':["//commons.wikimedia.org/wiki/Earth","//en.wikipedia.org/wiki/Earth","//en.wikiquote.org/wiki/Earth","//simple.wikipedia.org/wiki/Earth"]} )      // => "Earth"
     * getCommonsTitle( {} )                                                        // => undefined
     */
    factory.data.getCommonsTitle = function (entObj) {
         if (entObj.sitelinks) {
            var commonsUrl = entObj.sitelinks.find( function(eachSL) {
                return eachSL.startsWith("//commons") || eachSL.startsWith("https://commons");
            });
            if (commonsUrl) {
                return commonsUrl.substring( commonsUrl.lastIndexOf("/")+1 );
            }
         }
    }
      
    
    
    /******************************************************
                XHR SECTION FOR WIKIDATA
    ******************************************************/
    
    /*
    If you have this        and want this       use this
    Wikipedia title         Wikidata ID         data.getId
    Wikipedia title         Wikidata label      data.getObject / data.getObjects followed by getLabelFromObject
    Wikidata ID             Wikidata label      data.getLabel / data.getLabels followed by data.getIdOf
    Wikidata ID             Wikipedia title     data.getObject / data.getObjects followed manually get property .sitelinks.enwiki.title
    
    */
    
    /*********** .data.getId isn't used in my controller or elsewhere I know of, but is in my tests ***********/

    var getIdCache = {
        "Venus": "Q313"
    }
    /**
     * UPDATE this to use clean/labeled API
     * uses wdapi
     * Get ID for 1 term (term is title of a Wikipedia article; sometimes more specific than Wikidata label) . Always caches.
     * @param {String} term - Entity label to get ID for.
     * @returns {Object} Promise, for Success and Error functions; calls success or error callback with Wikidata title (id) for term.
     */
    factory.data.getId = function(term) {
        $log.debug("Wiki.data.getId(" + term + ") start");
        var deferred = $q.defer();
        if (getIdCache[term]) {
            $log.debug("Wiki.data.getId(" + term + ") found id in cache");
            deferred.resolve(getIdCache[term]);
        } else {
            getIdCache[term];
            getIdCache[term] = deferred.promise;
            $http.get(urlBase + term + '/id').
            success( function(data, status, headers, config) {
                var theId = data;
                $log.debug("Wiki.data.getId(" + term + ") success id we're looking for is: " + theId);
                //save to cache
                getIdCache[term] = theId;
                deferred.resolve(theId);
            }).
            error(deferred.reject);
        }
        return deferred.promise;
    }
    
    /**
     * UPDATE this to use clean/labeled API
     * uses wdapi
     * Get label from ID. Always caches.
     * @param {String} id - Wikidata title/ID to get label for; yes, it MUST start with one of the following:
     *       "Q" -- entity, e.g. wikidata.org/wiki/Q39367 = "dog breed"
     *       "P" -- property, e.g. wikidata.org/wiki/Property:P279 = "subclass of"
     * @returns {Object} Promise, for Success and Error functions; calls success callback with Wikidata label (word) for the title (id) of the entity.
     */
    factory.data.getLabel = function(id) {
        //$log.debug("Wiki.data.getLabel() start for id == " + id + " which is typeof == " + typeof id);
        var deferred = $q.defer();
        var idType, theLabel;
        if ( /^Q{1}\d+/.test(id) ) {
            idType = "entity";
        } else if ( /^P{1}\d+/.test(id) ) {
            idType = "prop";
        } else {
            $log.warn("data.getLabel was passed invalid id == " + id);
        }
        
        if ( idType ) {
        
            if ( idType == "entity" ) {
                var qLessId = id.substring(1);
                if (entityList[qLessId] && entityList[qLessId].label) {
                    theLabel = entityList[qLessId].label;
                    //$log.debug("Wiki.data.getLabel() found label for id == " + id + " without $http");
                    deferred.resolve(theLabel);
                }
            } else if ( idType == "prop" ) {
                if (propertyList[id] && propertyList[id].label) {
                    theLabel = propertyList[id].label;
                    //$log.debug("Wiki.data.getLabel() found label for prop " + id + " without $http");
                    deferred.resolve(theLabel);
                }
            }
            
            if ( !theLabel ) {
                //$log.debug("data.getLabel() about to make http call for id == " + id);
                
                //set a placeholder label, because between now and when the $http call returns, we don't want 
                // another call to data.getLabel() for the same id to result in another $http call
                //   --instead, this should be putting the promise there
                if ( idType == "entity" ) {
                    factory.addEntityLabel(qLessId, "(label)");
                } else if ( idType == "prop" ) {
                    factory.addPropLabel(id, "(label)");
                }
                
                $http.get(urlBase + id + '/labels/').
                success( function(data, status, headers, config) {
                    //$log.debug("data.getLabel() success for id == " + id + " with data == ", data);
                    var theLabel = data;
                    if ( idType == "entity" ) {
                        factory.addEntityLabel(id, theLabel);
                    } else if ( idType == "prop" ) {
                        factory.addPropLabel(id, theLabel);
                    }
                    
                    //$log.debug("data.getLabel() success for id == " + id + " added label " + theLabel);
                    deferred.resolve(theLabel);
                }).
                error(deferred.reject);
            }
        } else {
            //if argument was NOT in format Q###
            deferred.reject( new Error("invalid entity id") );
        }
        return deferred.promise;
    }
    
    
    
    /**
     * @private
     * Used (at least) in data.getObject and data.getObjects to see if we've been passed a Wikidata ID
     * @param {String} toTest - String to test to tell whether it's a Wikidata ID or not
     * @returns {Boolean} Whether it's a Wikidata ID
     */
    factory.data.isWdId = function (toTest) {
        if ( /^Q{1}\d+/.test(toTest) || ( /^P{1}\d+/.test(toTest) ) ) {
            return true;
        }
        return false;
    }
    
    /**
     * UPDATE to use clean/labeled API
     * gets back ALL of the properties the WDAPI has: "aliases|labels|descriptions|claims|sitelinks" ...
     * Max IDs per call: Although Wikidata has a max of 50, I'm working on this for any number less than an aribtrary limit of 500 (which will cause an error): break the IDs up into groups of less than 50, make the calls, and then combine the results so it's transparent to the user
     * @param {Array} termArray - Array of terms to get Wikidata objects for--'terms' must all be the same, but can be either:
     *          Wikipedia article titles
     *          Wikidata IDs (starting with "Q" or "P"
     *          NOT Wikidata labels, which matters, for example, with "Madison, Wisconsin" and "Mercury (planet)" (Wikipedia titles that are reduced to the not-unique "Madison" and "Mercury" as Wikidata labels
     * @returns {Object} Promise, for Success and Error functions; calls success with array of Wikidata objects--NOT including the "-1"/"missing" objects Wikidata sends for terms it can't find--or error passing through $http returns.
     */
    factory.data.getObjects = function(termArray) {
        $log.debug("WD.data.getObjects() start with termArray: ", termArray);
        var deferred = $q.defer();
        
        //500 warning is arbitrary
        if (termArray.length > 500) {
            $log.warn("Too many terms passed to Wiki.data.getObjects(). termArray.length == " + termArray.length);
            //deferred.reject("More than 500 terms passed to Wiki.data.getObjects()");
        }
        
        var newTermArray = termArray;
        // WDAPI doesn't have Wikidata limit of 50 on # of 'ids' on a request, but will I run into an HTTP length error at some ponit?

        $log.debug("WD.data.getObjects() newTermArray: ", newTermArray);
        $http.get( urlBase + encodeURIComponent(newTermArray.join("|")) ).
        success( function(data, status, headers, config) {
            $log.debug("Wiki.data.getObjects() success start with data == ", data);
            //rb +1 to handle case of single entity object requested, in which case there isn't a wrapper object...
            var theObjects = Array.isArray(data) ? data : [data];
            $log.debug("WD.data.getObjects() theObjects: ", theObjects);
            theObjects = _.filter(theObjects, 'id'); //if a term wasn't found, the object that tells us that doesn't have an id property like the 'real' results
            deferred.resolve(theObjects);
        }).
        error( function(error) {
            $log.debug("Wiki.data.getObjects() $http error: ", error);
            deferred.reject(error);
        });
        
        return deferred.promise;
    }
    
    
    return factory;
});