import axios from 'axios'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import LoadingIcon from './LoadingIcon.jsx'
import Swal from 'sweetalert2'
import './Playlist.css'

export default function Tracks() {
  const [tracks, setTracks] = useState([])
  const [playlistDetails, setPlaylistDetails] = useState(null)
  let storedToken = useRef(null)
  const { id } = useParams()
  let loading = useRef(true)

  const fetchTracks = useCallback(async () => {
    if (!id || !storedToken.current) return

    loading.current = true

    // Fetch playlist details
    const playlistResponse = await axios.get(`https://api.spotify.com/v1/playlists/${id}`, {
      headers: {
        Authorization: `Bearer ${storedToken.current}`,
      },
    })
    setPlaylistDetails(playlistResponse.data)

    let playlistTotal = playlistResponse.data.tracks.total
    let numRequests = Math.ceil(playlistTotal / 100)
    const limit = 100 // Number of items to fetch per request

    let requests = []
    for (let i = 0; i < numRequests; i++) {
      let offset = i * limit
      let request = axios.get(`https://api.spotify.com/v1/playlists/${id}/tracks`, {
        headers: {
          Authorization: `Bearer ${storedToken.current}`,
        },
        params: {
          limit,
          offset,
        },
      })
      requests.push(request)
    }

    try {
      let responses = await Promise.all(requests)
      const allTracks = responses.reduce((acc, response) => acc.concat(response.data.items), [])

      setTracks(allTracks)
      console.log(allTracks)
    } catch (e) {
      console.log('error')
    }

    loading.current = false
  }, [id])

  useEffect(() => {
    //Get token from storage
    storedToken.current = window.localStorage.getItem('token')
    fetchTracks()
  }, [fetchTracks])

  const getMyProfile = async () => {
    try {
      const response = await axios.get('https://api.spotify.com/v1/me', {
        headers: {
          Authorization: `Bearer ${storedToken.current}`,
        },
      })
      console.log('my profile ', response.data)
      return response.data.id
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const filterGymMusicsFromTracks = async () => {
    let tracksToFilter = await getTrackAnalysis()

    // To do that we need to check the following features:
    /* 
    Speechiness <= 0.053
    |   Acousticness <= 0.0652: yes (5.0/1.0)
    Speechiness > 0.053
    |   Acousticness <= 0.258: yes (83.0/3.0)
    |   Acousticness > 0.258
    |   |   Danceability > 0.625
    |   |   |   Instrumentalness <= 0.000625: yes (7.0)
    */

    console.log('tracks ', tracksToFilter)

    let gymMusics = tracksToFilter.filter((track) => {
      const { speechiness, acousticness, danceability, instrumentalness } = track
      if (speechiness <= 0.053 && acousticness <= 0.0652) {
        return true
      }
      if (speechiness > 0.053) {
        if (acousticness <= 0.258) {
          return true
        }
        if (acousticness > 0.258 && danceability > 0.625 && instrumentalness <= 0.000625) {
          return true
        }
      }
      return false
    })

    console.log('gymMusics ', gymMusics)
    return gymMusics
  }

  const getTrackAnalysis = async () => {
    try {
      const tracksIds = tracks.map((track) => track.track.id)
      console.log('tracksIds ', tracksIds)

      const fetchChunk = async (ids) => {
        const response = await axios.get(
          `https://api.spotify.com/v1/audio-features?ids=${ids.join(',')}`,
          {
            headers: {
              Authorization: `Bearer ${storedToken.current}`,
            },
          }
        )
        return response.data.audio_features
      }

      // Function to split array into chunks
      const chunkArray = (array, size) => {
        const result = []
        for (let i = 0; i < array.length; i += size) {
          result.push(array.slice(i, i + size))
        }
        return result
      }

      // Split track IDs into chunks of 100
      const chunks = chunkArray(tracksIds, 100)
      const promises = chunks.map((chunk) => fetchChunk(chunk))
      const results = await Promise.all(promises)

      // Flatten the results array
      const audioFeatures = results.flat()
      return audioFeatures
    } catch (error) {
      console.error('Error fetching track analysis:', error)
    }
  }

  const createGymPlaylist = async () => {
    try {
      let gymMusics = await filterGymMusicsFromTracks()
      const userId = await getMyProfile()

      console.log('token aqui ', storedToken.current)

      const response = await axios.post(
        `https://api.spotify.com/v1/users/${userId}/playlists`,
        {
          name: 'Gym Playlist',
          public: true,
          description: 'Playlist with gym musics',
        },
        {
          headers: {
            Authorization: `Bearer ${storedToken.current}`,
          },
        }
      )

      const playlistId = response.data.id

      // Function to add tracks to the playlist in chunks of 100
      const addTracksToPlaylist = async (playlistId, trackUris) => {
        const chunkSize = 100

        for (let i = 0; i < trackUris.length; i += chunkSize) {
          const chunk = trackUris.slice(i, i + chunkSize)
          await axios.post(
            `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
            {
              uris: chunk,
            },
            {
              headers: {
                Authorization: `Bearer ${storedToken.current}`,
              },
            }
          )
        }
      }

      // Extract track URIs and add them to the playlist
      const trackUris = gymMusics.map((track) => track.uri)
      await addTracksToPlaylist(playlistId, trackUris)

      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Your playlist has been created',
        showConfirmButton: false,
        timer: 1500,
      })

      console.log('Created Gym Playlist:', response.data)
    } catch (error) {
      console.error('Error creating gym playlist:', error)
    }
  }

  return (
    <div id="tracks" style={{ display: 'flex' }}>
      {playlistDetails && (
        <div className="playlist-details" style={{ marginRight: '20px', width: '300px' }}>
          <div className="card">
            <img
              src={playlistDetails.images[0]?.url}
              alt={playlistDetails.name}
              style={{ width: '100%' }}
            />
            <div className="card-body">
              <h2>{playlistDetails.name}</h2>
              <p>{playlistDetails.description}</p>
              <p>
                <strong>Tracks:</strong> {playlistDetails.tracks.total}
              </p>
            </div>
          </div>
        </div>
      )}
      <div style={{ flex: 1 }}>
        <button onClick={filterGymMusicsFromTracks}>Filter Gym Music</button>
        <button onClick={createGymPlaylist}>Create Gym Playlist</button>
        <h1>All Tracks</h1>
        {loading.current ? ( // Conditionally render loading icon if loading is true
          <div>
            <LoadingIcon />
            <p>Loading...</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Cover</th>
                <th>Name</th>
                <th>Artists</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((track) => (
                <tr key={track.track.id}>
                  <td>
                    <img
                      src={track.track.album.images[2]?.url}
                      alt={track.track.album.name}
                      width="50"
                    />
                  </td>
                  <td>{track.track.name}</td>
                  <td>{track.track.artists.map((artist) => artist.name).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
