// PKCE utility functions
function generateRandomString(length: number): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], "");
  }
  
  async function sha256(plain: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return await crypto.subtle.digest('SHA-256', data);
  }
  
  function base64encode(input: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }
  
  export async function handleSpotifyLogin(artistName: string) {
      const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
      const redirectUri = window.location.origin + "/callback"
      const scopes = "playlist-modify-public playlist-modify-private user-read-private user-read-email"
  
      // Generate PKCE parameters
      const codeVerifier = generateRandomString(64)
      const hashed = await sha256(codeVerifier)
      const codeChallenge = base64encode(hashed)
  
      // Store code verifier and artist name for later use
      sessionStorage.setItem('code_verifier', codeVerifier)
      sessionStorage.setItem('artist_name', artistName)
  
      // Use Authorization Code with PKCE flow
      const authUrl =
          `https://accounts.spotify.com/authorize?` +
          `client_id=${clientId}&` +
          `response_type=code&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${encodeURIComponent(scopes)}&` +
          `code_challenge_method=S256&` +
          `code_challenge=${codeChallenge}&` +
          `show_dialog=true&` +
          `state=${artistName}`
  
      window.location.href = authUrl
  }
  
  export async function exchangeCodeForToken(code: string): Promise<string> {
      const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
      const redirectUri = window.location.origin + "/callback"
      const codeVerifier = sessionStorage.getItem('code_verifier')
  
      if (!codeVerifier) {
          throw new Error('Code verifier not found in session storage')
      }
  
      if (!clientId) {
          throw new Error('Spotify client ID not found')
      }
  
      const response = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
              grant_type: 'authorization_code',
              code: code,
              redirect_uri: redirectUri,
              client_id: clientId,
              code_verifier: codeVerifier,
          }),
      })
  
      if (!response.ok) {
          const errorData = await response.json()
          console.error('Token exchange failed:', errorData)
          throw new Error(`Token exchange failed: ${errorData.error_description || errorData.error}`)
      }
  
      const data = await response.json()
      
      // Clean up session storage after successful exchange
      sessionStorage.removeItem('code_verifier')
      
      return data.access_token
  }
  
  export async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string, refresh_token?: string }> {
      const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
  
      const response = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
              grant_type: 'refresh_token',
              refresh_token: refreshToken,
              client_id: clientId!,
          }),
      })
  
      if (!response.ok) {
          throw new Error('Failed to refresh token')
      }
  
      const data = await response.json()
      return {
          access_token: data.access_token,
          refresh_token: data.refresh_token || refreshToken // Some responses don't include a new refresh token
      }
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
          } else if (response.status === 401) {
              // Token expired, try to refresh
              const refreshToken = localStorage.getItem("spotify_refresh_token")
              if (refreshToken) {
                  try {
                      const tokens = await refreshAccessToken(refreshToken)
                      localStorage.setItem("spotify_access_token", tokens.access_token)
                      if (tokens.refresh_token) {
                          localStorage.setItem("spotify_refresh_token", tokens.refresh_token)
                      }
                      
                      // Retry the request with new token
                      const retryResponse = await fetch("https://api.spotify.com/v1/me", {
                          headers: {
                              Authorization: `Bearer ${tokens.access_token}`,
                          },
                      })
                      
                      if (retryResponse.ok) {
                          return await retryResponse.json()
                      }
                  } catch (refreshError) {
                      console.error("Failed to refresh token:", refreshError)
                  }
              }
              
              // If refresh failed or no refresh token, re-authenticate
              localStorage.removeItem("spotify_access_token")
              localStorage.removeItem("spotify_refresh_token")
              handleSpotifyLogin(artistName)
              throw new Error("Refreshing token")
          } else {
              throw new Error("Failed to fetch user profile")
          }
      } catch (error) {
          if (error instanceof Error && error.message === "Refreshing token") {
              throw error
          }
          console.error("Error fetching user profile:", error)
          localStorage.removeItem("spotify_access_token")
          localStorage.removeItem("spotify_refresh_token")
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