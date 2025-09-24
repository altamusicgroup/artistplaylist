export function handleSpotifyLogin(artistName: string) {
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
    const redirectUri = window.location.origin + "/callback"
    console.log("Redirect URI:", redirectUri) // Debug: Check what redirect URI is being sent
    const scopes = "playlist-modify-public playlist-modify-private user-read-private user-read-email"

    // Use Implicit Grant Flow
    const authUrl =
      `https://accounts.spotify.com/authorize?` +
      `client_id=${clientId}&` +
      `response_type=token&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `show_dialog=true&` +
      `state=${artistName}`

    window.location.href = authUrl
}

export async function fetchUserProfile(token: string, artistName: string) {
    try {
        const response = await fetch("https://api.spotify.com/v1/me", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
        })

        if (response.ok) {
            const userData = await response.json()
            return userData
        } else {
            localStorage.removeItem("spotify_access_token")
            handleSpotifyLogin(artistName)
            throw new Error("Refreshing token")
        }
    } catch (error) {
        localStorage.removeItem("spotify_access_token")
        handleSpotifyLogin(artistName)
        throw new Error("Refreshing token")
    }
}

export async function createPlaylist(
    token: string,
    artistName: string,
    playlistName: string,
    playlistDescription: string,
    tracks: string[],
) {
    try {
        const userData = await fetchUserProfile(token, artistName)

        // Create playlist
        const playlistResponse = await fetch(`https://api.spotify.com/v1/users/${userData.id}/playlists`, {
            method: "POST",
            headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            },
            body: JSON.stringify({
            name: playlistName,
            description: playlistDescription,
            public: true,
            }),
        })

        if (!playlistResponse.ok) {
            throw new Error("Failed to create playlist")
        }

        const playlist = await playlistResponse.json()

        if (tracks.length > 0) {
            await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                uris: tracks,
            }),
            })
        }

        // Open the playlist
        const playlistUrl = new URL(playlist.external_urls.spotify)
        playlistUrl.searchParams.set("go", "1")
        window.open(playlistUrl.toString(), "_self")
    } catch (error: any) {
        if (error.message === "Refreshing token") {
            return
        }
        console.error("Error creating playlist:", error)
        alert("Failed to create playlist. Please try again.")
    }
}