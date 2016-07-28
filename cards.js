﻿var app = angular.module('cardApp', ['ngRoute', 'cardServices', 'wikidataService', 'commonsService', 'synonymService']);

app.config(function($locationProvider, $routeProvider, $logProvider) {
    $locationProvider.html5Mode(true);
    
    $logProvider.debugEnabled(false);
    
    $routeProvider
        .when('/',
            {
                controller: 'MainController',
                templateUrl: 'homeView.htm',
                reloadOnSearch: true
            })
        .when('/index.html',
            {
                controller: 'MainController',
                templateUrl: 'homeView.htm',
                reloadOnSearch: true
            })
        .when('/one',
            {
                controller: 'OneController',
                templateUrl: 'oneView.htm',
                reloadOnSearch: true
            })
        .otherwise({ redirectTo: '/' });
        
});

app.factory('State', function($log) {
    $log.debug("State service start");
    var factory = {};
    
    //catTried -- last category searched for; the search input field itself ($scope.cat in main controller) isn't as persistent (or available in other controllers, of course), like this factory property is
    factory.catTried = "";

    return factory;
});

app.filter('wdPropLabel', function(WD) { //wikidataService
    return function(prop) {
        var propLabel;
        if (WD.filterPropList[prop]) {
            propLabel = WD.filterPropList[prop].label;
            propLabel = propLabel.substring(0,1).toUpperCase() + propLabel.substring(1);
        }
        return propLabel || prop;
    }
});


app.filter('wdEntityLabel', function(WD) {
    return function(entity) {
        var entityLabel;
        if ( /^Q{1}\d+/.test(entity) ) { //regular expression to check for Q####
            entityLabel = WD.getLocalLabel(entity);
        }
        return entityLabel || entity;
    }
});


app.filter('wdEntityLabelDebug', function(WD) {
    return function(entity) {
        var entityLabel;
        if ( typeof entity == "string" && /^Q{1}\d+/.test(entity) ) { //regular expression to check for Q####
            entityLabel = WD.getLocalLabel(entity);
        } else if ( angular.isArray(entity) && /^Q{1}\d+/.test(entity[0]) ) {
            entityLabel = _.map(entity, function(eachEnt) {
                return WD.getLocalLabel(eachEnt);
            }).toString();
        }
        return entityLabel || entity;
    }
});

//return "" (false) unless it's an entity (and therefore we want to put in a link)
app.filter('ifWdLinkable', function() {
    return function(entity) {
        var returnVal = "";
        if ( /^Q{1}\d+/.test(entity) ) { //regular expression to check for Q####
            returnVal = entity;
        }
        return returnVal;
    }
});


app.filter('commonsImageUrlToPageUrl', function() {

    /**
     * @param {string}
     * @return {string}
     * @example
     * commonsImageUrlToFileLink( 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Africa_satellite_orthographic.jpg/267px-Africa_satellite_orthographic.jpg' )    // => 'https://commons.wikimedia.org/wiki/File:Africa_satellite_orthographic.jpg'
     * commonsImageUrlToFileLink( 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Bariloche-_Argentina2.jpg/300px-Bariloche-_Argentina2.jpg' )                    // => 'https://commons.wikimedia.org/wiki/File:Bariloche-_Argentina2.jpg'
     */
    function commonsImageUrlToFileLink( imageUrl ) {
      var linkUrl = imageUrl.substring( imageUrl.lastIndexOf('/') );
      linkUrl = linkUrl.substring( linkUrl.indexOf('-')+1 );
      return 'https://commons.wikimedia.org/wiki/File:' + linkUrl;
    }
    
    return commonsImageUrlToFileLink;
    
});


//return string with first letter capitalized
app.filter('capFirst', function() {
    return function(stringToCap) {
        return stringToCap ? stringToCap.substring(0,1).toUpperCase() + stringToCap.substring(1) : "";
    }
});

app.filter('escape', function() {
  return window.encodeURIComponent;
});

