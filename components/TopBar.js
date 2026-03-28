'use client';

import { Bell, Search, Menu, ChevronDown, LogOut, User, Shield } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useSidebarContext } from './SidebarContext';

export default function TopBar() {
  const [searchFocused, setSearchFocused] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { setSidebarOpen } = useSidebarContext();
  const { data: session } = useSession();
  const menuRef = useRef(null);

  const userName = session?.user?.name || 'User';
  const userRole = session?.user?.role || 'STAFF';
  const userInitials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const roleLabel = userRole === 'ADMIN' ? 'Administrator' : userRole === 'MANAGER' ? 'Manager' : 'Staff';

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showUserMenu]);

  return (
    <header className="h-[64px] border-b border-border bg-white flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
      {/* Left section */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="md:hidden p-2 -ml-1 rounded-lg hover:bg-surface-hover transition-colors flex-shrink-0 relative z-10"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>

        {/* Search */}
        <div className={`relative flex items-center transition-all duration-200 min-w-0 ${searchFocused ? 'md:w-[400px] w-full' : 'md:w-[300px] w-full'}`}>
          <Search className="absolute left-3 w-4 h-4 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search leads, products, orders..."
            style={{ paddingLeft: '40px' }}
            className="w-full pr-4 py-2 bg-surface-hover rounded-lg border border-border text-sm placeholder:text-muted/60 focus:bg-white transition-all"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0 ml-2">
        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-surface-hover transition-colors">
          <Bell className="w-[18px] h-[18px] text-muted" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
        </button>

        {/* Divider — desktop only */}
        <div className="w-px h-7 bg-border hidden md:block" />

        {/* User dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 hover:bg-surface-hover rounded-lg px-2.5 py-1.5 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-stone-700 flex items-center justify-center text-white text-xs font-semibold">
              {userInitials}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-sm font-medium text-foreground leading-tight">{userName}</p>
              <p className="text-[10px] text-muted">{roleLabel}</p>
            </div>
            <ChevronDown className={`w-3 h-3 text-muted hidden md:block transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown menu */}
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl border border-border shadow-lg py-1.5 z-50 animate-[fade-in_0.15s_ease-out]">
              {/* User info */}
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold text-foreground">{userName}</p>
                <p className="text-xs text-muted">{session?.user?.email}</p>
                <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  userRole === 'ADMIN' ? 'bg-blue-500/10 text-blue-700' :
                  userRole === 'MANAGER' ? 'bg-purple-500/10 text-purple-700' :
                  'bg-amber-500/10 text-amber-700'
                }`}>
                  <Shield className="w-2.5 h-2.5 inline mr-1 -mt-0.5" />
                  {roleLabel}
                </span>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <button
                  onClick={() => { setShowUserMenu(false); window.location.href = '/settings'; }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-surface-hover transition-colors"
                >
                  <User className="w-4 h-4 text-muted" />
                  Profile & Settings
                </button>
              </div>

              <div className="border-t border-border pt-1">
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
