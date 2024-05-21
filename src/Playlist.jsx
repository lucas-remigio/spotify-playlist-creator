import { useToken } from './TokenContext'
import axios from 'axios'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'

export default function Tracks() {
  const [tracks, setTracks] = useState([])
  let { token, setToken } = useToken()
  let storedToken = useRef(null)
  const { id } = useParams()

  const fetchTracks = useCallback(async () => {
    if (!id || !token) return
    try {
      const response = await axios.get(`https://api.spotify.com/v1/playlists/${id}/tracks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setTracks(response.data.items)
      console.log(response.data.items)
    } catch (error) {
      console.error('Error fetching tracks:', error)
    }
  }, [token, id])

  useEffect(() => {
    if (token) {
      console.log('token ', token)
      fetchTracks()
    } else {
      console.log('no token')
      storedToken.current = window.localStorage.getItem('token')
      setToken(storedToken.current)
    }
  }, [token, setToken, fetchTracks])

  const getMyProfile = async () => {
    try {
      const response = await axios.get('https://api.spotify.com/v1/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      console.log('response ', response.data)
      return response.data.id
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const filterGymMusicsFromTracks = (tracksToFilter) => {
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
            Authorization: `Bearer ${token}`,
          },
        }
      )
      console.log('tracksFeatures ', response.data.audio_features)
      return response.data.audio_features
    } catch (error) {
      console.error('Error fetching track analysis:', error)
    }
  }

  const createGymPlaylist = async () => {
    try {
      const trackAnalysis = await getTrackAnalisys()
      const gymMusics = filterGymMusicsFromTracks(trackAnalysis)
      const userId = await getMyProfile()

      const response = await axios.post(
        `https://api.spotify.com/v1/users/${userId}/playlists`,
        {
          name: 'Gym Playlist',
          public: false,
          description: 'Playlist with gym musics',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
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
            Authorization: `Bearer ${token}`,
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
      <h1>Tracks</h1>
      <button onClick={createGymPlaylist}>Create Gym Playlist</button>
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
    </div>
  )
}