app.directive('wikiLink', function() {
    function getWikiName(href) {
        var siteTrans = {
            wikimedia: "Commons",
            wikipedia: "Wikipedia",
            wikinews: "Wikinews",
            wikiquote: "Wikiquote",
            wikisource: "Wikisource",
            wikivoyage: "Wikivoyage",
            simplewiki: "Simple"
        };
        var domain = href.includes('simple.wikipedia') ? 'simplewiki' : href.substring(href.indexOf('.')+1, href.indexOf('.org'));
        return siteTrans[domain] || "Wiki";
    }
    
    function link(scope, element, attrs) {
        var href = attrs.href;
        scope.href = href;
        scope.text = getWikiName(href) + " "; //adding space to avoid words running together if ng-repeat on wiki-link
    }
    return {
        restrict: 'AE',
        link: link,
        scope: {},
        templateUrl: 'wikiLink.html'
    };
});

app.directive('commonsLink', function() {
    
    function link(scope, element, attrs) {
        var fileName = attrs.fileName;
        scope.fileName = fileName;
        scope.text = fileName;
    }
    return {
        restrict: 'AE',
        link: link,
        scope: {},
        templateUrl: 'commonsLink.html'
    };
});

app.directive('coordLink', function() {
    
    function getCoordLat(valObject) {
        var lat = valObject.latitude;
        lat = Math.round(lat*10000)/10000;
        return lat;
    }
    
    function getCoordLon(valObject) {
        var lon = valObject.longitude;
        lon = Math.round(lon*10000)/10000;
        return lon;
    }
    
    function link(scope, element, attrs) {
        var propObject = scope.eachProp.value[0];
        var lat = getCoordLat(propObject);
        var lon = getCoordLon(propObject);
        scope.lat = lat;
        scope.lon = lon;
        scope.text = "" + lat + ", " + lon;
    }
    return {
        restrict: 'AE',
        link: link,
        templateUrl: 'coordLink.html'
    };
});

app.directive('entityList', function() {
    
    function link(scope, element, attrs) {
        var propObj = scope.eachProp;
        var allVals = propObj.value;
        scope.text = allVals;
    }
    return {
        restrict: 'AE',
        link: link,
        templateUrl: 'entityList.html'
    };
});

app.directive('displayWikiLinks', function() {
    
    function link(scope, element, attrs) {
        scope.wikiLinks = scope.card.sitelinks;
    }
    return {
        restrict: 'AE',
        link: link,
        templateUrl: 'displayWikiLinks.html'
    };
});

