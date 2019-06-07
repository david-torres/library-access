let libraryAccessBtn = document.getElementById('access-master-vault')
let libraryOnlyFavorites = document.getElementById('only-favorites')
let syncDokBtn = document.getElementById('sync-dok')
let libraryText = document.getElementById('library-access')
let dokText = document.getElementById('dok-sync')

loadLibrary().then(function (library) {
  console.log('loaded library', library)
  if (!library || Object.keys(library).length == 0) {
    libraryText.innerHTML = 'No decks accessed from Master Vault'
  } else {
    libraryText.innerHTML = Object.keys(library).length + ' decks accessed from Master Vault'
  }
})

libraryAccessBtn.onclick = function (el) {
  chrome.cookies.get(
    { url: 'https://www.keyforgegame.com/', name: 'auth' },
    handleToken
  )
}

syncDokBtn.onclick = function (el) {
  loadLibrary().then(function (library) {
    console.log('loaded library', library)
    if (!library || Object.keys(library).length == 0) {
      alert('No decks accessed from Master Vault. Click "Access Master Vault" first.')
    } else {
      alert('Implement this')
    }
  })
}

function handleToken (cookie) {
  let token = cookie.value
  let onlyFavorites = libraryOnlyFavorites.checked ? 1 : 0
  getUser(token).then(function (user) {
    getLibrary(token, user, 1, onlyFavorites, []).then(function (library) {
      console.log(library)
      let libraryMin = {}
      library.forEach(deck => {
        libraryMin[deck.id] = deck.name
      })

      chrome.storage.sync.set({ library: libraryMin }, function () {
        console.log('Library saved')
        libraryText.innerHTML = library.length + ' decks accessed from Master Vault'
      })
    })
  })
}

function getUser (token) {
  return fetch('https://www.keyforgegame.com/api/users/self/', {
    credentials: 'include',
    headers: {
      accept: 'application/json',
      'accept-language': 'en-us',
      authorization: 'Token ' + token,
      'x-authorization': 'Token ' + token
    }
  })
    .then(function (response) {
      return response.json()
    })
    .then(function (user) {
      return user.data
    })
}

function loadLibrary () {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['library'], function (result) {
      resolve(result.library)
    })
  })
}

function getLibrary (token, user, page, onlyFavorites, library) {
  return new Promise((resolve, reject) => {
    fetch(
      'https://www.keyforgegame.com/api/users/' +
        user.id +
        '/decks/?page=' +
        page +
        '&page_size=10&search=&power_level=0,11&chains=0,24&only_favorites=' +
        onlyFavorites +
        '&ordering=-date',
      {
        credentials: 'include',
        headers: {
          accept: 'application/json',
          'accept-language': 'en-us',
          authorization: 'Token ' + token,
          'x-authorization': 'Token ' + token
        },
        method: 'GET'
      }
    )
      .then(function (response) {
        return response.json()
      })
      .then(function (response) {
        library = library.concat(response.data)

        if (library.length != response.count) {
          page = page + 1
          getLibrary(token, user, page, onlyFavorites, library)
            .then(resolve)
            .catch(reject)
        } else {
          resolve(library)
        }
      })
  })
}
