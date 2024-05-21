import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import csv

sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials(client_id="455e44d248cd4522a12e519b7a75ea89",
                                                           client_secret="faea6469548c4785be19cdd2545349b3"))

# The following playlist belongs to LockedIn, an hiphop gym playlist on Spotify
playlist_id = "37i9dQZF1DWTl4y3vgJOXW"

tracks = sp.playlist_tracks(playlist_id)

# Get the tracks audio features
track_ids = [track['track']['id'] for track in tracks['items']]
audio_features = sp.audio_features(track_ids)

# join tracks list with audio_features list
for track, audio_feature in zip(tracks['items'], audio_features):
    track.update(audio_feature)


# Prepare CSV file
csv_file = 'spotify_playlist_tracks.csv'

# Open CSV file for writing
with open(csv_file, mode='w', newline='', encoding='utf-8') as file:
    writer = csv.writer(file)
    
    # Write header
    writer.writerow(['Track Name', 
                     'Artist', 
                     'Album', 
                     'Popularity', 
                     'Danceability', 
                     'Energy', 
                     'Key', 
                     'Loudness', 
                     'Mode', 
                     'Speechiness', 
                     'Acousticness', 
                     'Instrumentalness', 
                     'Liveness', 
                     'Valence', 
                     'Tempo', 
                     'Duration (ms)', 
                     'Time Signature'
                     ])

    # Write rows
    for track in tracks['items']:
        writer.writerow([track['track']['name'], 
                         track['track']['artists'][0]['name'], 
                         track['track']['album']['name'], 
                         track['track']['popularity'], 
                         track['danceability'], 
                         track['energy'], 
                         track['key'], 
                         track['loudness'], 
                         track['mode'], 
                         track['speechiness'], 
                         track['acousticness'], 
                         track['instrumentalness'], 
                         track['liveness'], 
                         track['valence'], 
                         track['tempo'], 
                         track['duration_ms'], 
                         track['time_signature']
                            ])

print(f'Track information has been written to {csv_file}')