app.directive('timeItem', function() {
    
    function formatTimeVal(propObject) {
        /**
         * for gregorian 3, an example is Universe (Q1) P580 is "-13798000000-00-00T00:00:00Z"
         * maybe I can use gregorian2 for now?
         */
        
        /**
         * for example, Earth (Q2) property P580 is "-4540000000-01-01T00:00:00Z"
         */
        function gregorian2(val) {
            var cleanTime = val.substring(1,5);
            if (cleanTime.substring(0,1) == "0") {
                cleanTime = cleanTime.substring(1);
            }
            cleanTime = cleanTime + " million years ago";
            return cleanTime;
        }
        
        /**
         * year, month, and day are significant
         * for example, Pope Benedict XVI (Q2494) P569 is "+1927-04-16T00:00:00Z"
         * another example, Uranus (Q324) P575 is "+1781-03-13T00:00:00Z"
         * and Apollo 13 (Q182252) P619 is "+1970-04-11T00:00:00Z"
         */
        function gregorian11(val) {
            return new Date( val.substring(1, val.length-1) ).toLocaleDateString();
        }
        
        /**
         * year and month are significant
         * for example, Pope John XVIII (Q179702) P570 is "+1009-07-01T00:00:00Z"
         */
        function gregorian10(val) {
            var d = new Date( val.substring(1, val.length-1) );
            return d.getMonth() + "/" + d.getFullYear();
        }
        
        /**
         * only year is significant
         * for example, Madison, Wisconsin start time (P580) of "+1856-01-01T00:00:00Z"
         * for example, Bemis Manufacturing Company inception (P571) of "+1901-00-00T00:00:00Z"
         * @param {string}
         * @return {string}
         * @examples
         * gregorian9("+1856-01-01T00:00:00Z")        // => "1856"
         * gregorian9("+1901-00-00T00:00:00Z")        // => "1901"
         */
        function gregorian9(val) {
            return val.substring(1, val.indexOf("-") );
        }
        
        /**
         * approximate year ("c." = "circa")
         * for example, Pope Benedict IX (Q178799) is "+1012-01-01T00:00:00Z"
         */
        function gregorian8(val) {
            return  "c. " + new Date( val.substring(1, val.length-1) ).getFullYear();
        }
        
        /**
         * @todo - so, yeah, this puts out 1 day early than what's on https://www.wikidata.org/wiki/Q227694
         * for example, Q227694, claim P570, is "+1417-10-27T00:00:00Z"
         * another example, Pope Celestine V (Q118081) has P570 of "+1296-05-26T00:00:00Z"
         */
        function julian11(val) {
            return new Date( val.substring(1, val.length-1) ).toLocaleDateString();
        }
        
        //1st level is calendar model, 2nd level is precision
        var timeFuncs = {
            "Q1985727": {
                "2": gregorian2,
                "3": gregorian2, //see how this looks for now before making own function
                "8": gregorian8,
                "9": gregorian9,
                "10": gregorian10,
                "11": gregorian11
            },
            "Q1985786": {
                "11": julian11
            }
        
        };
        
        //extra-long if to avoid crash from P569 of Q132113 and Q179702
        if ( propObject && propObject.value && propObject.value[0] ) {
            var propVal = propObject.value[0];
            var rawTime = propVal.time; //e.g. "+00000001927-04-16T00:00:00Z"
            var precision = propVal.precision;
            var calendarModel = propVal.calendarmodel && propVal.calendarmodel.substring( propVal.calendarmodel.lastIndexOf("/")+1 );
            var cleanTime = rawTime;
            
            if (timeFuncs[calendarModel] && timeFuncs[calendarModel][precision] ) {
                cleanTime = timeFuncs[calendarModel][precision](rawTime);
            } else {
                //console.log("formatTimeVal() no formatting function found for propObject: ", propObject);
            }
            
            return cleanTime;
        } else {
            return "";
        }
    }
    
    function link(scope, element, attrs) {
        var propObject = scope.eachProp;
        scope.text = formatTimeVal(propObject);
    }
    return {
        restrict: 'AE',
        link: link,
        templateUrl: 'timeItem.html'
    };
});


