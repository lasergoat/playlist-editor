
// truncate filter from:
// http://jsfiddle.net/tUyyx/

angular.module('filters', []).
    filter('truncate', function () {
        return function (text, length, end) {
            if (isNaN(length))
                length = 10;

            if (end === undefined)
                end = "...";

            if (text.length <= length || text.length - end.length <= length) {
                return text;
            }
            else {
                return String(text).substring(0, length-end.length) + end;
            }

        };
    }
);

// set up the main playlist builder app

angular.module('YoloAlbum', ['filters'])

.controller('YoloCtrl',

    function($scope, $http, $location) {

    apply = true;
    $scope.searching = false;
    $scope.predicate = '-likes';
    var max_songs = 55;
    var playing = null;

    // start with no search results
    $scope.search_results = [];

    // start with an empty playlist
    $scope.playlist = [];
    
    // set up firebase connection
    var url = "https://username.firebaseio.com/yolo-album";
    var source = new Firebase(url);

    source.on('child_added', function (snapshot) {
        var new_item = snapshot.val();
        new_item.id = snapshot.name();
        $scope.playlist.push(new_item);
        
        // when songs are being added on page load 
        // we need the scope.$apply. but when songs are being
        // added from the user searching for and adding a song,
        // scope.apply is already occurring automagicaly.
        // so in that case, don't call apply()
        if(apply) {
            $scope.$apply();
        }
        else {
            apply = true;
        }
    });

    source.on ('child_removed', function (snapshot) {
        var target = snapshot.name();

        for(var i in $scope.playlist) {
            var item = $scope.playlist[i];

            // remove the item from the local list in $scope.
            if(item.id == target) {
                $scope.playlist.splice(i, 1);
                // since we found it, quit looking
                $scope.$apply();
                break;
            }
        }
    });

    // the only property that can change is 'likes'
    source.on('child_changed', function (snapshot) {
        var target = snapshot.name();
        
        for(var i in $scope.playlist) {

            var item = $scope.playlist[i];

            if(item.id == target) {
                $scope.playlist[i].likes = snapshot.val().likes;
                $scope.$apply();
                break;
            }
        }
    });

    $scope.searching = false;

    $scope.add_song = function($index)
    {
        $scope.search_results[$index].likes = 1;
        // tell the 'child_added' event above not to mess with 
        // applying the scope changes
        apply = false;
        source.push(angular.copy($scope.search_results[$index]));

        $scope.search_results = null;
        $scope.searching = false;
    };

    $scope.like_song = function(id)
    {
        var ref = source.child(id);

        var target = (function(p){for(var i in p){if(p[i].id == id){return p[i];}}})($scope.playlist);
        ref.update({likes: (target.likes+1) });
    };

    $scope.begin_search = function()
    {
        $scope.searching = true;
    };

    $scope.cancel_search = function()
    {
        $scope.searching = false;
        $scope.search_results = [];
    };

    $scope.submit_search = function(song)
    {
        // $scope.song_search_query = 'Taylor Swift';

        var term = $scope.song_search_query;

        $http.jsonp('https://itunes.apple.com/search', {
            params : {
                callback : 'JSON_CALLBACK',
                country : 'US',
                term : term,
                entity : 'song',
                limit : 25
            }
        }).
        success(function(data, status, headers, config) {

            $scope.search_results = data.results;
            $scope.loaded_class = 'loaded';
        });

        // $scope.search_results = sample.results;
    };

    var player_control = function(player) {
        // pause any song which may already be playing
        if(playing != null) {

            // if something else was playing,
            // always pause!
            playing.pause();

            // determine if the song that was playing
            // is the same one they clicked on - this
            // means that we need to return before playing the song agin
            // since they clicked the button to 'pause'.
            if(playing == player) {
                playing = null;
                return;
            }

            playing = null;
        }

        $(player).bind('ended', function() {
            playing = null;
        });

        // always play the song which was clicked.
        player.play();
        playing = player;

    };

    $scope.preview = function(type, track_id) {
        // trackId is used in the #ID of the player (an html audio element)
        // so this is an easy lookup and we don't even need to know the id of the playlist object
        // type is either: playlist or search
        var player = document.getElementById(type + '_preview_' + track_id);
        player_control(player);
    };

    $scope.within_limits = function() {
        return $scope.playlist.length <= max_songs;
    };

});

