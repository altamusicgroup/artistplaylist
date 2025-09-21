import { Suspense } from "react"
import PlaylistCreatorClient from "./PlaylistCreatorClient"

// Generate static params from playlist_info.json
export async function generateStaticParams() {
  try {
    // Import the JSON file directly during build time
    const playlistData = await import('../../public/playlist_info.json')
    
    // Generate params for each artist in the JSON
    return Object.keys(playlistData.default).map((artist) => ({
      artist: artist,
    }))
  } catch (error) {
    console.error('Error generating static params:', error)
    // Fallback to empty array if file can't be read
    return []
  }
}

export default function PlaylistCreator({ params }: { params: { artist: string } }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-100 via-pink-200 to-purple-300" />
        <div className="absolute inset-0 bg-gradient-to-t from-purple-400/40 via-pink-300/20 to-orange-50/30" />
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 animate-spin mx-auto text-white border-4 border-white border-t-transparent rounded-full" />
            <p className="text-white text-xl font-semibold">Loading your mix...</p>
          </div>
        </div>
      </div>
    }>
      <PlaylistCreatorClient params={params} />
    </Suspense>
  )
}