app.directive('cardImage', function($q, $log, Wiki, WD, SynonymService, CommonsService) {
    
    function link(scope, element, attrs) {
        var eachRawCard = scope.card.raw;
        
        //find the best image to use
        var imagePromise = getBestImage(eachRawCard);
        imagePromise.then(function(result) {
                //console.log("getBestImage() success with result == ", result);
                //console.log("cardImage link() getBestImage().then() success start with scope.card: ", scope.card);
                if (!scope.card.show) {
                    scope.card.show = {};
                };
                scope.card.show.img = result.src;
                //console.log("getBestImage() success with scope.reportImageSource == " + scope.reportImageSource);
                if (scope.reportImageSource) { //this function, intended for an individual card, may be used with a Summary card that needs this info
                    scope.reportImageSource(result.src); //so Summary card can tell despite ng-repeat isolate scope
                }
                if (!scope.card.debug) {
                    scope.card.debug = {};
                };
                scope.card.debug["Image from"] = result.caption;
            },
            function(reason) {
                //console.log("getBestImage(",eachRawCard,") error callback with reason == ", reason);
                // use default image (NOT from Wikidata) for the 'instance of' or 'subclass of' of the Wikidata object, if possible
                if (eachRawCard.claims) {
                    //console.log("getBestImage() eachRawCard.claims: ", eachRawCard.claims);
                    var ioLabels = ( eachRawCard.claims.P31 && eachRawCard.claims.P31.value.split(", ") ) || [];
                    var soLabels = ( eachRawCard.claims.P279 && eachRawCard.claims.P279.value.split(", ") ) || [];
                    var ioAndSoLabels = _.union( ioLabels, soLabels);
                    var entityLabel = eachRawCard.labels;
                    var allLabelsToMatch = ioAndSoLabels.push( entityLabel ); //for example, will find glyph for ?q=Address and ?q=Binary
                    //console.log("getBestImage() allLabelsToMatch: ", allLabelsToMatch);
                    
                    var glyph = SynonymService.findSynOrGlyphMatch(ioAndSoLabels);
                    if (glyph) {
                        scope.card.show.glyph = "icon-" + glyph;
                        scope.card.debug["Image from"] = "glyph by name";
                    } else {
                        scope.card.show.glyph = "icon-puzzle-plugin";
                        scope.card.debug["Image from"] = "default glyph";
                    }
                } else {
                    scope.card.show.glyph = "icon-puzzle-plugin";
                    scope.card.debug["Image from"] = "default glyph (no claims)";
                }
            }
        ).then( function() {
            scope.$apply(); //I need to apply scope because of the spots I switched from $q to ES6 promises
        }).catch( function(err) {
            $log.debug("cardImage error: ", err);
        });
        
        
        /**
         * might be useful for testing:
         *   P18 - ALL 5 of "Torah books"
         *   P935 - ??? there are some entities listed in cardServices.js as having that property, but probably they all have P18 as well
         *   sitelinks.commonswiki - ???
         *   P373 - in "Continents", Q538 (Oceania) and Q5107 (Continent) have P373 but not P18 or P935 oe sitelinks.commonswiki
         *   none of the above - "Little House books" should all just show default glyph; "Defunct prisons in Iowa" only has 1 card, and it should show default glyph
         * others with a good mix:
         *   "Museums in Madison, Wisconsin"
         *                             P18    P935    commonswiki     P373
         * Wisconsin State Capitol      no     no         yes          yes
         * Wisconsin Historical Museum  no     no         no           no
         * Wisconsin Veterans Museum   yes     no         no           no
         * Chazen Museum of Art        yes     no         no           yes
         *
         * @param {Object} wdObject - Wikidata object (including claims property) of entity to get image for
         * @returns {Object} promise that resolves with object with .src (url of an image) and .caption (to say stuff like where/how it was found) properties
        */
        function getBestImage(wdObject) {
            //console.log("getBestImage("+wdObject.id+") start");
            
            /**
             * examples of entities for which this is (currently) how image is found: Q4912331, Q3305438
             * @param {Object} 'raw' wikidata object
             * @return {Promise}
             * @example
             * imageP18( {} )                                                               // promises undefined
             * imageP18( {'claims': {'P18': [ 'mainsnak':{'dataValue':'XXXXXX'} ] } } )     // promises YYYYYYYY
             */
            function imageP18(wdObject) {
                var p18 = _.get( wdObject, 'claims.P18.value.0' );
                if (!p18) {
                    return Promise.reject();
                }
                return CommonsService.getImageFromFile(p18).then( function(url) {
                    return {
                        src: url,
                        caption: "Image (P18)"
                    };
                });
            }
            
            /**
             * examples of entities for which this is (currently) how image is found: Q1221, Q1522
             * @param {Object} 'raw' wikidata object
             * @return {Promise}
             */
            function imageP935(wdObject) {
                var p935 = _.get( wdObject, 'claims.P935.value.0' );
                if (!p935) {
                    return Promise.reject();
                }
                return CommonsService.getImageFromTitle(p935).then( function(url) {
                    return {
                        src: url,
                        caption: "Commons gallery (P935)"
                    };
                });
            }
            
            /**
             * examples of entities for which this is (currently) how image is found: Q797, Q1371, Q1370
             * @param {Object} 'raw' wikidata object
             * @return {Promise}
             */
            function imageSitelinks(wdObject) {
                var commonsTitle = WD.data.getCommonsTitle(wdObject);
                $log.debug("getBestImage() imageSiteLinks() commonsTitle == " + commonsTitle);
                if (!commonsTitle) {
                    return Promise.reject();
                }
                var urlProm;
                if ( commonsTitle.startsWith("Category:") ) {
                    urlProm = CommonsService.getImageFromCategory(commonsTitle);
                } else {
                    urlProm = CommonsService.getImageFromTitle(commonsTitle);
                }
                $log.debug("getBestImage() imageSiteLinks() urlProm: ", urlProm);
                return urlProm.then( function(url) {
                    return {
                        src: url,
                        caption: "Sitelinks -- Commons"
                    };
                });
            }

            /**
             * examples of entities for which this is (currently) how image is found: Q22679, Q5043
             * @param {Object} 'raw' wikidata object
             * @return {Promise}
             */
            function imageP373(wdObject) {
                var p373 = _.get( wdObject, 'claims.P373.value.0' );
                if (!p373) {
                    return Promise.reject();
                }
                return CommonsService.getImageFromCategory(p373).then( function(url) {
                    //console.log("getBestImage() imageP373() resolved with url == " + url);
                    return {
                        src: url,
                        caption: "Commons category (P373)"
                    };
                });
            }
            
            var imageTryers = [
                imageP18.bind(undefined, wdObject),
                imageP935.bind(undefined, wdObject),
                imageSitelinks.bind(undefined, wdObject),
                imageP373.bind(undefined, wdObject)
                ];
            
            //console.log("getBestImage() about to return _.findFirstProm(imageTryers).then()");
            return _.findFirstProm(imageTryers).then( function(res) {
                //console.log("getBestImage() _.findFirstProm resolving with res: ", res);
                return res;
            });
            
        } //end getBestImage()
        
        
        function getBestImageError(error) {
            console.log("getBestImageError() start with promise error: ", error);
        }
        
        //console.log("cardImage link() end scope.card: ", scope.card);
    }//end link()
    return {
        restrict: 'AE',
        link: link,
        scope: false,
        templateUrl: 'cardImage.html'
    };
});//end cardImage directive



