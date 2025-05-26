
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-700 via-gray-800 to-black text-white p-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 120 }}
        className="flex flex-col items-center"
      >
        <AlertTriangle className="w-32 h-32 text-yellow-400 mb-8 animate-pulse" />
        <h1 className="text-6xl md:text-8xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-orange-500 mb-4">
          404
        </h1>
        <p className="text-2xl md:text-3xl font-light text-gray-300 mb-2">
          Oops! Page Not Found.
        </p>
        <p className="text-md md:text-lg text-gray-400 mb-8 max-w-md">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button asChild size="lg" className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition-all duration-300">
            <Link to="/">
              <Home className="mr-2 h-5 w-5" />
              Go Back Home
            </Link>
          </Button>
        </motion.div>
      </motion.div>
       <div className="absolute bottom-0 left-0 w-full h-20 overflow-hidden">
        <svg viewBox="0 0 500 150" preserveAspectRatio="none" style={{height: "100%", width: "100%;"}}>
          <path d="M-0.00,49.85 C150.00,149.60 349.20,-49.85 500.00,49.85 L500.00,149.60 L-0.00,149.60 Z" style={{stroke: "none", fill: "rgba(255,255,255,0.1)"}}></path>
        </svg>
      </div>
    </div>
  );
};

export default NotFoundPage;
  