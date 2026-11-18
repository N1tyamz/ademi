import { NextResponse } from 'next/server'

export const revalidate = 86400

type MusicResult = {
  trackName?: string
  artistName?: string
  collectionName?: string
  previewUrl?: string
  artworkUrl100?: string
}

function normalize(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
}

function searchTerm(value: string) {
  return value.replace(/[\/:]/g, ' ').replace(/[^\p{L}\p{N}\s&'-]/gu, ' ').replace(/\s+/g, ' ').trim()
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const artist = searchParams.get('artist')?.trim().slice(0, 120) ?? ''
  const title = searchParams.get('title')?.trim().slice(0, 120) ?? ''
  const album = searchParams.get('album')?.trim().slice(0, 160) ?? ''

  if (!artist || !title) {
    return NextResponse.json({ error: 'Artist and title are required.' }, { status: 400 })
  }

  const terms = [`${artist} ${searchTerm(title)}`, `${searchTerm(title)} ${artist}`]
  for (const term of [...new Set(terms)]) {
    try {
      const query = new URLSearchParams({ term, entity: 'song', limit: '50' })
      const response = await fetch(`https://itunes.apple.com/search?${query}`, { next: { revalidate: 86400 } })
      if (!response.ok) continue
      const data = (await response.json()) as { results?: MusicResult[] }
      const expectedArtist = normalize(artist)
      const expectedTitle = normalize(title)
      const matches = (data.results ?? []).filter((result) =>
        result.trackName && result.artistName && normalize(result.trackName) === expectedTitle && normalize(result.artistName).includes(expectedArtist),
      )
      const match = matches.find((result) => normalize(result.collectionName ?? '') === normalize(album)) ?? matches[0]
      if (match) {
        return NextResponse.json({
          previewUrl: match.previewUrl ?? null,
          artworkUrl: match.artworkUrl100?.replace(/100x100bb/, '600x600bb') ?? null,
        })
      }
    } catch {
      continue
    }
  }

  return NextResponse.json({ previewUrl: null, artworkUrl: null })
}
