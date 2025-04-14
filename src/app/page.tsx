import Link from 'next/link';
import { FiMessageSquare, FiUsers, FiLock, FiBell } from 'react-icons/fi';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0a0a0a] to-[#1a1a1a] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            Connect Instantly with ChatApp
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Experience real-time communication with a modern, secure, and intuitive chat platform.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/login"
              className="px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all transform hover:scale-105"
            >
              Get Started
            </Link>
            <Link
              href="/signup"
              className="px-8 py-4 bg-transparent border-2 border-purple-600 text-purple-400 rounded-lg hover:bg-purple-600/10 transition-all transform hover:scale-105"
            >
              Sign Up
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="p-6 rounded-xl bg-[#1c1c1c] hover:bg-[#242424] transition-colors">
            <FiMessageSquare className="w-12 h-12 text-purple-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Real-time Chat</h3>
            <p className="text-gray-400">Instant messaging with real-time updates and notifications</p>
          </div>
          <div className="p-6 rounded-xl bg-[#1c1c1c] hover:bg-[#242424] transition-colors">
            <FiUsers className="w-12 h-12 text-purple-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Group Chats</h3>
            <p className="text-gray-400">Create and manage group conversations easily</p>
          </div>
          <div className="p-6 rounded-xl bg-[#1c1c1c] hover:bg-[#242424] transition-colors">
            <FiLock className="w-12 h-12 text-purple-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Secure</h3>
            <p className="text-gray-400">End-to-end encryption for your privacy</p>
          </div>
          <div className="p-6 rounded-xl bg-[#1c1c1c] hover:bg-[#242424] transition-colors">
            <FiBell className="w-12 h-12 text-purple-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Notifications</h3>
            <p className="text-gray-400">Never miss important messages</p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-gray-300 mb-8">
            Join thousands of users already enjoying ChatApp
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-4 bg-white text-purple-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Create Your Account
          </Link>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-400">
          <p>© 2024 ChatApp. All rights reserved.</p>
        </footer>
      </div>
    </main>
  );
}