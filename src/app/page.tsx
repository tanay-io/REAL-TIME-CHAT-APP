import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-center mb-8">Welcome to ChatApp</h1>
        <div className="flex justify-center gap-4">
          <Link
            href="/login"
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="px-6 py-3 bg-transparent border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-600 hover:text-white transition-colors"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  );
}