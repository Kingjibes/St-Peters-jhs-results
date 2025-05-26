
import React from 'react';
import { motion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';

const PreloaderPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700 text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <motion.div
          animate={{ rotateY: [0, 180, 360], scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        >
          <GraduationCap size={128} className="mb-8 text-yellow-400 drop-shadow-lg" />
        </motion.div>
        <motion.h1 
          className="text-5xl font-bold mb-4 tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-orange-400"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          Results Portal
        </motion.h1>
        <motion.p 
          className="text-xl text-indigo-200"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          Loading your learning journey...
        </motion.p>
      </motion.div>
      <motion.div 
        className="absolute bottom-10 w-1/2 h-1.5 bg-white/30 rounded-full overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <motion.div 
          className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 3, ease: "linear", delay: 1 }}
        >
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PreloaderPage;
  