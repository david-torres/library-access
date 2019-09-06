let masterVaultSection = document.getElementById('master-vault-section')
let libraryAccessBtn = document.getElementById('access-master-vault')
let libraryOnlyFavorites = document.getElementById('only-favorites')
let libraryText = document.getElementById('library-status')
let dokSection = document.getElementById('dok-section')
let syncDokBtn = document.getElementById('sync-dok')
let crucibleSection = document.getElementById('crucible-section')
let syncCrucibleBtn = document.getElementById('sync-crucible')

const loading = (isLoading) => {
  if (isLoading) {
    libraryText.innerHTML = 'Loading'
    libraryText.classList.add('loading')
  } else {
    libraryText.innerHTML = 'Done'
    libraryText.classList.remove('loading')
  }
}

const handleMasterVaultSync = (cookie) => {
  if (!cookie) {
    alert('You must login to Master Vault first')
    loading(false)
    return
  }

  let token = cookie.value
  let onlyFavorites = libraryOnlyFavorites.checked ? 1 : 0

  getMasterVaultUser(token).then((user) => getMasterVaultLibrary(token, user, 1, onlyFavorites, []).then((library) => {
    let libraryMin = []
    library.forEach(deck => {
      libraryMin.push(deck.id)
    })

    chrome.runtime.sendMessage({
      popupQuery: 'saveLibrary',
      library: libraryMin
    }, () => {
        loading(false)

        libraryText.innerHTML =
          library.length + ' decks accessed from Master Vault'
    })

  }))
}

const handleDokSync = (token) => loadLibrary().then((library) => {
  if (!token) {
    alert('You must login to Decks of KeyForge first')
    loading(false)
    return
  }

  if (!library || library.length == 0) {
    alert(
      'No decks accessed from Master Vault. Click "Access Master Vault" first.'
    )
    loading(false)
    return
  } else {
    getDokUser(token).then((user) => getDokLibrary(token, user, 0, [])).then((dokLibrary) => {
      dokLibraryMin = []
      dokLibrary.forEach(deck => {
        dokLibraryMin.push(deck.keyforgeId)
      })

      let imported = 0
      library.forEach(deckId => {
        if (!dokLibraryMin.includes(deckId)) {
          importDeckDok(token, deckId)
          imported = imported + 1
        }
      })

      loading(false)
      libraryText.innerHTML = "Synced " + imported + " decks"
    })
  }
})

const handleCrucibleSync = (user) => loadLibrary().then((library) => {
  if (!user) {
    alert('You must login to The Crucible Online first')
    loading(false)
    return
  }

  user = JSON.parse(user)

  if (!library || library.length == 0) {
    alert(
      'No decks accessed from Master Vault. Click "Access Master Vault" first.'
    )
    loading(false)
    return
  } else {
    fetch("https://www.thecrucible.online/api/account/token", {
        "credentials": "include",
        "headers": {
          "accept": "*/*",
          "accept-language": "en-US,en;q=0.9,da;q=0.8",
          "cache-control": "no-cache",
          "content-type": "application/json",
          "pragma": "no-cache",
          "x-requested-with": "XMLHttpRequest"
        },
        "referrer": "https://www.thecrucible.online/decks",
        "referrerPolicy": "no-referrer-when-downgrade",
        "body": JSON.stringify({
          'token': user
        }),
        "method": "POST",
        "mode": "cors"
      })
      .then((response) => response.json())
      .then((response) => {
        let token = response.token
        getCrucibleLibrary(token, user).then((crucibleLibrary) => {
          crucibleLibraryMin = []
          crucibleLibrary.forEach(deck => {
            crucibleLibraryMin.push(deck.uuid)
          })

          let imported = 0
          library.forEach(deckId => {
            if (!crucibleLibraryMin.includes(deckId)) {
              importDeckCrucible(token, deckId)
              imported = imported + 1
            }
          })

          loading(false)
          libraryText.innerHTML = "Synced " + imported + " decks"
        })
      })
  }
})

const getMasterVaultUser = (token) => fetch('https://www.keyforgegame.com/api/users/self/', {
    credentials: 'include',
    headers: {
      accept: 'application/json',
      'accept-language': 'en-us',
      authorization: 'Token ' + token,
      'x-authorization': 'Token ' + token
    }
  })
  .then((response) => response.json())
  .then((user) => user.data)

const getDokUser = (token) => fetch('https://decksofkeyforge.com/api/users/secured/your-user', {
    credentials: 'include',
    headers: {
      accept: 'application/json',
      'accept-language': 'en-us',
      authorization: token,
      'x-authorization': token
    }
  })
  .then((response) => response.json())

const loadLibrary = () => new Promise((resolve, reject) => {
  chrome.runtime.sendMessage({
    popupQuery: 'fetchLibrary'
  }, (library) => {
    resolve(library)
  })
})

