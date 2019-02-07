/**
 * @name Wikimedia Commons API Stuff
 *
 * @fileOverview
 * To get URLs for images based on knowing the file name or a page name or category name
 *    commons.wikimedia.org/wiki/Special:ApiSandbox
 * 
 * This service has 3 functions. All 3 functions return promise that either resolves with the URL (string) of an image or reject. 
 * 
 *     If you have:       Example:                              Meaning                                                                      Use this function:
 *      file name      "Flag of Madison, Wisconsin.svg"      get full URL of image described by "https://commons.wikimedia.org/wiki/File:Flag_of_Madison,_Wisconsin.svg"                                getImageFromFile 
 *      page name      "Venus"                            get full URL of an image from the page "https://commons.wikimedia.org/wiki/Venus"                                         getImageFromTitle
 *    category title   "Venus (planet)              get full URL of one of the image pages linked to "https://commons.wikimedia.org/wiki/Category:Venus_%28planet%29"                      getImageFromCategory
 *   just a term you want    "Cute Puppy"          find whatever image seems to most closely match that         ??? .getClosestObject
 *
 *
 * If there is an error within a success handler, these functions all return an error in Promise.reject (per http://pouchdb.com/2015/05/18/we-have-a-problem-with-promises.html -- 'Return another promise') instead of throwing--otherwise Angular catches it! (instead of letting it cross out of the service to trip the caller reject function (as I observed and was confirmed by http://www.bennadel.com/blog/2773-handling-top-level-errors-in-a-promise-workflow-in-angularjs.htm)
 */


var commonsService = angular.module('commonsService', []);

