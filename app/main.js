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

      listenForCollectionChanges(uid);


    } else {
      console.log('no user is signed in');
      initState();
      renderEmpty(container);
    }

  });

  function listenForCollectionChanges(uid) {

     db.ref(`user-posts/${state.currentUser.uid}/collections/`).on('value', function(snapshot) {

       state.collections = snapshot.val();
       console.log(state.collections);
       renderCollectionList(state, collectionListContainer)
     });

   }


  function writeUserData(uid, name, email, photo) {
    db.ref('users/' + uid).set({
      username: name,
      email: email,
      photo: photo
    });
  };

  //Is there a way to do this better, rather than having so many parameters
  function writeNewPost(uid, obj) {
    // A post entry.
    var postData = {
      name: obj.name,
      id: obj.id,
      name: obj.name,
      address: obj.address,
      rating: obj.rating,
      location: {
        lat: obj.location.lat,
        lng: obj.location.lng
      }
    };

    db.ref('/user-posts/' + uid + '/collections/' + state.currentCollection.id + '/posts/').push(postData)

  };

  //Create a new Collection
  function writeNewCollection(uid, name) {

    return new Promise(function(resolve,reject){

      // A Collection Entry
      var collectionData = {
        name: name,
        dateCreated: new Date().toString(),
        public: true,
      }

      db.ref('/user-posts/' + uid + '/collections/').push(collectionData).once("value")
        .then(function(snapshot) {
          state.currentCollection.id = snapshot.key
          state.currentCollection.data = snapshot.val()
          resolve();
        });

    });

  };


  var placeKey = 'AIzaSyCnc3YBPzVZ5U_oFHiTY1KWKIzDvrGuOKo'
  var placeRequest = 'https://crossorigin.me/https://maps.googleapis.com/maps/api/place/textsearch/json?query='


  function runSearch(query) {

    return new Promise(function(resolve,reject){

      fetch(placeRequest + query + '&key=' + placeKey).then(function(response){
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

          if (obj.photos !== undefined) {
            place.photo = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photoreference=${obj.photos[0].photo_reference}&key=${placeKey}`
          } else{
            place.photo = 'http://i.giphy.com/xT5LMN7rhj8hHdwTqE.gif'
          }

          return place;

        });

        state.search.items = resultItems
        resolve();

      }).catch(function(err){
        console.log(err);
        throw err;
        reject();
      });

    });
  }




  var container = document.querySelector('#container')
  var searchContainer = document.querySelector('.search-results')
  var collectionListContainer = document.querySelector('.collection-list')
  var state;

  function initState() {
    state = {
      currentUser: null,
      currentCollection: {
        id: "",
        data: {}
      },
      collections: {},
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
  function renderSearchResults(data, into){

    var places = data.map(function(item){
      return `
      <div class="mdl-card mdl-cell mdl-cell--4-col mdl-cell--4-col-tablet mdl-shadow--2dp place-card" data-id="${item.id}">
        <div class="mdl-card__media">
          <img src="${item.photo}" alt="" />
        </div>

        <div class="mdl-card__title image-card">
          <h1 class="mdl-card__title-text">${item.name}</h1>
        </div>

        <div class="mdl-card__supporting-text">
          <p>${item.address}</p>
          <p>${item.rating}</p>
        </div>
        <div class="mdl-card__actions">
          <a href="#" class="mdl-button add-place">Add to Collection</a>
        </div>
      </div>
      `
    });

    into.innerHTML = `
    <div class="mdl-cell mdl-cell--12-col search-title">
      <h2>You searched for</h2>
    </div>
    ${places.join('')}
    `
}

//Render Template for Collection List
function renderCollectionList(state, into){

  var collections = Object.keys(state.collections).map(function(key){
    return `
    <div class="mdl-card mdl-cell mdl-cell--3-col mdl-cell--4-col-tablet mdl-shadow--2dp collection-card" data-id="${key}">
      <div class="mdl-card__title mdl-card--expand">
        <h4>${state.collections[key].name}</h4>
      </div>

      <div class="mdl-card__actions mdl-card--border">
        <a href="#" class="mdl-button view-collection">View Collection</a>
      </div>
    </div>
    `
  });

  into.innerHTML = `
  <div class="mdl-cell mdl-cell--12-col collections-title">
    <h2>Collections</h2>
  </div>
  ${collections.join('')}
  `

}

  // Create Collection
  delegate('body', 'click', 'a.create-collection', function(event){

    // Get user input value for collection name
    var collectionField = document.querySelector('#collection-name')
    var collectionName = collectionField.value;

    //Clear field after input
    collectionField.value = ''
    closest(collectionField, '.mdl-textfield').MaterialTextfield.checkDirty()

    //Create new collection in Firebase
    writeNewCollection(state.currentUser.uid, collectionName).then(function() {
      console.log(state.currentCollection);
    });

  });

  // Google Places Search
  delegate('body', 'click', 'a.search-places', function(event){

    // Get user input value for collection name
    var searchField = document.querySelector('#search-field')
    var searchValue = searchField.value;

    //Clear field after input
    searchField.value = ''
    closest(searchField, '.mdl-textfield').MaterialTextfield.checkDirty()

    //Run Google Places Search
    runSearch(searchValue).then(function(){
      console.log(state.search.items);
      renderSearchResults(state.search.items, searchContainer);
    });

  });

  // Add Item to Collection
  delegate('body', 'click', 'a.add-place', function(event){

    var key = getKeyFromClosestElement(event.delegateTarget)

    var activeSearch = state.search.items

    var match = activeSearch.filter(function(search) {
        return search.id === key;
    })[0];

    console.log(match);

    writeNewPost(state.currentUser.uid, match )

  });

  // Add Item to Collection
  delegate('body', 'click', 'a.view-collection', function(event){

    console.log(event.delegateTarget);

    var key = getKeyFromClosestElement(event.delegateTarget)

    state.currentCollection.id = key
    state.currentCollection.data = state.collections[key]
    console.log(state.currentCollection);


  });





  function getKeyFromClosestElement(element) {

    // Search for the closest parent that has an attribute `data-id`
    let closestItemWithId = closest(event.delegateTarget, '[data-id]')

    if (!closestItemWithId) {
      throw new Error('Unable to find element with expected data key');
    }

    // Extract and return that attribute
    return closestItemWithId.getAttribute('data-id');
  }





})()
