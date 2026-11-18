import { BirthdayExperience } from '@/components/birthday-experience'
import { trackGroups } from '@/components/birthday-data'

type AlbumResult = {
  collectionName?: string
  trackName?: string
  artworkUrl100?: string
}

type AlbumSearchResponse = {
  results?: AlbumResult[]
}

function normalizeAlbumName(albumName: string) {
  return albumName.toLowerCase().replace(/[^a-z0-9]/g, '')
}

async function getInitialArtwork() {
  const artworkByTrack: Record<string, string> = {}
  const albumResultsByArtist = await Promise.all(trackGroups.map(async (group) => {
    const query = new URLSearchParams({ term: group.artist, entity: 'album', limit: '200' })
    try {
      const response = await fetch(`https://itunes.apple.com/search?${query.toString()}`, { next: { revalidate: 86400 } })
      if (!response.ok) return []
      const data = (await response.json()) as AlbumSearchResponse
      return data.results ?? []
    } catch {
      return []
    }
  }))

  trackGroups.forEach((group, groupIndex) => {
    const albums = albumResultsByArtist[groupIndex]
    group.tracks.forEach((track) => {
      const expectedAlbum = normalizeAlbumName(track.album)
      const album = albums.find((result) => {
        if (!result.collectionName || !result.artworkUrl100) return false
        const availableAlbum = normalizeAlbumName(result.collectionName)
        return availableAlbum === expectedAlbum || availableAlbum.includes(expectedAlbum) || expectedAlbum.includes(availableAlbum)
      })
      if (album?.artworkUrl100) {
        artworkByTrack[track.id] = album.artworkUrl100.replace(/100x100bb/, '600x600bb')
      }
    })
  })

  const missingTracks = trackGroups.flatMap((group) => group.tracks).filter((track) => !artworkByTrack[track.id])
  const fallbackArtworks = await Promise.all(missingTracks.map(async (track) => {
    const query = new URLSearchParams({ term: `${track.artist} ${track.title}`, entity: 'song', limit: '10' })
    try {
      const response = await fetch(`https://itunes.apple.com/search?${query.toString()}`, { next: { revalidate: 86400 } })
      if (!response.ok) return [track.id, undefined] as const
      const data = (await response.json()) as AlbumSearchResponse
      const exactTracks = (data.results ?? []).filter((result) => result.trackName && normalizeAlbumName(result.trackName) === normalizeAlbumName(track.title) && result.artworkUrl100)
      const expectedAlbum = normalizeAlbumName(track.album)
      const match = exactTracks.find((result) => normalizeAlbumName(result.collectionName ?? '') === expectedAlbum)
        ?? exactTracks.find((result) => {
          const collectionName = normalizeAlbumName(result.collectionName ?? '')
          return collectionName.startsWith(expectedAlbum) && !collectionName.includes('single')
        })
        ?? exactTracks[0]
      return [track.id, match?.artworkUrl100] as const
    } catch {
      return [track.id, undefined] as const
    }
  }))

  fallbackArtworks.forEach(([trackId, artworkUrl]) => {
    if (artworkUrl) artworkByTrack[trackId] = artworkUrl.replace(/100x100bb/, '600x600bb')
  })

  return artworkByTrack
}

export default async function Page() {
  const initialArtwork = await getInitialArtwork()
  return <BirthdayExperience initialArtwork={initialArtwork} />
}
