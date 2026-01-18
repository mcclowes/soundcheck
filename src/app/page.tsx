import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-600 to-purple-700">
      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center text-white mb-16">
          <h1 className="text-6xl font-bold mb-4">Soundcheck</h1>
          <p className="text-xl opacity-90">The AI-powered music pop quiz</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-12">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div className="text-center">
              <div className="text-4xl mb-3">🎵</div>
              <h3 className="font-bold mb-2">Listen</h3>
              <p className="text-gray-600 text-sm">
                Hear 5-second snippets of songs from themed rounds
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">🎤</div>
              <h3 className="font-bold mb-2">Guess</h3>
              <p className="text-gray-600 text-sm">
                Tell the AI host the song title or artist name
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">🏆</div>
              <h3 className="font-bold mb-2">Score</h3>
              <p className="text-gray-600 text-sm">
                Race through 10 songs and see how many you know
              </p>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/play"
              className="inline-block px-8 py-4 bg-indigo-600 text-white text-lg font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Start playing
            </Link>
          </div>
        </div>

        <div className="text-center text-white/80 text-sm">
          <p>Powered by ElevenLabs conversational AI and Spotify</p>
        </div>
      </main>
    </div>
  );
}
