import Link from "next/link";

const Navbar = () => {
  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-indigo-600">Rote</Link>
          </div>
          <div className="flex items-center">
            <Link href="/dashboard" className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">Dashboard</Link>
            <Link href="/content" className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">Content</Link>
            <Link href="/recite" className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">Recite</Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;