app.directive('cardBody', function($q, $log, WD) {
    
    function link(scope, element, attrs) {
        //console.log("cardBody link() scope.card: ", scope.card);

        if (scope.card.raw) { //don't do this if we don't have our data yet
            var forScope = {};
            var eachRawCard = scope.card.raw;
            forScope.raw = eachRawCard;
            forScope["wikibase-entityid"] = []; //I guess now will instead be:
            forScope["wikibase-item"] = [];
            forScope["time"] = [];
            forScope["quantity"] = [];
            forScope["globe-coordinate"] = [];
            forScope["string"] = [];
            forScope["monolingualtext"] = [];
            forScope["commonsMedia"] = [];
            forScope["url"] = [];
            forScope["wikibase-property"] = []; //I don't plan to display these (unless for debug)
            forScope["external-id"] = []; //I don't plan to display these (until and unless I stumble upon a useful one)
            //for individual-special values that won't end up as just a 'basic' row-li on card
            forScope.ind = {};
            forScope.ind.label = eachRawCard.labels;
            forScope.ind.desc = eachRawCard.descriptions;
            forScope.ind.aka = eachRawCard.aliases;
            
            forScope.sitelinks = eachRawCard.sitelinks;
            
            var claimsToShow = WD.getClaimsToShow(eachRawCard.claims);
            //console.log("cardBody link() claimsToShow: ", claimsToShow);
            
            claimsToShow.forEach( function(eachClaim, claimIndex) {
                if (eachClaim.datatype) {
                    var thisType = eachClaim.datatype;
                    if (forScope[thisType]) {
                        forScope[thisType].push( eachClaim );
                    } else {
                        console.warn("cardBody link() found unknown datatype for claim: ", eachClaim);
                    }
                    } else {
                        console.warn("cardBody link() .datatype not found for claim: ", eachClaim);
                    }
                });
                
                //for debug:
                forScope.debug = {}; //for values useful to me during dev but that I'll want to easily hide later
                forScope.debug["Wikidata ID"] = eachRawCard.id;
                forScope.debug["Instance of"] = _.get(eachRawCard, 'claims.P31.value');
                forScope.debug["Subclass of"] = _.get(eachRawCard, 'claims.P279.value');
                forScope.debug["Part of"] = _.get(eachRawCard, 'claims.P361.value');
                forScope.debug["Commons category (property)"] = _.get(eachRawCard, 'claims.P373.value');
                forScope.debug["Commons gallery (property)"] = _.get(eachRawCard, 'claims.P935.value');
                forScope.debug["Image (property)"] = _.get(eachRawCard, 'claims.P18.value');
                
                forScope.show = {}; //values used for displaying images, etc--values NOT to loop through (at this point) or display directly
                scope.card = forScope;
        }
    }//end link()
    
    return {
        restrict: 'AE',
        link: link,
        scope: false,
        templateUrl: 'cardBody.html'
    };
});//end cardBody directive
