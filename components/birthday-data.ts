export type Track = {
  id: string
  artist: string
  title: string
  album: string
  lyric: string
  dedication: string
  featured?: boolean
  color: string
}

export const trackGroups: { artist: string; featured?: string; tracks: Track[] }[] = [
  {
    artist: 'Tate McRae',
    featured: 'Your Main Vibe',
    tracks: [
      {
        id: 'tate-1035',
        artist: 'Tate McRae',
        title: '10:35',
        album: 'THINK LATER',
        lyric: '“When it’s 10:35, and we’re finally alive...”',
        dedication: 'Dedicated to your energy when you stop overthinking, live in the moment, and own the room.',
        featured: true,
        color: 'coral',
      },
      {
        id: 'tate-cut-my-hair',
        artist: 'Tate McRae',
        title: 'cut my hair',
        album: 'THINK LATER',
        lyric: '“So I cut my hair, yeah, I changed my mind...”',
        dedication: 'For stepping into a brand-new chapter of your life and leaving old doubts behind.',
        color: 'rose',
      },
      {
        id: 'tate-2-hands',
        artist: 'Tate McRae',
        title: '2 hands',
        album: 'So Close To What',
        lyric: '“Every time I get close, I just want more...”',
        dedication: 'For chasing everything you want without holding yourself back.',
        color: 'lilac',
      },
    ],
  },
  {
    artist: 'The Neighbourhood',
    tracks: [
      {
        id: 'nbhd-247',
        artist: 'The Neighbourhood',
        title: '24/7',
        album: 'Hard To Imagine The Neighbourhood Ever Changing',
        lyric: '“Even when I’m losing my mind, I still keep on trying...”',
        dedication: 'Because no matter how stressed or overwhelmed you get, you never actually quit.',
        color: 'sage',
      },
      {
        id: 'nbhd-cherry-flavoured',
        artist: 'The Neighbourhood',
        title: 'Cherry Flavoured',
        album: 'Chip Chrome & The Mono-Tones',
        lyric: '“Cherry flavoured conversations...”',
        dedication: 'For the effortless, cool vibe you bring every time we talk.',
        color: 'peach',
      },
      {
        id: 'nbhd-stuck-with-me',
        artist: 'The Neighbourhood',
        title: 'Stuck with Me',
        album: 'Hard To Imagine The Neighbourhood Ever Changing',
        lyric: '“You’re stuck with me...”',
        dedication: 'A subtle reminder that you’ve got someone in your corner rooting for you.',
        color: 'blue',
      },
    ],
  },
  {
    artist: 'Olivia Rodrigo',
    tracks: [
      {
        id: 'olivia-grudge',
        artist: 'Olivia Rodrigo',
        title: 'the grudge',
        album: 'GUTS',
        lyric: '“You have everything and you still want more...”',
        dedication: 'A reminder to stop being so hard on yourself and recognize how much you already carry.',
        color: 'lilac',
      },
      {
        id: 'olivia-get-him-back',
        artist: 'Olivia Rodrigo',
        title: 'get him back!',
        album: 'GUTS',
        lyric: '“I wanna meet his mom, just to tell her her son sucks...”',
        dedication: 'Pure chaotic, confident main-character energy.',
        color: 'coral',
      },
      {
        id: 'olivia-lacy',
        artist: 'Olivia Rodrigo',
        title: 'lacy',
        album: 'GUTS',
        lyric: '“Ooh, I care, I care, I care...”',
        dedication: 'Recognizing the softer, deeply thoughtful side of you that most people miss.',
        color: 'rose',
      },
      {
        id: 'olivia-pretty',
        artist: 'Olivia Rodrigo',
        title: 'pretty isn’t pretty',
        album: 'GUTS',
        lyric: '“And you can’t ever win, no matter what you do...”',
        dedication: 'A reminder to stop comparing yourself to impossible standards. You are already more than enough.',
        color: 'sage',
      },
    ],
  },
  {
    artist: 'Halsey',
    tracks: [
      {
        id: 'halsey-colors',
        artist: 'Halsey',
        title: 'Colors',
        album: 'BADLANDS',
        lyric: '“Everything is blue... you were red, and you liked me ’cause I was blue...”',
        dedication: 'Because you bring real depth and color into everything around you.',
        color: 'blue',
      },
      {
        id: 'halsey-drive',
        artist: 'Halsey',
        title: 'Drive',
        album: 'BADLANDS',
        lyric: '“All we do is drive...”',
        dedication: 'For the late-night overthinking and the quiet ambition pushing you forward.',
        color: 'peach',
      },
      {
        id: 'halsey-lonely',
        artist: 'Halsey',
        title: 'Lonely is the Muse',
        album: 'The Great Impersonator',
        lyric: '“I’ve always been a martyr, I’ve always been a muse...”',
        dedication: 'You carry so much on your shoulders silently. Remember, you don’t always have to carry it alone.',
        color: 'lilac',
      },
    ],
  },
  {
    artist: 'Twenty One Pilots',
    tracks: [
      {
        id: 'top-city-walls',
        artist: 'Twenty One Pilots',
        title: 'City Walls',
        album: 'Breach',
        lyric: '“Behind these city walls, we’re building something that lasts...”',
        dedication: 'Dedicated to your future in KZ and all the big things you’re building step by step.',
        color: 'sage',
      },
      {
        id: 'top-morph',
        artist: 'Twenty One Pilots',
        title: 'Morph',
        album: 'Trench',
        lyric: '“He’ll always try to stop me, that Nicolas Bourbaki... I’ll morph to someone else...”',
        dedication: 'No matter what obstacle or self-doubt shows up, you adapt, evolve, and push right through it.',
        color: 'coral',
      },
      {
        id: 'top-drum-show',
        artist: 'Twenty One Pilots',
        title: 'The Drum Show',
        album: 'Breach',
        lyric: '“Keep the rhythm going when the noise gets loud...”',
        dedication: 'For staying locked in on your goals even when everything around you feels loud and chaotic.',
        color: 'blue',
      },
    ],
  },
]

export const bouquetCaption = 'Virtual flowers for this year since I can’t come up and hand them to you right now. Maybe around Christmas I’ll give them to you in real life (of course, if you don’t ghost me).'

export const noteMessage = 'Happy Birthday, Ademi. I hope your final year of studies goes smoothly and you crush everything on your path to becoming a government official in KZ. More than anything, I hope you finally let go of all the negative things you think about yourself. You’re way more capable than you give yourself credit for.'

export const finalMessage = `Hey Ademi,\n\nI wanted to leave you with something real at the end of this, because I don’t think you realize how clearly I see you and how much potential you actually have.\n\nI know how hard you push yourself, and I also know how loud those negative thoughts in your head can get when things feel overwhelming. You spend way too much time doubting yourself, overthinking your progress, and complaining about things you think you’re falling short on. From the outside looking in, though? I see someone who is driven, sharp, resilient, and building a future that most people wouldn't even have the discipline to chase. Everything you are working toward right now, including every late night, stressful class, and step toward your goals, is going to be worth it.\n\nStop beating yourself up and stop selling yourself short. This upcoming year is going to be yours, and I genuinely believe you’re going to surprise even yourself with how far you go.\n\nEven though you aren’t religious, I still added you in my prayers today. I prayed that this new year brings you peace of mind, that all the heavy, negative thoughts you carry around finally fade away, and that you get every bit of success and happiness you deserve.\n\nHave the absolute best birthday, Ademi. Keep shining, and remember someone’s always cheering for you.`
