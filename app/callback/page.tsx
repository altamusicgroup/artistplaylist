"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { createPlaylist } from "../playlist_creation"
import PlaylistInfo from "../playlistInfo"

export default function SpotifyCallback() {
  const router = useRouter()
  const [hasError, setHasError] = useState(false)



  useEffect(() => {
    const handleCallback = async () => {
      // Parse the URL fragment for tokens (Implicit Grant Flow)
      const fragment = window.location.hash.substring(1)
      const params = new URLSearchParams(fragment)
      
      const accessToken = params.get('access_token')
      const error = params.get('error')
      const state = params.get('state')

      if (error) {
        console.error("Spotify auth error:", error)
        setHasError(true)
        return
      }

      if (!accessToken || !state) {
        console.error("Missing access token or state")
        setHasError(true)
        return
      }

      try {
        // Fetch playlist_info.json
        const playlistResponse = await fetch("/playlist_info.json")
        if (!playlistResponse.ok) {
          throw new Error("Failed to fetch playlist info")
        }
        const playlistData = await playlistResponse.json()

        // Find the playlist info corresponding to the state
        const playlistInfo: PlaylistInfo = playlistData[state]
        if (!playlistInfo) {
          throw new Error("Invalid artist")
        }

        // Store the token and create playlist
        localStorage.setItem("spotify_access_token", accessToken)
        
        await createPlaylist(
          accessToken,
          state,
          playlistInfo.playlistName,
          playlistInfo.playlistDescription,
          playlistInfo.playlistTrackIds
        )
        
      } catch (error) {
        console.error("Error creating playlist:", error)
        setHasError(true)
      }
    }

    handleCallback()
  }, [router])

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