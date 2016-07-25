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

    renderInitialLoad(state, mdlContainer)

    var name, email, photoUrl, uid;

    if (user != null) {

      name = user.displayName;
      email = user.email;
      photoUrl = user.photoURL;
      uid = user.uid;

      console.log(name, email, photoUrl, 'signed in');
      console.log(uid);

      writeUserData(uid, name, email, photoUrl);

      //Setup listener on user-posts firebase DB
      listenForCollectionChanges(uid).then(function(){

        renderCollectionList(state, document.querySelector('#overview'))
        renderModal(modalContainer)

      });


    } else {
      console.log('no user is signed in');
      initState();
      renderLoggedOut(document.querySelector('#overview'));
    }

  });

  function listenForCollectionChanges(uid) {

    return new Promise(function(resolve,reject){

      db.ref(`user-posts/${state.currentUser.uid}/`).on('value', function(snapshot) {

        var exists = snapshot.exists();

        if (exists){

          state.collections = snapshot.child("collections").val();
          console.log(state.collections);
          console.log(state);

        } else {
          console.error('user doesnt have any collections');
          state.collections = null;
        }

        resolve();

      });

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

            console.log(snapshot.val());
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


  var placeKey = 'AIzaSyCnc3YBPzVZ5U_oFHiTY1KWKIzDvrGuOKo'
  var placeRequest = 'https://crossorigin.me/https://maps.googleapis.com/maps/api/place/textsearch/json?query='


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
  var mdlContainer = document.querySelector('.mdl-layout')
  var modalContainer = document.querySelector('.modal-container')
  var mainContentArea = document.querySelector('#overview')
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
    into.innerHTML = `
    <section class="section--center mdl-grid mdl-grid--no-spacing ">
      <div class="demo-card-wide mdl-card mdl-shadow--2dp">
        <div class="mdl-card__title">
          <h2 class="mdl-card__title-text">Welcome to Trip Plannr</h2>
        </div>
        <div class="mdl-card__supporting-text">
          Trip Plannr is a helpful trip planner. Add places that you want to go to a collection, share with friends and never forget.
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
  function renderSearchResults(data, into){

    console.log('rendering search results');

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
    <section class="mdl-grid search-results">
      <div class="mdl-cell mdl-cell--12-col search-title">
        <h2>You searched for</h2>
      </div>
      ${places.join('')}
    </section>
    `
}






//Render Template for Collection List
function renderCollectionList(state, into){

  console.log('rendering collections');

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

  into.innerHTML = `
  <section class="mdl-grid collection-list">
  <div class="mdl-cell mdl-cell--12-col collections-title">
    <h2>Collections</h2>
  </div>
  ${collections ? collections.join('') : message}
  </section>
  `

}



function renderCollectionView(state, into) {

  console.log('rendering collection view');

  into.classList.add('mdl-layout', 'mdl-layout--fixed-drawer', 'mdl-layout', 'mdl-layout--fixed-header');

  into.innerHTML = `
  <header class="mdl-layout__header">
    <div class="mdl-layout__header-row">
        <button class="mdl-button mdl-js-button mdl-button--icon back-home">
          <i class="material-icons">arrow_back</i>
        </button>
      <div class="mdl-layout-spacer"></div>
      <button class="mdl-button mdl-js-button sign-out">
        Sign Out
      </button>
    </div>
  </header>

  <div class="mdl-layout__drawer">
    <span class="mdl-layout-title">${state.data.name}</span>
    <nav class="mdl-navigation">
     ${renderAddedPlaces(state)}
    </nav>
  </div>
  <main class="mdl-layout__content" id="overview">
  ${renderSearchArea(state)}
  </main>
  `

  componentHandler.upgradeDom();

 }

 function renderSearchArea(state){

   console.log('rendering search area');

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

 function renderAddedPlaces(state){
   console.log('rendering added places');

   console.log(state.data.posts);

   if (state.data.posts !== undefined) {
     return `
       ${Object.keys(state.data.posts).map(function(key){
         return `
         <div class="mdl-card mdl-shadow--2dp mdl-card--horizontal">
           <div class="mdl-card__media">
             <img src="${state.data.posts[key].photo}" alt="img">
           </div>
             <div class="mdl-card__title">
               <h2 class="mdl-card__title-text">${state.data.posts[key].name}</h2>
             </div>
             <div class="mdl-card__supporting-text">${state.data.posts[key].address}</div>
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

 function renderInitialLoad(state,into){

   console.log("header rendering");
   console.log(state.currentUser);

   if (into.classList.contains('mdl-layout--fixed-drawer')){
     into.classList.remove('mdl-layout--fixed-drawer');
   }

   into.innerHTML = `
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



   </main>

   `

 }


 function renderAddButton() {
   return`
   <button class="mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect mdl-button--colored mdl-shadow--4dp mdl-color--accent" id="add">
     <i class="material-icons" role="presentation">add</i>
     <span class="visuallyhidden">Add</span>
   </button>
   `
 }

 function renderSignOut(){
   return`
   <button class="mdl-button mdl-js-button sign-out">Sign Out</button>
   `
 }

function renderLoading(){

  var spinner = document.querySelector('.mdl-spinner')

  if (state.loading == true){
    spinner.classList.toggle('is-active')
  }else {
    spinner.classList.toggle('is-active')
  }

}

function renderModal(into) {
  into.innerHTML = `
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
      renderCollectionView(state.currentCollection, mdlContainer);
      modalClose();


    });

  });




  // Google Places Search
  delegate('body', 'click', 'a.search-places', function(event){

    // TODO: This is wrong. How do I seperate this from the DOM. that container it gets inserted into is dynamically generated.
    var mainContentArea = document.querySelector('#overview')

    // Get user input value for collection name
    var searchField = document.querySelector('#search-field')
    var searchValue = searchField.value;

    //Clear field after input
    searchField.value = ''
    closest(searchField, '.mdl-textfield').MaterialTextfield.checkDirty()

    //Run Google Places Search
    runSearch(searchValue).then(function(){
      console.log(state.search.items);
      renderSearchResults(state.search.items, mainContentArea);
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

    writeNewPost(state.currentUser.uid, match).then(function(){

      renderCollectionView(state.currentCollection, mdlContainer);

    });


  });





  // Add Item to Collection
  delegate('body', 'click', 'a.view-collection', function(event){

    console.log(event.delegateTarget);

    var key = getKeyFromClosestElement(event.delegateTarget)

    state.currentCollection.id = key
    state.currentCollection.data = state.collections[key]

    console.log(state.currentCollection);
    console.log(state);

    renderCollectionView(state.currentCollection, mdlContainer)

  });





  // Toggle Add Collection modal
  delegate('body', 'click', '#add', function(event){

    console.log(event.delegateTarget);
    document.body.classList.add('modal-open');

  });




  // Toggle Add Collection modal
  delegate('body', 'click', '.close-modal', function(event){
    console.log(event.delegateTarget);
    modalClose();
  });


  // Return back to inital view
  delegate('body', 'click', '.back-home', function(event){

    console.log(event.delegateTarget);
    renderInitialLoad(state, mdlContainer)
    renderCollectionList(state, document.querySelector('#overview'))


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
