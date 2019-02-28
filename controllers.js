app.controller("IndexController", function($scope, $location, $log) {
    
    $scope.onHomeScreen = function() {
        $log.debug("onHomeScreen() start with $location.path() == " + $location.path() );
        var path = $location.path();
        return (path == "/" || path == "/index.htm");
    }

});


app.controller("SuggestionController", function($scope, $location, $timeout, $log, $http, $q, State, Wiki) {
    $scope.suggestionHeading = "";
    $scope.suggestionList = [];
    
    //watch State.catTried, and run getSearchSuggestions when it changes
    $scope.$watch(function () { return State.catTried; },
        function (value) {
            if (value) {
                getSearchSuggestions(value);
            } else {
                $scope.suggestionHeading = "";
                $scope.suggestionList = [];
            }
        }
    );
    
    //watch State.catShowing, and run getSearchSuggestions when it changes
    $scope.$watch(function () { return State.catShowing; },
        function (value) {
            if (State.catTried) {
                getSearchSuggestions(State.catTried);
            } else {
                $scope.suggestionHeading = "";
                $scope.suggestionList = [];
            }
        }
    );
    
    function getSearchSuggestions(prevTry) {
        $log.debug("getSearchSuggestions() start with prevTry == " + prevTry);
        var multSearchPromise = $q.all([
            Wiki.pedia.getSubcats(prevTry), // .getSubcats puts "Category:" in front of prevTry before trying as page title (which is only way it makes sense)
            Wiki.pedia.getCats("Category:" + prevTry), // .getCats does NOT add (or remove) "Category:" in front of prevTry before trying as page title (and either could be helpful)
            Wiki.pedia.getCats(prevTry),
            Wiki.pedia.getCatSearch(prevTry) //does NOT add (or remove) "Category:" in front of prevTry before trying as search term (but makes more sense without)
        ]).then( function (results) {
            $log.debug("getSearchSuggestions() $q.all() success with results == ", results);
            
            results[0] = _.map( results[0], function(eachResult) { return {'name': eachResult, 'from': "getSubcats" }; });
            results[1] = _.map( results[1], function(eachResult) { return {'name': eachResult, 'from': "getCats with Category:" }; });
            results[2] = _.map( results[2], function(eachResult) { return {'name': eachResult, 'from': "getCats no Category:" }; });
            results[3] = _.map( results[3], function(eachResult) { return {'name': eachResult, 'from': "getCatSearch" }; });
            
            var catList = _.flatten(results);
            catList = _.uniqBy(catList, 'name'); //eliminate any duplicates in list
            //make sure we don't give the person the suggestion of what they just did! (which I think is possible because of redirects)
            catList = _.filter(catList, function (eachCat) {
                return eachCat.name != prevTry && eachCat.name != State.catShowing; //this is assuming that State.catShowing has already been set, which we can't gaurantee (so possible though seemingly rare race condition)
            });
            //don't include special pages like "Lists of" that don't make good card sets
            catList = _.filter(catList, function (eachCat) {
                return Wiki.isCardSet(eachCat.name);
            });
            if (catList.length > 0) {
                $scope.suggestionHeading = "You could try:";
                $scope.suggestionList = catList;
            }
        }, function(err) {
            $log.debug("getSearchSuggestions() error from $q.all: ", err);
        });
    }    
    
});


