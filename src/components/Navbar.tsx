
import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { History, User, LogOut, Menu } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();

  return (
    <nav className="bg-white/90 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-50 slide-in-top shadow-sm">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex justify-between items-center">
          {/* Logo Section - Enhanced Responsive Design */}
          <div 
            className="flex items-center space-x-2 sm:space-x-3 cursor-pointer min-w-0 flex-shrink-0 group" 
            onClick={() => navigate('/')}
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300 group-hover:scale-105">
              <span className="text-white font-bold text-sm sm:text-lg md:text-xl">F</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent truncate group-hover:from-blue-700 group-hover:to-purple-700 transition-all duration-300">
                FeeBox
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 hidden sm:block font-medium">Smart Locker System</p>
            </div>
          </div>
          
          {/* User Actions - Enhanced Responsive Design */}
          <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 flex-shrink-0">
            {user ? (
              <>
                {/* History Button - Enhanced Responsive */}
                <Button 
                  onClick={() => navigate('/history')} 
                  variant="ghost" 
                  size="sm"
                  className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 md:px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50/80 transition-all duration-200 rounded-lg group"
                >
                  <History className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform duration-200" />
                  <span className="hidden sm:inline text-sm md:text-base font-medium">Riwayat</span>
                </Button>
                
                {/* User Info - Enhanced Responsive */}
                <div className="hidden lg:flex items-center space-x-2 text-gray-600 bg-gray-50/80 rounded-lg px-3 py-2 max-w-32 xl:max-w-48 group hover:bg-blue-50/80 transition-all duration-200">
                  <User className="w-4 h-4 flex-shrink-0 text-blue-500 group-hover:text-blue-600 transition-colors duration-200" />
                  <span className="text-sm truncate font-medium group-hover:text-blue-700 transition-colors duration-200">
                    {user.email?.split('@')[0] || 'User'}
                  </span>
                </div>
                
                {/* Mobile User Indicator */}
                <div className="lg:hidden flex items-center justify-center w-8 h-8 bg-blue-50 rounded-lg text-blue-600">
                  <User className="w-4 h-4" />
                </div>
                
                {/* Logout Button - Enhanced Responsive */}
                <Button 
                  onClick={logout} 
                  variant="outline" 
                  size="sm"
                  className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 md:px-4 py-2 text-red-600 border-red-200 bg-red-50/80 hover:bg-red-100/80 hover:border-red-300 hover:text-red-700 transition-all duration-200 hover:scale-105 active:scale-95 rounded-lg shadow-sm group"
                >
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform duration-200" />
                  <span className="hidden sm:inline text-sm md:text-base font-medium">Logout</span>
                </Button>
              </>
            ) : (
              <div className="text-right max-w-32 sm:max-w-48 md:max-w-none">
                <div className="text-xs sm:text-sm md:text-base text-gray-400 font-medium">
                  <span className="hidden lg:inline">Sistem Penitipan Item Terpercaya</span>
                  <span className="hidden md:inline lg:hidden">Penitipan Item Terpercaya</span>
                  <span className="hidden sm:inline md:hidden">Item Terpercaya</span>
                  <span className="sm:hidden">Smart Item</span>
                </div>
                <div className="text-xs text-gray-400 hidden sm:block">
                  <span className="hidden md:inline">Aman • Mudah • Terjangkau</span>
                  <span className="md:hidden">Aman & Mudah</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
