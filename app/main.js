/**
 * Trip Plannr
 * ====
 *
 *
 */

(function() {

  // Google API
  var placeKey = 'AIzaSyCnc3YBPzVZ5U_oFHiTY1KWKIzDvrGuOKo'
  var placeRequest = 'https://crossorigin.me/https://maps.googleapis.com/maps/api/place/textsearch/json?query='

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

  // Google Sign In
  function authSignIn() {
    var provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch(function(error) {
        throw error;
    });
  };

  //Sign In
  delegate('body', 'click', '.sign-in', function(event){
    authSignIn();
  });

  //Google Sign Out
  function authSignOut () {
    firebase.auth().signOut().then(function() {
      console.log('No user is signed in');
    }, function(error) {
      throw error;
    });
  };

  //Sign Out
  delegate('body', 'click', '.sign-out', function(event){
    authSignOut();
  });


  //Watch for user state change
  firebase.auth().onAuthStateChanged(function(user) {

    var user = firebase.auth().currentUser;
    state.currentUser = user

    var name, email, photoUrl, uid;

    if (user != null) {

      state.loading = true;
      renderLoading(container)

      name = user.displayName;
      email = user.email;
      photoUrl = user.photoURL;
      uid = user.uid;

      console.log(name, email, photoUrl, 'signed in');
      console.log(uid);

      writeUserData(uid, name, email, photoUrl);

      //Get all the juice for a user from FireBase
      listenForCollectionChanges(uid).then(function(){
        renderInitialLoad(state, container)
      });


    } else {
      console.log('no user is signed in');
      initState();
      renderInitialLoad(state, container)
    }

  });


  // Listen for changes to a user's info in Firebase
  function listenForCollectionChanges(uid) {

    state.loading = true;

    return new Promise(function(resolve,reject){

      db.ref(`user-posts/${state.currentUser.uid}/`).on('value', function(snapshot) {

        var exists = snapshot.exists();

        if (exists){

          state.collections = snapshot.child("collections").val();
        } else {
          state.collections = null;
        }

        resolve();

      });

    });

   }

   //Add user-info to firebase DB
  function writeUserData(uid, name, email, photo) {
    db.ref('users/' + uid).set({
      username: name,
      email: email,
      photo: photo
    });
  };

  // Add place to firebase DB
  function writeNewPost(uid, obj) {

    return new Promise(function(resolve,reject){
      // A post entry.
      var postData = {
        name: obj.name,
        id: obj.id,
        name: obj.name,
        photo: obj.photo,
        address: obj.address,
        location: {
          lat: obj.location.lat,
          lng: obj.location.lng
        }
      };

      db.ref('/user-posts/' + uid + '/collections/' + state.currentCollection.id + '/posts/').push(postData).once("value")
        .then(function(snapshot) {

          db.ref('/user-posts/' + uid + '/collections/' + state.currentCollection.id).once("value").then(function(snapshot){

            state.currentCollection.id = snapshot.key
            state.currentCollection.data = snapshot.val()
            resolve();

          })
        });
    });

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


  // Run a text search query on Google Places
  function runSearch(query) {

    return new Promise(function(resolve,reject){

      fetch(placeRequest + query + '&key=' + placeKey).then(function(response){
        return response.json();
      }).then(function(json) {
        results = json.results;
        console.log(results);

        //Format response with necessary data
        var resultItems = results.map(function(obj){
          var place = {
            location: {}
          };

          place.id = obj.id
          place.name = obj.name
          place.address = obj.formatted_address
          place.location.lng = obj.geometry.location.lng
          place.location.lat = obj.geometry.location.lat

          if (obj.website !== undefined) {
            place.website = obj.website
          }

          if (obj.photos !== undefined) {
            place.photo = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photoreference=${obj.photos[0].photo_reference}&key=${placeKey}`
          } else{
            place.photo = '/placeholder.jpg'
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




  var container = document.querySelector('.container')
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


  // Render Template or logged out user
  function renderLoggedOut(into) {
    return `
    <section class="section--center mdl-grid mdl-grid--no-spacing ">
      <div class="demo-card-wide mdl-card mdl-shadow--2dp">
        <div class="mdl-card__title">
          <h2 class="mdl-card__title-text">Welcome to Trip Plannr</h2>
        </div>
        <div class="mdl-card__supporting-text">
          Trip Plannr is a helpful trip planner. Add places that you want to go to a collection, share with friends and plan your next big adventure.
        </div>
        <div class="mdl-card__actions mdl-card--border">
          <a class="mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect sign-in">
            Login with Google
          </a>
        </div>
      </div>
    </section>
    `
    componentHandler.upgradeDom();
  }




  //Render Template for Search Results
  function renderSearchResults(state, into){

    var places = state.search.items.map(function(item){
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
        </div>
        <div class="mdl-card__actions">
          <a href="#" class="mdl-button add-place">Add to Collection</a>
        </div>
      </div>
      `
    });

    into.innerHTML = `
    <div class="mdl-layout mdl-js-layout mdl-layout--fixed-header mdl-layout--fixed-drawer">

      <header class="mdl-layout__header">
        <div class="mdl-layout__header-row">
            <button class="mdl-button mdl-js-button mdl-button--icon back-home">
              <i class="material-icons">arrow_back</i>
            </button>
          <div class="mdl-layout-spacer"></div>
            ${state.currentUser ? renderSignOut() : "" }
        </div>
      </header>

      <div class="mdl-layout__drawer">
        <span class="mdl-layout-title">${state.currentCollection.data.name}</span>
        <nav class="mdl-navigation">
         ${renderAddedPlaces(state)}
        </nav>
      </div>
      <main class="mdl-layout__content" id="overview">
        <section class="mdl-grid search-results">
          <div class="mdl-cell mdl-cell--12-col search-title">
            <h2>You searched for</h2>
          </div>
          ${places.join('')}
        </section>
      </main>
    </div>
    `

    componentHandler.upgradeDom();
}






//Render Template for Collection List
function renderCollectionList(state){

  if (state.collections !== null) {
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
  } else {
    var message = `
    <h4>You don't have any collections. Add a collection by pressing the + button.</h4>
    `
  }

  return `
  <section class="mdl-grid collection-list">
  <div class="mdl-cell mdl-cell--12-col collections-title">
    <h2>Collections</h2>
  </div>
  ${collections ? collections.join('') : message}
  </section>
  `

}



function renderCollectionView(state, into) {

  into.innerHTML = `
  <div class="mdl-layout mdl-js-layout mdl-layout--fixed-header mdl-layout--fixed-drawer">

    <header class="mdl-layout__header">
      <div class="mdl-layout__header-row">
          <button class="mdl-button mdl-js-button mdl-button--icon back-home">
            <i class="material-icons">arrow_back</i>
          </button>
        <div class="mdl-layout-spacer"></div>
          ${state.currentUser ? renderSignOut() : "" }
      </div>
    </header>

    <div class="mdl-layout__drawer">
      <span class="mdl-layout-title">${state.currentCollection.data.name}</span>
      <nav class="mdl-navigation">
       ${renderAddedPlaces(state)}
      </nav>
    </div>
    <main class="mdl-layout__content" id="overview">
    ${renderSearchArea(state)}
    </main>
  </div>
  `
  componentHandler.upgradeDom();

}

 function renderSearchArea(state){

   return `
   <section class="section--center mdl-grid mdl-grid--no-spacing">
     <div class="demo-card-wide mdl-card mdl-shadow--2dp">
       <div class="mdl-card__title">
         <h2 class="mdl-card__title-text">Search for a place</h2>
       </div>
       <div class="mdl-card__supporting-text">
       <span class="helper-text">Search by a place or activity in a location. For example Pizza in Sydney.</span>
         <form id="search-form" action="#">
           <div class="mdl-textfield mdl-js-textfield">
             <input class="mdl-textfield__input" type="text" id="search-field">
             <label class="mdl-textfield__label" for="search-field">What would you like to search for?</label>
           </div>
         </form>
       </div>
       <div class="mdl-card__actions">
         <a href="#" class="mdl-button search-places">Search</a>
       </div>
     </div>
   </section>
   `
   componentHandler.upgradeDom();
 }


// Render a users added places in the drawer
 function renderAddedPlaces(state){

   if (state.currentCollection.data.posts !== undefined) {
     return `
       ${Object.keys(state.currentCollection.data.posts).map(function(key){
         return `
         <div class="mdl-card mdl-shadow--2dp mdl-card--horizontal" data-id="${key}">
           <div class="mdl-card__media">
             <img src="${state.currentCollection.data.posts[key].photo}" alt="img">
           </div>
           <div class="mdl-card__title">
             <h2 class="mdl-card__title-text">${state.currentCollection.data.posts[key].name}</h2>
           </div>
           <div class="mdl-card__supporting-text">${state.currentCollection.data.posts[key].address}</div>
           <button class="mdl-button mdl-js-button mdl-button--icon mdl-button--colored delete">
            <i class="material-icons">delete</i>
          </button>
         </div>
         `
       }).join('')}
     `
   }else {
     return`
     <div class="mdl-card__supporting-text">
      Your collection is currently empty. Start by searching for a place and adding it your collection.
    </div>
     `

   }

   componentHandler.upgradeDom();
 }

 //Render the intial view
 function renderInitialLoad(state,into){

   into.innerHTML = `

   <div class="mdl-layout mdl-js-layout mdl-layout--fixed-header">

     <header class="mdl-layout__header mdl-layout__header--scroll mdl-color--primary">
       <div class="mdl-layout__header-row">
         <div class="mdl-layout-spacer">
         </div>
         ${state.currentUser ? renderSignOut() : "" }
       </div>
       <div class="mdl-layout__header-row">
         <h3>Trip Plannr</h3>
       </div>
       <div class="mdl-layout__header-row button-container">
        ${state.currentUser ? renderAddButton() : "" }
       </div>
     </header>

     <main class="mdl-layout__content" id="overview">
      ${state.currentUser ? renderCollectionList(state) : renderLoggedOut()}
     </main>

   </div>

   <div class="modal-container">
    ${state.currentUser ? renderModal() : "" }
   </div>

   `
   componentHandler.upgradeDom();

 }

// Render the add a colleciton button
 function renderAddButton() {
   return`
   <button class="mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect mdl-button--colored mdl-shadow--4dp mdl-color--accent" id="add">
     <i class="material-icons" role="presentation">add</i>
     <span class="visuallyhidden">Add</span>
   </button>
   `
 }

 // Render the sign out button
 function renderSignOut(){
   return`
   <button class="mdl-button mdl-js-button sign-out">Sign Out</button>
   `
 }

// Render the loading spinner
function renderLoading(into){

  into.innerHTML = `
  <div class="mdl-spinner is-active mdl-js-spinner"></div>
  `

  componentHandler.upgradeDom();
}

// Render the add collection modal
function renderModal() {
  return `
  <!-- New Collection Modal -->
  <div class="add-collection-modal">
    <div class="demo-card-wide mdl-card mdl-shadow--2dp">
      <div class="mdl-card__title">
        <h2 class="mdl-card__title-text">Give your Collection a name</h2>
      </div>
      <div class="mdl-card__supporting-text">
        <span class="helper-text">Maybe your planning a holiday, or a romantic date night.</span>
        <form id="new-collection" action="#">
          <div class="mdl-textfield mdl-js-textfield">
            <input class="mdl-textfield__input" type="text" id="collection-name">
            <label class="mdl-textfield__label" for="collection-name">Enter a name</label>
          </div>
        </form>
      </div>
      <div class="mdl-card__actions">
        <a href="#" class="mdl-button create-collection">Create Collection</a>
      </div>
    </div>
    <button class="mdl-button mdl-js-button mdl-button--icon mdl-button--colored close-modal">
      <i class="material-icons">close</i>
    </button>
  </div>
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
      renderCollectionView(state, container);
      modalClose();


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
      renderSearchResults(state, container);
    });

  });

  // Add Item to Collection
  delegate('body', 'click', 'a.add-place', function(event){

    var key = getKeyFromClosestElement(event.delegateTarget)

    var activeSearch = state.search.items

    var match = activeSearch.filter(function(search) {
        return search.id === key;
    })[0];

    writeNewPost(state.currentUser.uid, match).then(function(){

      renderCollectionView(state, container);

    });
  });

  // View a collection
  delegate('body', 'click', 'a.view-collection', function(event){

    var key = getKeyFromClosestElement(event.delegateTarget)

    state.currentCollection.id = key
    state.currentCollection.data = state.collections[key]

    renderCollectionView(state, container);

  });

  // Delete Item from Collection
  delegate('body', 'click', '.delete', function(event){

    var key = getKeyFromClosestElement(event.delegateTarget)

    // Remove the post from the local state currentCollection
    delete state.currentCollection.data.posts[key]

    // Remove the post from firebase
    db.ref('/user-posts/' + state.currentUser.uid + '/collections/' + state.currentCollection.id + '/posts/' + key + '/').remove().then(function(){

      renderCollectionView(state, container);

    });

  });

  // Toggle Add Collection modal
  delegate('body', 'click', '#add', function(event){

    document.body.classList.add('modal-open');

  });

  // Close Collection modal
  delegate('body', 'click', '.close-modal', function(event){
    modalClose();
  });

  // Return back to inital view
  delegate('body', 'click', '.back-home', function(event){
    renderInitialLoad(state, container)
  });

  // Close Modal on trigger
  function modalClose() {
    if (document.body.classList.contains('modal-open')) {
      document.body.classList.remove('modal-open')
      return
    }else {
      return
    }
  }

  //Utility function to get closest Data ID
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
