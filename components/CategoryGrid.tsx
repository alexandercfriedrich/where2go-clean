import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music,
  Mic2,
  Palette,
  Theater,
  Museum,
  Film,
  Wind,
  UtensilsCrossed,
  Activity,
  BookOpen,
  Users,
} from 'lucide-react';

interface Category {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  queries: string[];
  gradientFrom: string;
  gradientTo: string;
}

const categories: Category[] = [
  {
    id: 'clubs',
    label: 'Clubs & Nachtleben',
    icon: <Music className="w-6 h-6" />,
    color: '#FF006E',
    gradientFrom: 'from-pink-500',
    gradientTo: 'to-rose-500',
    queries: [
      'Welche Clubs & Nachtleben Events finden heute in Wien statt?',
      'Welche Clubs & Nachtleben Events finden morgen in Wien statt?',
      'Welche Clubs & Nachtleben Events finden am Wochenende in Wien statt?',
    ],
  },
  {
    id: 'concerts',
    label: 'Live-Konzerte',
    icon: <Mic2 className="w-6 h-6" />,
    color: '#FB5607',
    gradientFrom: 'from-orange-500',
    gradientTo: 'to-red-500',
    queries: [
      'Welche Live-Konzerte Events finden heute in Wien statt?',
      'Welche Live-Konzerte Events finden morgen in Wien statt?',
      'Welche Live-Konzerte Events finden am Wochenende in Wien statt?',
    ],
  },
  {
    id: 'classical',
    label: 'Klassik & Oper',
    icon: <Palette className="w-6 h-6" />,
    color: '#FFBE0B',
    gradientFrom: 'from-amber-400',
    gradientTo: 'to-yellow-500',
    queries: [
      'Welche Klassik & Oper Events finden heute in Wien statt?',
      'Welche Klassik & Oper Events finden morgen in Wien statt?',
      'Welche Klassik & Oper Events finden am Wochenende in Wien statt?',
    ],
  },
  {
    id: 'theater',
    label: 'Theater & Comedy',
    icon: <Theater className="w-6 h-6" />,
    color: '#8338EC',
    gradientFrom: 'from-purple-500',
    gradientTo: 'to-indigo-500',
    queries: [
      'Welche Theater & Comedy Events finden heute in Wien statt?',
      'Welche Theater & Comedy Events finden morgen in Wien statt?',
      'Welche Theater & Comedy Events finden am Wochenende in Wien statt?',
    ],
  },
  {
    id: 'museums',
    label: 'Museen & Ausstellungen',
    icon: <Museum className="w-6 h-6" />,
    color: '#3A86FF',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-cyan-500',
    queries: [
      'Welche Museen & Ausstellungen Events finden heute in Wien statt?',
      'Welche Museen & Ausstellungen Events finden morgen in Wien statt?',
      'Welche Museen & Ausstellungen Events finden am Wochenende in Wien statt?',
    ],
  },
  {
    id: 'film',
    label: 'Film & Kino',
    icon: <Film className="w-6 h-6" />,
    color: '#06FFA5',
    gradientFrom: 'from-green-400',
    gradientTo: 'to-teal-500',
    queries: [
      'Welche Film & Kino Events finden heute in Wien statt?',
      'Welche Film & Kino Events finden morgen in Wien statt?',
      'Welche Film & Kino Events finden am Wochenende in Wien statt?',
    ],
  },
  {
    id: 'festivals',
    label: 'Open Air & Festivals',
    icon: <Wind className="w-6 h-6" />,
    color: '#FFB703',
    gradientFrom: 'from-yellow-400',
    gradientTo: 'to-orange-500',
    queries: [
      'Welche Open Air & Festivals Events finden heute in Wien statt?',
      'Welche Open Air & Festivals Events finden morgen in Wien statt?',
      'Welche Open Air & Festivals Events finden am Wochenende in Wien statt?',
    ],
  },
  {
    id: 'culinary',
    label: 'Kulinarik & Märkte',
    icon: <UtensilsCrossed className="w-6 h-6" />,
    color: '#D62828',
    gradientFrom: 'from-red-500',
    gradientTo: 'to-pink-500',
    queries: [
      'Welche Kulinarik & Märkte Events finden heute in Wien statt?',
      'Welche Kulinarik & Märkte Events finden morgen in Wien statt?',
      'Welche Kulinarik & Märkte Events finden am Wochenende in Wien statt?',
    ],
  },
  {
    id: 'sports',
    label: 'Sport & Fitness',
    icon: <Activity className="w-6 h-6" />,
    color: '#06D6A0',
    gradientFrom: 'from-emerald-500',
    gradientTo: 'to-teal-500',
    queries: [
      'Welche Sport & Fitness Events finden heute in Wien statt?',
      'Welche Sport & Fitness Events finden morgen in Wien statt?',
      'Welche Sport & Fitness Events finden am Wochenende in Wien statt?',
    ],
  },
  {
    id: 'education',
    label: 'Bildung & Workshops',
    icon: <BookOpen className="w-6 h-6" />,
    color: '#118AB2',
    gradientFrom: 'from-sky-500',
    gradientTo: 'to-blue-500',
    queries: [
      'Welche Bildung & Workshops Events finden heute in Wien statt?',
      'Welche Bildung & Workshops Events finden morgen in Wien statt?',
      'Welche Bildung & Workshops Events finden am Wochenende in Wien statt?',
    ],
  },
  {
    id: 'family',
    label: 'Familie & Kinder',
    icon: <Users className="w-6 h-6" />,
    color: '#EF476F',
    gradientFrom: 'from-rose-500',
    gradientTo: 'to-pink-500',
    queries: [
      'Welche Familie & Kinder Events finden heute in Wien statt?',
      'Welche Familie & Kinder Events finden morgen in Wien statt?',
      'Welche Familie & Kinder Events finden am Wochenende in Wien statt?',
    ],
  },
];

