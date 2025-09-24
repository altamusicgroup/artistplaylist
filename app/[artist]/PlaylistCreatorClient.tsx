"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { handleSpotifyLogin, createPlaylist } from "../playlist_creation"
import PlaylistInfo from "../playlistInfo"

// Social icon mapping using FontAwesome class names
const getSocialIconClass = (platform: string): string => {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return 'fab fa-instagram';
    case 'youtube':
      return 'fab fa-youtube';
    case 'spotify':
      return 'fab fa-spotify';
    case 'tiktok':
      return 'fab fa-tiktok';
    case 'facebook':
      return 'fab fa-facebook';
    case 'twitter':
      return 'fab fa-x-twitter'; // Updated Twitter/X icon
    case 'linkedin':
      return 'fab fa-linkedin';
    case 'soundcloud':
      return 'fab fa-soundcloud';
    case 'apple':
    case 'applemusic':
      return 'fab fa-apple';
    default:
      return 'fas fa-music'; // Default fallback
  }
};

export default function PlaylistCreatorClient({ params }: { params: { artist: string } }) {
  const { artist } = params
  const [isLoading, setIsLoading] = useState(false)
  const [isPageReady, setIsPageReady] = useState(false)
  const [playlistInfo, setPlaylistInfo] = useState<PlaylistInfo | null>(null)

  useEffect(() => {
    const fetchPlaylistInfo = async () => {
      try {
        // Fetch playlist_info.json
        const playlistResponse = await fetch("/playlist_info.json")
        if (!playlistResponse.ok) {
          throw new Error("Failed to fetch playlist info")
        }
        const playlistData = await playlistResponse.json()

        // Find the playlist info corresponding to the artist
        const info = playlistData[artist]
        if (!info) {
          // Not found, redirect to Alta Music
          window.location.href = "https://www.altamusic.co"
          return
        }

        setPlaylistInfo(info)

        // Preload the image
        const img = new Image()
        img.onload = () => {
          setIsPageReady(true)
        }
        img.onerror = () => {
          console.error("Failed to load image")
          // Still show the page even if image fails
          setIsPageReady(true)
        }
        img.src = info.backgroundImageUrl

      } catch (error) {
        console.error("Error fetching playlist info:", error)
        // Redirect to Alta Music on error
        window.location.href = "https://www.altamusic.co"
      }
    }

    fetchPlaylistInfo()
  }, [artist])

  const onClickCreatePlaylist = async () => {
    if (!playlistInfo) return
    
    setIsLoading(true)
    const token = localStorage.getItem("spotify_access_token")

    if (!token) {
      // Login to Spotify, will redirect to the /callback page
      handleSpotifyLogin(artist)
    } else {
      try {
        await createPlaylist(
          token,
          artist,
          playlistInfo.playlistName,
          playlistInfo.playlistDescription,
          playlistInfo.playlistTrackIds
        )
      } catch (error) {
        console.error("Error creating playlist:", error)
        setIsLoading(false)
      }
    }
  }

  // Show loading state until everything is ready
  if (!isPageReady || !playlistInfo) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-100 via-pink-200 to-purple-300" />
        <div className="absolute inset-0 bg-gradient-to-t from-purple-400/40 via-pink-300/20 to-orange-50/30" />
        
        {/* Loading content */}
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-white" />
            <p className="text-white text-xl font-semibold">Loading your mix...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* FontAwesome CSS */}
      <link 
        rel="stylesheet" 
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA=="
        crossOrigin="anonymous" 
        referrerPolicy="no-referrer" 
      />
      
      {/* Background gradient based on the provided screenshot - warm peachy-pink to purple */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-100 via-pink-200 to-purple-300" />
      <div className="absolute inset-0 bg-gradient-to-t from-purple-400/40 via-pink-300/20 to-orange-50/30" />

      {/* Content - Image and button centered */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-8">
          {/* Image */}
          <div className="flex justify-center">
            <img 
              src={playlistInfo.backgroundImageUrl}
              alt={artist}
              className="w-80 h-80 object-cover rounded-2xl shadow-2xl"
            />
          </div>
          
          {/* Text Box */}
          <div className="max-w-md mx-auto p-6 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
            <p className="text-gray-800 text-center leading-relaxed mb-4">
              🇫🇷: À l'occasion de la sortie de Origin, on a sélectionné nos tracks Afro House préférées de cet été, clique sur le lien en dessous pour l'ajouter sur Spotify et l'écouter en courant, en mangeant en famille, sur le canapé ou quand tu veux en fait.
            </p>
            <p className="text-gray-800 text-center leading-relaxed">
              🇺🇸: For the release of our new album Origin, we wanted to share our favorite Afro House playlist with songs that moved us at festivals this summer. Listen to it while running, taking a shower or at anytime seriously. Click on the link below to get it.
            </p>
            <p className="text-gray-800 text-center font-bold mt-3">
              TRINIX
            </p>
          </div>
          
          {/* Button */}
          <Button
            onClick={onClickCreatePlaylist}
            disabled={isLoading}
            className="px-12 py-6 text-xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 hover:from-purple-700 hover:via-pink-600 hover:to-orange-600 text-white border-0 rounded-2xl shadow-2xl transition-all duration-300 hover:shadow-3xl hover:scale-105 backdrop-blur-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                Creating Your {playlistInfo.playlistName}
              </>
            ) : (
              `Click to Access your ${playlistInfo.playlistName}`
            )}
          </Button>
          
          {/* Dynamic Social Media Icons */}
          {playlistInfo.socials && Object.keys(playlistInfo.socials).length > 0 && (
            <div className="flex justify-center space-x-6 mt-8">
              {Object.entries(playlistInfo.socials).map(([platform, url]) => {
                if (!url) return null;
                
                const iconClass = getSocialIconClass(platform);
                
                return (
                  <a 
                    key={platform}
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-all duration-300 hover:scale-110"
                    title={`Follow on ${platform.charAt(0).toUpperCase() + platform.slice(1)}`}
                  >
                    <i className={`${iconClass} text-white text-xl`}></i>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}