app.controller("MainController", function($scope, $location, $timeout, $log, $http, $q, $window, State, Wiki, WD) {
    $scope.suggestionHeading = "Examples";
    $scope.statuses = []; // for Summary card
    $scope.summaries = []; // for Summary card
    $scope.summaries.ind = {}; // for lines displayed individually
    $scope.summaries.debug = {}; // for lines displayed only with scope.debugMode not falsey
    $scope.searchFeedback = "";
    
    $scope.cards = [];
    
    $scope.imageSources = [];
    $scope.reportImageSource = function( source ) {
        $scope.imageSources.push(source);
    }
    
    if ( $location.search().q ) {
        State.catTried = $location.search().q;
        $scope.searchFeedback = "Searching...";
        $scope.summaries.ind.searching = true;
        $scope.summaries.ind.searchFor = State.catTried;
        Wiki.pedia.getBestCat(State.catTried).
          then( function(bestCat) {
            State.catShowing = bestCat;
            $scope.summaries.ind.loading = true;
            $scope.summaries.ind.searching = false;
            return Wiki.pedia.getList(bestCat);
          }).
          then(catSuccess, catError);
    } else {
        State.catTried = "";
        $window.document.title = "FlashyCards"
        $scope.searchFeedback = "";
    }
    
    $scope.getCat = function() {
        State.catTried = $scope.cat;
        $location.search({q: State.catTried});
    }
    
    function catError(err) {
        $scope.searchFeedback = "Sorry, there was an error performing that search...";
        $window.document.title = "FlashyCards"
        $log.debug("MainController catError(): ", err);
        $scope.summaries.ind.loading = false;
    }
    
    function catSuccess(arrayOfTitles) {
        $log.debug("MainController catSuccess() start with arrayOfTitles: ", arrayOfTitles);
        $scope.summaries.debug.numPediaCat = arrayOfTitles.length;
        $scope.prevTry = State.catTried[0].toUpperCase() + State.catTried.substring(1);
        $log.debug("catSuccess() $scope.prevTry == " + $scope.prevTry);
        
        if (arrayOfTitles.length == 0) {
            $scope.searchFeedback = "No results found. Please try again.";
            State.catShowing = "";
            $window.document.title = "FlashyCards"
            $scope.summaries.ind.loading = false;
        } else {
            $scope.summaries.ind.pediaCat = State.catShowing;
            $window.document.title = "FlashyCards | " + State.catShowing;
            if (arrayOfTitles.length > 85) {
                $scope.searchFeedback = "Too many results found. Showing first section only.";
                $log.debug("catSuccess() arrayOfTitles: ", arrayOfTitles);
                var getWdObjectsPromise = WD.data.getObjects( _.take(arrayOfTitles,75) );
                getWdObjectsPromise.then( objectsSuccess, _.logMessVar("getWdObjectsPromise.then() for > 60 titles rejected with error: ") );
            } else { // 1-60 results
                $scope.searchFeedback = "Search complete.";
                var getWdObjectsPromise = WD.data.getObjects(arrayOfTitles);
                getWdObjectsPromise.then( objectsSuccess, _.logMessVar("getWdObjectsPromise.then() for > 60 titles rejected with error: ") );
            }
        }
    }
    
    
    /**
     * does card have enough info that we should display it?
     * @example
     * isCardComplete( { id: "Q2685995", type: "item", labels: "Periodic table", descriptions: "", claims: {} } )     // => false
     * isCardComplete( { id: "Q2920462", type: "item", labels: "Whole number rule", descriptions: "", claims: { P646: { property: "P646", datatype: "external-id", labels: "Freebase ID", value: ["/m/02z9f7j"] } } } )     // => false
     * isCardComplete( { id: "Q4925868", type: "item", labels: "Blee", descriptions: "Wikimedia disambiguation page", claims: { P31: { property: "P31", datatype: "wikibase-item", labels: "instance of", value: "Wikimedia disambiguation page" } } } )     // => false
     * isCardComplete( { id: "Q428841", type: "item", labels: "systematic element name", descriptions: "", claims: { P279: { property: "P279", datatype: "wikibase-item", labels: "subclass of", value: "" } } } )     // => true
     * isCardComplete( { id: "Q588507", type: "item", labels: "Goldschmidt classification", descriptions: "geochemical classification which...", claims: { P646: { property: "P646", datatype: "external-id", labels: "Freebase ID", value: ["/m/01pck6"] }, P138: { property: "P138", datatype: "wikibase-item", labels: "named after", value: "Victor Goldschmidt", $$hashKey: "object:192" } } } )     // => true
     */
    function isCardComplete( cardObject ) {
        var hasDescription = cardObject.descriptions !== "";
        var numClaims = Object.keys(cardObject.claims).length;
        var hasClaims = numClaims !== 0 && !(numClaims === 1 && cardObject.claims.P646);
        var isNotDisambig = cardObject.descriptions !== "Wikimedia disambiguation page" && cardObject.descriptions !== "Wikipedia disambiguation page";
        return (hasDescription || hasClaims) && isNotDisambig;
    }
    
    //Now we have the Wikidata objects that we'll turn into our set of cards
    function objectsSuccess(wdObjects) {
        $log.debug("objectsSuccess() start with wdObjects: ", wdObjects);
        $scope.summaries.debug.numPreFilter = wdObjects.length;
        //filter out cards that don't have a description or any claims
        wdObjects = wdObjects.filter( isCardComplete );
        $scope.summaries.debug.numWithDescOrClaims = wdObjects.length;
        if (wdObjects.length == 0) {
            $scope.searchFeedback = "No results found. Please try again.";
        } else { //if any cards to display (wdObjects.length > 0)
            var filterCardsIoLow = filterCardsIo.bind(null, .5);
            var filterCardsIoHigh = filterCardsIo.bind(null, .9);
            var filterObj = _.findFirstFuncName( [ filterCardsPartSeries, filterCardsIoHigh, filterCardsPo, filterCardsIoLow, filterCardsSo ], [wdObjects] );
            $log.debug("objectsSuccess() filterObj: ", filterObj);
            var filteredCards = filterObj.result || wdObjects;
            $scope.summaries.ind.cardsType = filterObj.func || "none";
            
            //now, on with the business of displaying those cards!
            $scope.cards = [];
            _.each(filteredCards, function(eachRawCard, index) {
                $scope.cards[index] = {};
                $scope.cards[index].raw = eachRawCard;
            });
        }//end the if that says we had cards to display
        $scope.summaries.ind.loading = false;
    }


    /**
     * @private
     * Property "P31" is "instance of"
     * @param {number} minMatch - what portion of cards need to have that property matching?
     * @param {Array} wdObjects - Array of card objects.
     * @returns {Array} Array of filtered card objects, or undefined if it doesn't think it's a good filter for the set
     **/
    function filterCardsIo(minMatch, wdObjects) {
        var ios = _(wdObjects).map( function(eachObj) {
            return WD.data.getClaimValues( eachObj, 'P31' );
        }).flatten().compact().value();

        $log.debug("filterCardsIo() ios: ", ios);
        ios.sort();
        // if ( _.findRatioWithProp(wdObjects, 'claims.P31') > minMatch ) { //i.e, if it seems like there's enough "instance of" data
        var filterVal = _.findMode(ios);
        $log.debug("filterCardsIo() filterVal == " + filterVal);
        var keeperCards = _.filter(wdObjects, function(eachObject) {
            var p31Value = _.get(eachObject, 'claims.P31.value') || "";
            return p31Value.indexOf(filterVal) !== -1;
        });
        if (keeperCards.length / wdObjects.length > minMatch) {
            return keeperCards;
        } else { //otherwise, say No thanks, this filter doesn't apply
            return undefined;
        }
        
    }
    
    /**
     * @private
     * Property "P279" is "subclass of"
     * Examples of card sets this catches: "Types of planets", "Toyota vehicles"
     * @param {Array} wdObjects - Array of card objects.
     * @returns {Array} Array of filtered card objects, or undefined if it doesn't think it's a good match
     **/
    function filterCardsSo(wdObjects) {
        var sos = _(wdObjects).map( function(eachObj) {
            return WD.data.getClaimValues( eachObj, 'P279' );
        }).flatten().compact().value();
        sos.sort();
        $log.debug("filterCardsSo() sos: ", sos);
        
        if ( _.findRatioWithProp(wdObjects, 'claims.P279') > .5 ) { //i.e, if more than half have an "instance of"
            var filterVal = _.findMode(sos);
            $log.debug("filterCardsSo() filterVal == " + filterVal);
            var keeperCards = _.filter(wdObjects, function(eachObject) {
                var p279Value = _.get(eachObject, 'claims.P279.value') || "";
                return p279Value.indexOf(filterVal) !== -1;
            });
            //also, need to make sure we didn't just exclude too many cards, like if lots of cards have the property, but they all have different values
            if (keeperCards.length > .3 * wdObjects.length) {
                return keeperCards;
            }
        }
        //otherwise, say No thanks, this filter doesn't apply
        return undefined;
    }

    /**
     * @private
     * Property "P179" is "part of series"
     * Examples of card sets this catches: "Torah books"
     * @param {Array} wdObjects - Array of card objects.
     * @returns {Array} Array of card filtered card objects, or undefined if it doesn't think it's a good filter
     **/
    function filterCardsPartSeries(wdObjects) {
        var partSeriesVals = _(wdObjects).map( function(eachObj) {
            return WD.data.getClaimValues( eachObj, 'P179' );
        }).flatten().compact().value();
        partSeriesVals.sort();
        $log.debug("filterCardsPartSeries() partSeriesVals: ", partSeriesVals);
        if ( partSeriesVals.length > (.69 * wdObjects.length) ) { //i.e, if more than that portion of cards have a "part of series"; can't go higher for "Little House books"
            var filterVal = _.findMode(partSeriesVals);
            $log.debug("filterCardsPartSeries() filterVal == " + filterVal);
            var keeperCards = _.filter(wdObjects, function(eachObject) {
                var p179Value = _.get(eachObject, 'claims.P179.value') || "";
                return p179Value.indexOf(filterVal) !== -1;
            });
            return keeperCards;
        } else { //otherwise, say No thanks, this filter doesn't apply
            return undefined;
        }
    }
    
    /**
     * @private
     * Property "361" is "part of"
     * Examples of card sets this catches: "Types of planets", "Toyota vehicles"
     * @param {Array} wdObjects - Array of card objects.
     * @returns {Array} Array of card filtered card objects, or undefined if it doesn't think it's a good filter
     **/
    function filterCardsPo(wdObjects) {
        var pos = _(wdObjects).map( function(eachObj) {
            return WD.data.getClaimValues( eachObj, 'P361' );
        }).flatten().compact().value();
        pos.sort();
        $log.debug("filterCardsPo() pos: ", pos);
        if ( pos.length > (.55 * wdObjects.length) ) { //i.e, if more than that portion of cards have a "part of"; more or less is bad for either "Planets of the solar system" or "Continents" right now
            var filterVal = _.findMode(pos);
            $log.debug("filterCardsPo() filterVal == " + filterVal);
            var keeperCards = _.filter(wdObjects, function(eachObject) {
                var p361Value = _.get(eachObject, 'claims.P361.value') || "";
                return p361Value.indexOf(filterVal) !== -1;
            });
            return keeperCards;
        } else { //otherwise, say No thanks, this filter doesn't apply
            return undefined;
        }
    }
    
}); //end MainController


app.controller("OneController", function($scope, $location, $timeout, $log, $http, $q, $window, State, Wiki, WD) {
    $log.debug( "OneController() $location.path() == " + $location.path() + " $location.hash() == " + $location.hash() + " $location.search(): ", $location.search() );
    
    if ( $location.search().q ) {
        var objectPromise = WD.data.getObjects( [ $location.search().q ] );
        objectPromise.then( objectsSuccess, _.logMessVar("oneError() rejected with err: ") );
    }
    
    //Now we have the Wikidata object that we'll turn into our card
    function objectsSuccess(getObjectsRes) {
        var eachRawCard = getObjectsRes[0];
        $log.debug("OneController objectsSuccess() with eachRawCard: ", eachRawCard);
        
        //the rest of this work is now done in the cardBody directive's link() function or controller
        $scope.card = {};
        $scope.card.raw = eachRawCard;
        $log.debug("OneController objectsSuccess() with $scope.title: ", $scope.title);
        $window.document.title = "FlashyCards | " + $location.search().q;
    }
    
}); //end OneController