const getMasterVaultLibrary = (token, user, page, onlyFavorites, library) => new Promise((resolve, reject) => {
  fetch(
      'https://www.keyforgegame.com/api/users/' +
      user.id +
      '/decks/?page=' +
      page +
      '&page_size=10&search=&power_level=0,11&chains=0,24&only_favorites=' +
      onlyFavorites +
      '&ordering=-date', {
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
    .then((response) => response.json())
    .then((response) => {
      library = library.concat(response.data)

      if (library.length != response.count) {
        page = page + 1
        getMasterVaultLibrary(token, user, page, onlyFavorites, library)
          .then(resolve)
          .catch(reject)
      } else {
        resolve(library)
      }
    })
})

const getDokLibrary = (token, user, page, library) => new Promise((resolve, reject) => {
  let body = JSON.stringify({
    "houses": [],
    "page": page,
    "constraints": [],
    "expansions": [],
    "pageSize": 20,
    "title": "",
    "sort": "SAS_RATING",
    "forSale": false,
    "notForSale": false,
    "forTrade": false,
    "forAuction": false,
    "withOwners": false,
    "completedAuctions": false,
    "includeUnregistered": true,
    "myFavorites": false,
    "cards": [],
    "sortDirection": "DESC",
    "owner": user.username
  })

  fetch("https://decksofkeyforge.com/api/decks/filter", {
      "credentials": "include",
      "headers": {
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9,da;q=0.8",
        "authorization": token,
        "cache-control": "no-cache",
        "content-type": "application/json;charset=UTF-8",
        "pragma": "no-cache",
        "timezone": "-240"
      },
      "body": body,
      "method": "POST",
    })
    .then((response) => response.json())
    .then((response) => {
      library = library.concat(response.decks)

      fetch("https://decksofkeyforge.com/api/decks/filter-count", {
          "credentials": "include",
          "headers": {
            "accept": "application/json, text/plain, */*",
            "accept-language": "en-US,en;q=0.9,da;q=0.8",
            "authorization": token,
            "cache-control": "no-cache",
            "content-type": "application/json;charset=UTF-8",
            "pragma": "no-cache",
            "timezone": "-240"
          },
          "body": body,
          "method": "POST",
          "mode": "cors"
        }).then((response) => response.json())
        .then((response) => {
          if (library.length != response.count) {
            page = page + 1
            getDokLibrary(token, user, page, library)
              .then(resolve)
              .catch(reject)
          } else {
            resolve(library)
          }
        })
    })
})

const getCrucibleLibrary = (token, user, page, library) => new Promise((resolve, reject) => {
  fetch("https://www.thecrucible.online/api/decks?_=" + user.id, {
      "credentials": "include",
      "headers": {
        "accept": "*/*",
        "accept-language": "en-US,en;q=0.9,da;q=0.8",
        "authorization": "Bearer " + token,
        "cache-control": "no-cache",
        "content-type": "application/json",
        "pragma": "no-cache",
        "x-requested-with": "XMLHttpRequest"
      },
      "method": "GET",
    })
    .then((response) => response.json())
    .then((response) => resolve(response.decks))
})

const importDeckDok = (token, deckId) => {
  fetch(
    'https://decksofkeyforge.com/api/decks/' + deckId + '/import-and-add', {
      credentials: 'include',
      headers: {
        accept: 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.9,da;q=0.8',
        authorization: token,
        timezone: '-240'
      },
      method: 'POST'
    }
  ).then((response) => console.log('Import ' + deckId, response))
}

const importDeckCrucible = (token, deckId) => {
  fetch("https://www.thecrucible.online/api/decks/", {
    "credentials": "include",
    "headers": {
      "accept": "*/*",
      "accept-language": "en-US,en;q=0.9,da;q=0.8",
      "authorization": "Bearer " + token,
      "cache-control": "no-cache",
      "content-type": "application/json",
      "pragma": "no-cache",
      "x-requested-with": "XMLHttpRequest",
    },
    "referrer": "https://www.thecrucible.online/decks/import",
    "referrerPolicy": "no-referrer-when-downgrade",
    "body": JSON.stringify({
      "uuid": deckId
    }),
    "method": "POST",
  }).then((response) => console.log('Import ' + deckId, response))
}

chrome.tabs.getSelected(null, (tab) => {
  tabUrl = tab.url;
  if (tabUrl.includes('www.keyforgegame.com')) {
    masterVaultSection.classList.remove('display-none')
    dokSection.classList.add('display-none')
    crucibleSection.classList.add('display-none')
  } else if (tabUrl.includes('decksofkeyforge.com')) {
    dokSection.classList.remove('display-none')
    masterVaultSection.classList.add('display-none')
    crucibleSection.classList.add('display-none')
  } else if (tabUrl.includes('www.thecrucible.online') || tabUrl.includes('thecrucible.online')) {
    crucibleSection.classList.remove('display-none')
    masterVaultSection.classList.add('display-none')
    dokSection.classList.add('display-none')
  }
})

loadLibrary().then((library) => {
  if (!library || library.length == 0) {
    libraryText.innerHTML = 'No decks accessed from Master Vault'
  } else {
    libraryText.innerHTML = library.length + ' decks accessed from Master Vault'
  }
})

libraryAccessBtn.onclick = (el) => {
  loading(true)
  chrome.cookies.get({
      url: 'https://www.keyforgegame.com/',
      name: 'auth'
    },
    handleMasterVaultSync
  )
}

syncDokBtn.onclick = (el) => {
  loading(true)
  chrome.tabs.query({
      active: true,
      currentWindow: true
    }, (tabs) =>
    chrome.tabs.executeScript(
      tabs[0].id, {
        code: 'localStorage["AUTH"];'
      },
      (response) => {
        token = response[0]
        handleDokSync(token)
      }
    ))
}

syncCrucibleBtn.onclick = (el) => {
  loading(true)
  chrome.tabs.query({
      active: true,
      currentWindow: true
    }, (tabs) =>
    chrome.tabs.executeScript(
      tabs[0].id, {
        code: 'localStorage["refreshToken"];'
      },
      (response) => {
        handleCrucibleSync(response[0])
      }
    ))
}