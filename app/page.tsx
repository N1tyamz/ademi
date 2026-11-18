import { BirthdayExperience } from '@/components/birthday-experience'
import { trackGroups } from '@/components/birthday-data'

type SongResult = {
  trackName?: string
  artistName?: string
  collectionName?: string
  artworkUrl100?: string
}

type SongSearchResponse = {
  results?: SongResult[]
}

function normalize(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9]/g, '')
}

async function getInitialArtwork() {
  const tracks = trackGroups.flatMap((group) => group.tracks)
  const artworks = await Promise.all(tracks.map(async (track) => {
    const term = `${track.artist} ${track.title.replace(/[\\/:]/g, ' ')}`
    const query = new URLSearchParams({ term, entity: 'song', limit: '50' })
    try {
      const response = await fetch(`https://itunes.apple.com/search?${query}`, { next: { revalidate: 86400 } })
      if (!response.ok) return [track.id, undefined] as const
      const data = (await response.json()) as SongSearchResponse
      const matches = (data.results ?? []).filter((result) =>
        result.trackName && result.artistName && result.artworkUrl100
        && normalize(result.trackName) === normalize(track.title)
        && normalize(result.artistName).includes(normalize(track.artist)),
      )
      const match = matches.find((result) => normalize(result.collectionName ?? '') === normalize(track.album)) ?? matches[0]
      return [track.id, match?.artworkUrl100?.replace(/100x100bb/, '600x600bb')] as const
    } catch {
      return [track.id, undefined] as const
    }
  }))

  return Object.fromEntries(artworks.filter((entry): entry is readonly [string, string] => Boolean(entry[1])))
}

export default async function Page() {
  const initialArtwork = await getInitialArtwork()
  return <BirthdayExperience initialArtwork={initialArtwork} />
}
