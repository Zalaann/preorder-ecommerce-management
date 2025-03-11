import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authentication | Fatty\'s Store',
  description: 'Sign in or create an account for Fatty\'s Store',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side - Illustration/Brand */}
      <div className="w-full md:w-1/2 bg-gradient-to-r from-indigo-400 via-indigo-500 to-indigo-600 p-8 flex flex-col justify-center items-center text-white">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-3xl font-bold mb-6">Welcome to Fatty&apos;s Store Dashboard</h1>
          <p className="text-xl mb-8">
            Manage your pre-orders, customers, and flights with our powerful dashboard.
          </p>
          <div className="grid grid-cols-1 gap-6 mb-8">
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-2">Streamlined Management</h3>
              <p>Efficiently track and manage all your pre-orders in one place.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-2">Customer Insights</h3>
              <p>Keep track of your customers and their preferences.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-2">Flight Tracking</h3>
              <p>Monitor shipments and delivery status in real-time.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right side - Auth Form */}
      <div className="w-full md:w-1/2 bg-gray-50 dark:bg-gray-900 p-8 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
} 