interface ExpandedCategory {
  id: string;
  expandedIndex: number;
}

const CategoryGrid: React.FC = () => {
  const [expanded, setExpanded] = useState<ExpandedCategory | null>(null);
  const [selectedQueries, setSelectedQueries] = useState<string[]>([]);

  const handleCategoryClick = (id: string) => {
    setExpanded(expanded?.id === id ? null : { id, expandedIndex: 0 });
  };

  const handleQuerySelect = (query: string) => {
    setSelectedQueries((prev) =>
      prev.includes(query) ? prev.filter((q) => q !== query) : [...prev.slice(-1), query]
    );
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 100, damping: 15 },
    },
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 text-center"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
          Entdecke Events in Wien
        </h1>
        <p className="text-slate-400 text-lg">
          Wähle eine Kategorie und erkunde die besten Events in deiner Stadt
        </p>
      </motion.div>

      {/* Category Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12"
      >
        {categories.map((category) => (
          <motion.div
            key={category.id}
            variants={itemVariants}
            layoutId={category.id}
            onClick={() => handleCategoryClick(category.id)}
            className="group cursor-pointer"
          >
            <motion.div
              whileHover={{ scale: 1.05, y: -8 }}
              whileTap={{ scale: 0.98 }}
              className={`relative overflow-hidden rounded-2xl p-6 backdrop-blur-xl border border-white/10 transition-all duration-300 hover:border-white/20 bg-gradient-to-br ${category.gradientFrom} ${category.gradientTo} bg-opacity-10 hover:bg-opacity-20`}
            >
              {/* Animated gradient background */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: `radial-gradient(circle at top right, ${category.color}20, transparent)`,
                }}
              />

              {/* Content */}
              <div className="relative z-10 flex flex-col items-start h-full">
                <motion.div
                  whileHover={{ rotate: 12, scale: 1.1 }}
                  className={`mb-4 p-3 rounded-xl bg-gradient-to-br ${category.gradientFrom} ${category.gradientTo} text-white`}
                >
                  {category.icon}
                </motion.div>

                <h3 className="text-lg font-semibold text-white mb-2">
                  {category.label}
                </h3>

                <p className="text-sm text-slate-300 group-hover:text-slate-200 transition-colors">
                  {category.queries.length} Events verfügbar
                </p>

                {/* Expand indicator */}
                <motion.div
                  animate={{ rotate: expanded?.id === category.id ? 180 : 0 }}
                  className="absolute top-4 right-4"
                >
                  <svg
                    className="w-5 h-5 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </motion.div>
              </div>
            </motion.div>

            {/* Expanded queries */}
            <AnimatePresence>
              {expanded?.id === category.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="mt-3 space-y-2"
                >
                  {category.queries.map((query, idx) => (
                    <motion.button
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuerySelect(query);
                      }}
                      className={`w-full text-left p-3 rounded-lg text-sm transition-all duration-200 border ${
                        selectedQueries.includes(query)
                          ? `bg-${category.gradientFrom.split('-')[1]}-500 text-white border-${category.gradientFrom.split('-')[1]}-400`
                          : 'bg-slate-700/50 text-slate-200 border-slate-600 hover:bg-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 transition-all ${
                            selectedQueries.includes(query)
                              ? 'opacity-100 scale-100'
                              : 'opacity-50 scale-75'
                          }`}
                          style={{ backgroundColor: category.color }}
                        />
                        <span>{query}</span>
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </motion.div>

      {/* Selected queries footer */}
      <AnimatePresence>
        {selectedQueries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent p-6 border-t border-white/10 backdrop-blur-xl"
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <span className="text-slate-300">
                  {selectedQueries.length} Query{selectedQueries.length !== 1 ? 'ies' : ''}{' '}
                  ausgewählt:
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedQueries.map((query, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-sm text-white"
                    >
                      {query.substring(0, 30)}...
                    </motion.div>
                  ))}
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all"
              >
                Suchen
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CategoryGrid;