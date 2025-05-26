import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { BookUser, Edit3, FileText, Settings as SettingsIcon, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import TeacherDashboardHome from '@/pages/TeacherDashboard/TeacherDashboardHome';
import CreateSessionAndInputMarks from '@/pages/TeacherDashboard/CreateSessionAndInputMarks';
import ViewTeacherResults from '@/pages/TeacherDashboard/ViewTeacherResults';
import TeacherSettings from '@/pages/TeacherDashboard/TeacherSettings';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const TeacherSidebar = ({ isOpen, toggleSidebar, isMobile }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/teacher', icon: LayoutDashboard },
    { name: 'Create Session & Input Marks', path: '/teacher/create-session', icon: Edit3 },
    { name: 'View Results', path: '/teacher/view-results', icon: FileText },
    { name: 'Settings', path: '/teacher/settings', icon: SettingsIcon },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/teacher' && (location.pathname === '/teacher' || location.pathname === '/teacher/')) {
      return true;
    }
    return location.pathname.startsWith(path) && path !== '/teacher';
  };

  const sidebarVariants = {
    open: { width: 256, padding: '1rem', opacity: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
    closed: { width: isMobile ? 0 : 80, padding: isMobile ? 0 : '0.5rem', opacity: isMobile ? 0 : 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
    mobileOpen: { width: 256, padding: '1rem', opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
    mobileClosed: { width: 256, padding: '1rem', opacity: 0, x: "-100%", transition: { type: "spring", stiffness: 300, damping: 30 } }
  };
  
  const currentVariant = isMobile ? (isOpen ? "mobileOpen" : "mobileClosed") : (isOpen ? "open" : "closed");

  return (
    <TooltipProvider delayDuration={100}>
      <motion.div 
        className={`fixed inset-y-0 left-0 z-30 bg-gradient-to-b from-sky-700 to-sky-900 text-white shadow-2xl ${isMobile && !isOpen ? 'pointer-events-none' : ''}`}
        variants={sidebarVariants}
        initial={isMobile ? "mobileClosed" : "closed"}
        animate={currentVariant}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          <div className={`flex items-center mb-8 ${isOpen || isMobile ? 'justify-between' : 'justify-center'} ${isOpen || isMobile ? 'p-4' : 'p-2'}`}>
            {(isOpen || (isMobile && isOpen)) && <Link to="/teacher" className="text-2xl font-semibold text-white hover:text-sky-300 transition-colors">Teacher Panel</Link>}
            {isMobile && isOpen && (
              <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-white hover:text-sky-300">
                <X className="h-6 w-6" />
              </Button>
            )}
          </div>
          
          <nav className="flex-grow space-y-2 px-2">
            {navItems.map(item => (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>
                  <Link 
                    to={item.path} 
                    onClick={isMobile && isOpen ? toggleSidebar : undefined}
                    className={`flex items-center py-3 px-3 rounded-lg transition-all duration-200 ease-in-out group
                      ${isActive(item.path) 
                        ? 'bg-sky-500 text-white shadow-md scale-105' 
                        : 'hover:bg-sky-600 hover:text-white focus:bg-sky-600 focus:text-white focus:outline-none focus:ring-2 focus:ring-sky-400/50'}
                      ${!(isOpen || (isMobile && isOpen)) ? 'justify-center' : ''}`}
                  >
                    <item.icon className={`h-6 w-6 stroke-[1.5] ${(isOpen || (isMobile && isOpen)) ? 'mr-3' : ''}`} />
                    {(isOpen || (isMobile && isOpen)) && <span className="font-medium text-sm">{item.name}</span>}
                  </Link>
                </TooltipTrigger>
                {!(isOpen || (isMobile && isOpen)) && (
                  <TooltipContent side="right" className="bg-sky-800 text-white border-sky-700 shadow-lg">
                    <p>{item.name}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            ))}
          </nav>

          <div className="mt-auto p-2">
            {(isOpen || (isMobile && isOpen)) && user && (
              <div className="p-3 mb-3 bg-sky-700/60 rounded-lg text-center shadow-inner">
                <p className="text-sm font-semibold text-gray-100">{user.name || user.email}</p>
                <p className="text-xs text-sky-300/80 capitalize">{user.role}</p>
              </div>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={handleLogout} 
                  variant="ghost" 
                  className={`w-full flex items-center py-3 px-3 rounded-lg transition-colors duration-200 hover:bg-red-600/90 hover:text-white group text-red-300 focus:bg-red-700 focus:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50
                    ${!(isOpen || (isMobile && isOpen)) ? 'justify-center' : ''}`}
                >
                  <LogOut className={`h-6 w-6 stroke-[1.5] ${(isOpen || (isMobile && isOpen)) ? 'mr-3' : ''}`} />
                  {(isOpen || (isMobile && isOpen)) && <span className="font-medium text-sm">Logout</span>}
                </Button>
              </TooltipTrigger>
              {!(isOpen || (isMobile && isOpen)) && (
                <TooltipContent side="right" className="bg-sky-800 text-white border-sky-700 shadow-lg">
                  <p>Logout</p>
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>
      </motion.div>
    </TooltipProvider>
  );
};


const TeacherDashboardPage = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  
  useEffect(() => {
    const handleResize = () => {
      const mobileCheck = window.innerWidth < 768;
      setIsMobile(mobileCheck);
      if (mobileCheck) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const mainContentMargin = isMobile ? 0 : (isSidebarOpen ? 256 : 80);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 dark:from-slate-800 dark:to-blue-900">
      <TeacherSidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} isMobile={isMobile} />
      
      {isMobile && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleSidebar} 
          className="fixed top-4 left-4 z-50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700"
        >
          {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      )}
      
      <motion.main 
        className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto"
        animate={{ marginLeft: mainContentMargin }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className={`pt-12 ${isMobile ? 'md:pt-0' : 'md:pt-0'}`}>
          <Routes>
            <Route index element={<TeacherDashboardHome />} />
            <Route path="create-session" element={<CreateSessionAndInputMarks />} />
            <Route path="view-results" element={<ViewTeacherResults />} />
            <Route path="settings" element={<TeacherSettings />} />
          </Routes>
        </div>
      </motion.main>
      
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-20"
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeacherDashboardPage;