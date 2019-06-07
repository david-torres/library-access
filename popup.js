let libraryAccessBtn = document.getElementById('library_access')
let libraryText = document.getElementById('library_count')

libraryAccessBtn.onclick = function (el) {
  chrome.cookies.get(
    { url: 'https://www.keyforgegame.com/', name: 'auth' },
    handleToken
  )
}

function handleToken (cookie) {
  let token = cookie.value
  getUser(token).then(function (user) {
    getLibrary(token, user, 1, 0, []).then(function (library) {
      console.log(library)
      let libraryMin = {}
      library.forEach(deck => {
        libraryMin[deck.id] = deck.name
      })
      console.log(libraryMin)

      chrome.storage.sync.set({ library: libraryMin }, function () {
        console.log('Library saved')
        libraryText.innerHTML = library.length + ' decks accessed'
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

function getLibrary (token, user, page, only_favorites, library) {
  return new Promise((resolve, reject) => {
    fetch(
      'https://www.keyforgegame.com/api/users/' +
        user.id +
        '/decks/?page=' +
        page +
        '&page_size=10&search=&power_level=0,11&chains=0,24&only_favorites=' +
        only_favorites +
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
          getLibrary(token, user, page, only_favorites, library)
            .then(resolve)
            .catch(reject)
        } else {
          resolve(library)
        }
      })
  })
}