commonsService.factory('CommonsService', function($log, $http) {
    $log.debug("CommonsService service start");

    /**********************************************************
                            SETUP SECTION
    **********************************************************/
    
    var factory = {};
        

    /******************************************************
                XHR SECTION FOR COMMONS.MEDIAWIKI
    ******************************************************/
    
    
    /**
     * @exampleHelpers
     * console.log("commonsService.js @xampleHelpers start");
     * var injector = angular.bootstrap(document, ['commonsService']);
     * console.log("commonsService.js @xampleHelpers injector: ", injector);
     * var factory = injector.get('CommonsService');
     * console.log("commonsService.js @xampleHelpers factory: ", factory);
     * console.log("commonsService.js @xampleHelpers end");
     */
    
    
    /**
     * @xxxxxxexampleHelpers //these were useful when testing individual functions below, but not for whole module at once (and that's if 'ng-app' is on page already)
     * console.log("commonsService.js @xampleHelpers start");
     * var $http = angular.element(document.querySelector('.ng-scope')).injector().get('$http');
     * var $log = angular.element(document.querySelector('.ng-scope')).injector().get('$log');
     * var factory = {};
     */
    
    

    /**
    
     * Example:
     *  http://commons.wikimedia.org/w/api.php?action=query&callback=angular.callbacks._2j&format=json&generator=images&gimlimit=1&pithumbsize=300&prop=pageimages&titles=Mercury+(planet)
     * That same example in the sandbox: https://commons.wikimedia.org/wiki/Special:ApiSandbox#action=query&prop=pageimages&format=json&pithumbsize=300&pilimit=10&titles=Mercury%20(planet)&generator=images&gimlimit=1
     * This does NOT seem to work for terms that start with "Category:"
    
    
    
     * Given the title of a Commons page, get the full URL of one of the images on that page. Examples of the title of Commons page:
     *     the sits linked to a Wikidata object (in the .sitelinks.commonswiki.title property), like Q43788 has "Madison, Wisconsin" to link to "https://commons.wikimedia.org/wiki/Madison,_Wisconsin"
     *     the P935 (Commons Gallery) property are of a Wikidata entity, luke Q76 has "Barack Obama" to indicate "https://commons.wikimedia.org/wiki/Barack_Obama"
     * @param {string} title of a Commons page
     * @returns {Object} Promise that calls either 1) resolves with {string} full Commons url of the image or 2) rejects with the error returned by the Commons API
     * factory.getImageFromTitle("Barack Obama")        // resolveswith ????
     * @example
     * factory.getImageFromTitle("Mars")                // resolveswith "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/15-ml-06-phobos2-A067R1.jpg/300px-15-ml-06-phobos2-A067R1.jpg"
     * factory.getImageFromTitle("Venus")               // resolveswith "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/1882_transit_of_venus.jpg/300px-1882_transit_of_venus.jpg"
     * factory.getImageFromTitle("fasdfsadfdgfdgdfg")   // rejectswith new Error('no image found')
     * factory.getImageFromTitle("Caracara_lutosa")     // rejectswith new Error('no appropriate image found')
     */
    factory.getImageFromTitle = _.memoize( function (commonsTitle) {
        $log.debug("factory.getImageFromTitle("+commonsTitle+") start");
        return $http({
            // method: 'JSONP',
            method: 'GET',
            url: 'http://commons.wikimedia.org/w/api.php',
            params: {
                // callback: 'JSON_CALLBACK',
                origin: '*',
                action: 'query',
                format: 'json',
                titles: commonsTitle,
                prop: 'pageimages',
                pithumbsize: 300,
                generator: "images",
                gimlimit: 1
            }
        }).
        then( function(res) {
            var data = res.data;
            if (data.query) {
                var wcObject = _.findOnlyProp(data.query.pages);
                var foundImageHref = _.get(wcObject, 'thumbnail.source', '');
                $log.debug("factory.getImageFromTitle() found foundImageHref == " + foundImageHref);
                if ( !isEntityImage(foundImageHref) ) {
                    return Promise.reject( new Error('no appropriate image found') );
                }
                return foundImageHref;
            } else {
                return Promise.reject( new Error('no image found') );
            }
        });
    });
    
    
    
     /**
     * Given the name of a file on the Commons, get the full URL the image. Examples of a file on the Commons:
     *     the P18 (Image) property of a Wikidata entity, like Q111 (Mars) has "Mars 23 aug 2003 hubble.jpg" to indicate "https://commons.wikimedia.org/wiki/File:Mars_23_aug_2003_hubble.jpg"
     * Makes XHR call like: https://commons.wikimedia.org/wiki/Special:ApiSandbox#action=query&prop=pageimages&format=json&pithumbsize=300&titles=File%3AMars%2023%20aug%202003%20hubble.jpg
     * @param {string} file name from commons for which to get the full URL
     * @returns {Object} Promise that calls
     *       success -- url -- string -- full Commons url of the image
     *       error
     * factory.getImageFromFile("Mars 23 aug 2003 hubble.jpg")      // => factory.getImageFromFile("Mars 23 aug 2003 hubble.jpg")
     * @example
     * factory.getImageFromFile("Mars 23 aug 2003 hubble.jpg")      // resolveswith "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Mars_23_aug_2003_hubble.jpg/300px-Mars_23_aug_2003_hubble.jpg"
     * factory.getImageFromFile("fsdfsdfsdfersdfsdfsfd.jpg")         // rejects
     */
    factory.getImageFromFile = _.memoize( function (fileName) {
        // $log.debug("factory.getImageFromFile() start with fileName == " + fileName);
        return $http({
            // method: 'JSONP',
            method: 'GET',
            url: 'http://commons.wikimedia.org/w/api.php',
            params: {
                // callback: 'JSON_CALLBACK',
                origin: '*',
                action: 'query',
                format: 'json',
                titles: "File:"+fileName,
                prop: 'pageimages',
                pithumbsize: 300
            }
        }).
        then( function(res) {
            // $log.debug("factory.getImageFromFile() $hhtp.then() with res: ", res);
            var pagesObj = _.get(res, 'data.query.pages');
            if (pagesObj[-1]) {
                return Promise.reject( new Error('no image found') );
            }
            var urls = _.map( pagesObj, function(eachPage) { //probably just 1
                return _.get( eachPage, 'thumbnail.source', '' );
            });
            return urls[0];
        });
    });
    
    
    
    /**
     * given the title of a Commons Category page, like found in a Wikidata object's P373 property, 
     * Example:
     * https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&format=json&iiprop=url&iilimit=1&iiurlwidth=300&titles=Category%3AToyota%204Runner&generator=search&gsrsearch=Toyota%204Runner&gsrnamespace=6&gsrlimit=3
     * That same example in the sandbox: https://commons.wikimedia.org/wiki/Special:ApiSandbox#action=query&prop=imageinfo&format=json&iiprop=url&iilimit=1&iiurlwidth=300&titles=Category%3AToyota%204Runner&generator=search&gsrsearch=Toyota%204Runner&gsrnamespace=6&gsrlimit=3
     * @param {string} catName - Name of Commons category page; it should NOT include the "Category:" at the start.
     * @returns {Object} Promise that calls either 1) resolves with {string} full Commons url of an image or 2) rejects with the error passing through $http error (likely whatever was returned by the Commons API)
     * factory.getImageFromCategory("Venus (planet)")   // => factory.getImageFromCategory("Venus (planet)")
     * @example
     * factory.getImageFromCategory("Venus (planet)")   // resolveswith "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/15e38_C8-Okular%2BVenus.jpg/300px-15e38_C8-Okular%2BVenus.jpg"
     * factory.getImageFromCategory("Category:Venus (planet)")   // resolveswith "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/15e38_C8-Okular%2BVenus.jpg/300px-15e38_C8-Okular%2BVenus.jpg"
     * factory.getImageFromCategory("Barack Obama")     // resolveswith "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/%27Ladder_to_the_Moon%27_110930-N-WP746-013.jpg/300px-%27Ladder_to_the_Moon%27_110930-N-WP746-013.jpg"
     * factory.getImageFromCategory("Barack Obama")     // resolveswith "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/%27Ladder_to_the_Moon%27_110930-N-WP746-013.jpg/300px-%27Ladder_to_the_Moon%27_110930-N-WP746-013.jpg"
     * factory.getImageFromCategory("sdfsdfsdfsdfsdfsfsdfsdf")      // rejectswith new Error('no image found')
     * factory.getImageFromCategory("Caracara lutosa")              // rejectswith new Error('no appropriate image found')
     */
    factory.getImageFromCategory = _.memoize( function(incomingCatName) {
        $log.debug("Wiki.getImageFromCategory( " + incomingCatName + " ) start");
        var catName = incomingCatName.startsWith('Category:') ? incomingCatName.substring(9) : incomingCatName; //make sure does NOT included 'Category:' at start (because we'll add it later anyway)
        return $http({
            // method: 'JSONP',
            method: 'GET',
            url: 'http://commons.wikimedia.org/w/api.php',
            params: {
                // callback: 'JSON_CALLBACK',
                origin: '*',
                action: 'query',
                format: 'json',
                prop: 'imageinfo',
                iiprop: 'url',
                iilimit: 1,
                iiurlwidth: 300, //i.e. 300px wide
                generator: "categorymembers",
                gcmtitle: "Category:"+catName,
                gcmprop: 'title',
                gcmtype: 'file', //so we don't get not-image-pages like subcategories returned
                gcmlimit: 5 //return extra images, in case initial ones are ruled out
            }
        }).then( function(res) {
            $log.debug("factory.getImageFromCategory(" + catName + ") success start with res: ", res);
            var data = res.data;
            if (data.query && data.query.pages) {
                var pageObjects = data.query.pages;
                var urls = _.map( pageObjects, function(eachPageObject) {
                    return eachPageObject.imageinfo[0].thumburl;
                });
                $log.debug("factory.getImageFromCategory(" + catName + ") success urls: ", urls);
                var oneGoodUrl = _.find( urls, isEntityImage );
                $log.debug("factory.getImageFromCategory(" + catName + ") success resolving promise with oneGoodUrl: ", oneGoodUrl);
                if (!oneGoodUrl) {
                    return Promise.reject( new Error('no appropriate image found') );
                }
                return oneGoodUrl;
            } else {
                return Promise.reject( new Error('no image found') );
            }
        });
    });
        

    
    /*******************
          Helpers
    *******************/
    

    /* 
    When getting images back from a Commons page (like using factory.getImageFromCategory()), need to make sure we're not getting
      back an image that's just intended for users visiting the page, like a Wikimedia Project logo
      so make sure these aren't contained in:
      Eliminate images with:    To catch these images:          Example card set > card:
      --these 1st  2 examples don't work right now--
      "Wikispecies-logo"      [Wikispecies logo]              "Dinosaur taxa with documented paleopathologies" > "Megalosaurus"
      "Sub-arrows"            [sub arrows]                    "Crops originating from Mexico" > "Cocoa bean"
      "System-search"         "300px-System-search.svg.png"   "Toyota Prius" > "Toyota Prius Plug-in Hybrid" [commons category link]
      "Wikipedia-logo"        "Wikipedia-logo.png"            "Edible nuts and seeds" > "Acorn" [commons category link]
    "Wikidata-logo"           "300px-Wikidata-logo.svg.png"   "American political catch phrases" > "Think of the children"
    "Wikinews-logo"           "300px-Wikinews-logo.svg.png"   "American political neologisms" > 'Campaign for "santorum" neologism'
    "fileicon-ogg"          "fileicon-ogg.png" [audio]       "States of the United States" > "Wyoming" [commons category property]
    
    */
     /**
     * Make sure image isn't on page for link or navigation, so we really might want to display it
     * @private
     * @param {String} aImage - image file name or url to check
     * @returns {Boolean} True unless image is a system-y icon-y sort of thing not specific to an entity, so we wouldn't want to display it
     * @example
     * isEntityImage("300px-System-search.svg.png")     // => false
     * isEntityImage("puppy_or_something.jpg")          // => true
     */
    function isEntityImage(aImage) {
        var isntOk;
        aImage = aImage.toUpperCase();
        var dontKeep =
        ["WIKISPECIES-LOGO",
        "SUB-ARROWS",
        "SYSTEM-SEARCH",
        "WIKIPEDIA-LOGO",
        "WIKIDATA-LOGO",
        "WIKINEWS-LOGO",
        "FILEICON-OGG",
        "DISAMBIG",
        "FILEICON-OGG",
        "IUCN_3_1",
        "-NO-IMAGE"];
        isntOk = _.find( dontKeep, function( eachDont ){
            return aImage.indexOf(eachDont) !== -1;
        });
        return !isntOk;
    }
    
    
    
    return factory;
});