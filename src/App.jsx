import './App.css'
import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import Swal from 'sweetalert2'

function App() {
  const CLIENT_ID = '455e44d248cd4522a12e519b7a75ea89'
  const REDIRECT_URI = 'http://localhost:5173'
  const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize'
  const RESPONSE_TYPE = 'token'
  // scope should give access to publicly available information
  // and to create a playlist and add tracks to that
  const SCOPE =
    'playlist-modify-public playlist-modify-private playlist-read-private user-read-email user-read-private'

  const [token, setToken] = useState(null)
  const [playlists, setPlaylists] = useState([])
  let user_id = useRef(null)

  const fetchPlaylists = useCallback(async () => {
    if (!token) return

    let allPlaylists = []
    let offset = 0
    const limit = 50
    let totalItems = 0

    try {
      do {
        const response = await axios.get('https://api.spotify.com/v1/me/playlists', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            limit,
            offset,
          },
        })

        allPlaylists = allPlaylists.concat(response.data.items)
        offset += limit
        if (!totalItems) {
          totalItems = response.data.total
        }

      } while (allPlaylists.length < totalItems)

      console.log('All playlists:', allPlaylists)
      return allPlaylists

    } catch (error) {
      console.error('Error fetching playlists:', error)
    }
  }, [token])

  const fetchMyPlaylists = useCallback(async () => {
    let playlists = await fetchPlaylists()
    let myPlaylists = playlists.filter((playlist) => playlist.owner.id === user_id.current)
    console.log('My playlists:', myPlaylists)
    setPlaylists(myPlaylists)
  }, [fetchPlaylists])

  const getProfile = useCallback(async () => {
    if (!token) return
    try {
      const profile = await axios.get('https://api.spotify.com/v1/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      console.log(profile.data)
      user_id.current = profile.data.id
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }, [token])

  useEffect(() => {
    const hash = window.location.hash
    let storedToken = window.localStorage.getItem('token')

    if (!storedToken && hash) {
      storedToken = hash
        .substring(1)
        .split('&')
        .find((elem) => elem.startsWith('access_token'))
        .split('=')[1]

      window.location.hash = ''
      window.localStorage.setItem('token', storedToken)
    }

    setToken(storedToken)
    console.log(storedToken)
  }, [setToken])

  useEffect(() => {
    if (token) {
      getProfile()
      fetchMyPlaylists()
    }
  }, [token, getProfile, fetchMyPlaylists])

  const logout = () => {
    setToken('')
    window.localStorage.removeItem('token')
  }

  const login = () => {
    const loginUrl = `${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=${RESPONSE_TYPE}&scope=${SCOPE}`
    console.log(loginUrl)
    window.location.href = loginUrl
  }

  const deletePlaylist = async (id) => {
    // stop following the playlist
    const unfollow = async (id) => {
      try {
        await axios.delete(`https://api.spotify.com/v1/playlists/${id}/followers`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        fetchPlaylists()
      } catch (error) {
        console.error('Error unfollowing playlist:', error)
      }
    }

    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
    }).then((result) => {
      if (result.isConfirmed) {
        unfollow(id)
        Swal.fire({
          title: 'Deleted!',
          text: 'Your playlist has been deleted.',
          icon: 'success',
          showConfirmButton: false,
          timer: 1500,
        })
      }
    })
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Spotify React</h1>
        {!token ? (
          <button onClick={login}>Login to Spotify</button>
        ) : (
          <>
            <button onClick={logout}>Logout</button>
            <div>
              <h2>My Playlists:</h2>
              <ul className="playlist-container">
                {playlists.map((playlist) => (
                  <li key={playlist.id} className="playlist-card">
                    <Link to={`playlist/${playlist.id}`}>
                      <div className="playlist-content">
                        {playlist.images && playlist.images.length > 0 ? (
                          <img
                            src={playlist.images[0].url}
                            alt={playlist.name}
                            className="playlist-image"
                          />
                        ) : (
                          <div className="no-image-placeholder">No Image Available</div>
                        )}
                        <h3 className="playlist-name">{playlist.name}</h3>
                        Select
                      </div>
                    </Link>
                    <button onClick={() => deletePlaylist(playlist.id)}>Delete</button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </header>
    </div>
  )
}

export default App
