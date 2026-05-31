import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="container mx-auto px-4 py-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-blue-600">Parko</h1>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-5xl font-bold text-gray-900 mb-6">
          Park Smarter.<br />Earn More.
        </h2>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Find and book parking near you, or list your space to earn passive income.
          Parko connects drivers with parking owners.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/parking/search"
            className="px-8 py-4 bg-blue-600 text-white rounded-xl text-lg font-semibold hover:bg-blue-700"
          >
            Find Parking
          </Link>
          <Link
            href="/register?role=OWNER"
            className="px-8 py-4 border-2 border-blue-600 text-blue-600 rounded-xl text-lg font-semibold hover:bg-blue-50"
          >
            List Your Space
          </Link>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: 'Find Nearby', desc: 'Search parking by location with real-time availability', icon: '📍' },
            { title: 'Book Instantly', desc: 'Confirm your spot in seconds with secure payment', icon: '✅' },
            { title: 'Earn Money', desc: 'Monetize your unused parking space effortlessly', icon: '💰' },
          ].map((feature) => (
            <div key={feature.title} className="bg-white rounded-2xl p-8 shadow-sm">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
