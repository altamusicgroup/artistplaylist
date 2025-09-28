"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { createPlaylist } from "../playlist_creation"
import PlaylistInfo from "../playlistInfo"

// Add type declaration for window
declare global {
  interface Window {
    spotifyCallbackProcessed?: boolean;
  }
}

export default function SpotifyCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const handleCallback = async () => {
      // Prevent multiple executions
      if (window.spotifyCallbackProcessed) {
        return;
      }
      window.spotifyCallbackProcessed = true;

      try {
        // Get parameters from URL search params (query parameters, not fragment)
        const code = searchParams.get('code')
        const error = searchParams.get('error')
        const state = searchParams.get('state')

        if (error) {
          console.error("Spotify auth error:", error)
          setHasError(true)
          return
        }

        if (!code || !state) {
          console.error("Missing authorization code or state")
          setHasError(true)
          return
        }

        // Get code verifier from session storage
        const codeVerifier = sessionStorage.getItem('code_verifier')
        if (!codeVerifier) {
          throw new Error('Code verifier not found in session storage')
        }

        // Exchange code for access token using PKCE
        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: window.location.origin + "/callback",
            client_id: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!,
            code_verifier: codeVerifier,
          }),
        })

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json()
          console.error('Token exchange error:', errorData)
          throw new Error(`Failed to exchange code for token: ${errorData.error_description || errorData.error}`)
        }

        const tokenData = await tokenResponse.json()

        // Fetch playlist_info.json
        const playlistResponse = await fetch("/playlist_info.json")
        if (!playlistResponse.ok) {
          throw new Error("Failed to fetch playlist info")
        }
        const playlistData = await playlistResponse.json()

        // Find the playlist info corresponding to the state (artist name)
        const playlistInfo: PlaylistInfo = playlistData[state]
        if (!playlistInfo) {
          throw new Error("Invalid artist")
        }
        
        // Store both access and refresh tokens
        localStorage.setItem("spotify_access_token", tokenData.access_token)
        if (tokenData.refresh_token) {
          localStorage.setItem("spotify_refresh_token", tokenData.refresh_token)
        }
        
        // Clean up session storage after successful token exchange
        sessionStorage.removeItem('code_verifier')
        sessionStorage.removeItem('artist_name')

        await createPlaylist(
          tokenData.access_token,
          state,
          playlistInfo.playlistName,
          playlistInfo.playlistDescription,
          playlistInfo.playlistTrackIds
        )
        
      } catch (error) {
        console.error("Error in callback:", error)
        setHasError(true)
      }
    }

    // Only run if we have search params and haven't processed yet
    if ((searchParams.get('code') || searchParams.get('error')) && !window.spotifyCallbackProcessed) {
      handleCallback()
    }
  }, [searchParams]) // Remove router dependency

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-200 via-pink-200 to-purple-300">
      <div className="text-center space-y-4">
        {hasError ? (
          <p className="text-lg font-medium text-red-600">An error occurred while creating your playlist. Please try again.</p>
        ) : (
          <>
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" />
            <p className="text-lg font-medium text-gray-700">Creating your playlist...</p>
          </>
        )}
      </div>
    </div>
  )
}