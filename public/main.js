/**
 * Project 3: SPA
 * ====
 *
 * See the README.md for instructions
 */

(function() {

  // Initialize Firebase
  var config = {
    apiKey: "AIzaSyBMBYKG0aCHQlax3whjsBDydZeHkB65sLk",
    authDomain: "lithe-paratext-137501.firebaseapp.com",
    databaseURL: "https://lithe-paratext-137501.firebaseio.com",
    storageBucket: "lithe-paratext-137501.appspot.com",
  };
  firebase.initializeApp(config);

  //Firebase Database
  var db = firebase.database();

  // User Account Setup


  function authSignIn() {
    var provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch(function(error) {
        throw error;
    });
  };

  // TODO: change delegate to header container
  delegate('body', 'click', '.sign-in', function(event){
    authSignIn();
  });

  function authSignOut () {
    firebase.auth().signOut().then(function() {
      console.log('signed out');
    }, function(error) {
      throw error;
    });
  };

  // TODO: change delegate to header container
  delegate('body', 'click', '.sign-out', function(event){
    authSignOut();
  });

  firebase.auth().onAuthStateChanged(function(user) {

    var user = firebase.auth().currentUser;
    state.currentUser = user

    var name, email, photoUrl, uid;

    if (user != null) {
      name = user.displayName;
      email = user.email;
      photoUrl = user.photoURL;
      uid = user.uid;

      console.log(name, email, photoUrl, 'signed in');
      console.log(uid);

      writeUserData(uid, name, email, photoUrl);

    } else {
      console.log('no user is signed in');
      initState();
      renderEmpty(container);
    }

  });




  function writeUserData(uid, name, email, photo) {
    db.ref('users/' + uid).set({
      username: name,
      email: email,
      photo: photo
    });
  };

  function writeNewPost(uid, id, name, address, rating, lat, lng ) {

    // A post entry.
    var postData = {
      id: id,
      name: name,
      address: address,
      rating: rating,
      location: {
        lat: lat,
        lng: lng
      }

    };

    db.ref('/user-posts/' + uid + '/').push(postData);

  };

  var placeKey = 'AIzaSyCnc3YBPzVZ5U_oFHiTY1KWKIzDvrGuOKo'

  var placeQuery = 'Pizza in Sydney'

  var placeRequest = 'https://crossorigin.me/https://maps.googleapis.com/maps/api/place/textsearch/json?query=' + placeQuery + '&key=' + placeKey


  fetch(placeRequest).then(function(response) {
    return response.json();
  }).then(function(json) {
    results = json.results;

    //Format response with necessary data
    var resultItems = results.map(function(obj){
      var place = {
        location: {}
      };

      place.id = obj.id
      place.name = obj.name
      place.address = obj.formatted_address
      place.rating = obj.rating
      place.location.lng = obj.geometry.location.lng
      place.location.lat = obj.geometry.location.lat

      return place;

    });

    state.search.items = resultItems

    // renderSearchResults(state.search.items, container);

  }).catch(function(err){
    throw err;
  });

  var container = document.querySelector('#container')
  var state;

  function initState() {
    state = {
      currentUser: null,
      search: {}
    };
  }

  initState();

  function renderEmpty(into) {
    into.innerHTML = `
      <section class="empty-state">
        <h1>Please sign in</h1>
      </section>
    `
  }

  //Render Template for Search Results
  function renderSearchResults(data, into) {

    var places = data.map(function(item){
      return `
      <article class="article" data-id="${item.id}">
        <section class="article-content">
          <a href="#"><h3>${item.name}</h3></a>
          <h6>${item.address}</h6>
        </section>
        <section class="impressions">
          ${item.rating}
        </section>
        <div class="clearfix"></div>
      </article>
      `
    });

    into.innerHTML = `
    <section id="main" class="wrapper">
    ${places.join('')}
    </section>
    `
}

})()
