import axios from 'axios'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import LoadingIcon from './LoadingIcon.jsx'

export default function Tracks() {
  const [tracks, setTracks] = useState([])
  let storedToken = useRef(null)
  const { id } = useParams()
  let loading = useRef(true)

  const fetchTracks = useCallback(async () => {
    if (!id || !storedToken.current) return

    let offset = 0 // Initial offset
    const limit = 50 // Number of items to fetch per request
    let allTracks = [] // Array to store all tracks
    loading.current = true

    try {
      let totalItems = 0
      let fetchedItems = 0

      do {
        const response = await axios.get(`https://api.spotify.com/v1/playlists/${id}/tracks`, {
          headers: {
            Authorization: `Bearer ${storedToken.current}`,
          },
          params: {
            limit,
            offset,
          },
        })

        const items = response.data.items
        allTracks = allTracks.concat(items)

        fetchedItems += items.length
        totalItems = response.data.total

        // Increment the offset for the next request
        offset += limit
      } while (fetchedItems < totalItems)

      setTracks(allTracks)
      console.log('All tracks:', allTracks)
    } catch (error) {
      console.error('Error fetching tracks:', error)
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
    let tracksToFilter = await getTrackAnalisys()

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

  const getTrackAnalisys = async () => {
    // First we need to get the musics in the playlist and their corresponding analysis
    // Then we need to filter the musics that are in the gym style
    // Finally we need to create a new playlist with the musics that are in the gym style
    try {
      const tracksIds = tracks.map((track) => track.track.id)
      console.log('tracksIds ', tracksIds)
      const response = await axios.get(
        `https://api.spotify.com/v1/audio-features?ids=${tracksIds.join(',')}`,
        {
          headers: {
            Authorization: `Bearer ${storedToken.current}`,
          },
        }
      )
      return response.data.audio_features
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

      await axios.post(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
          uris: gymMusics.map((track) => track.uri),
        },
        {
          headers: {
            Authorization: `Bearer ${storedToken.current}`,
          },
        }
      )

      console.log('Created Gym Playlist:', response.data)
    } catch (error) {
      console.error('Error creating gym playlist:', error)
    }
  }

  return (
    <div id="tracks">
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
                    src={track.track.album.images[0]?.url}
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
  )
}
