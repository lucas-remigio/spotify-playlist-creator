import { useToken } from './TokenContext'
import axios from 'axios'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'

export default function Tracks() {
  const [tracks, setTracks] = useState([])
  let { token } = useToken()
  let storedToken = useRef(null)
  const { id } = useParams()

  const fetchTracks = useCallback(async () => {
    if (!id || !token) return
    const response = await axios.get(`https://api.spotify.com/v1/playlists/${id}/tracks`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    setTracks(response.data.items)
    console.log(response.data.items)
  }, [token, id])

  useEffect(() => {
    if (token) {
      console.log('token ', token)
      fetchTracks()
    } else {
      console.log('no token')
      storedToken.current = window.localStorage.getItem('token')
    }
  }, [token, fetchTracks])

  return (
    <div id="tracks">
      <h1>Tracks</h1>
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
