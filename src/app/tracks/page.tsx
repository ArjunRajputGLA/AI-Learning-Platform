'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, Play, FileText, Award, Plus, X, Loader2, Moon, Sun, ChevronDown, ChevronUp, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// Types
interface Resource {
  type: 'video' | 'article' | 'document';
  url: string;
  title: string;
  duration?: number;
}

interface Activity {
  type: 'quiz' | 'assignment' | 'exercise';
  instructions: string;
  pointsValue: number;
}

interface Module {
  moduleId: string;
  title: string;
  content: string;
  order: number;
  resources: Resource[];
  activities: Activity[];
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctOption: number;
  explanation: string;
}

interface Quiz {
  questions: QuizQuestion[];
  passingScore: number;
}

interface Track {
  _id?: string;
  title: string;
  description: string;
  thumbnail: string;
  createdBy: string;
  isPublic: boolean;
  subject: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number;
  prerequisites: string[];
  modules: Module[];
  quiz: Quiz;
  tags: string[];
}

interface UserTrack {
  _id: string;
  title: string;
  subject: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  createdAt: Date;
}

interface Subtopic {
  title: string;
  content: string;
  type: 'subtopic' | 'resource' | 'activity';
  details?: Resource | Activity;
}

const TracksGenerator: React.FC = () => {
  const [subject, setSubject] = useState('');
  const [topics, setTopics] = useState<string[]>(['']);
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [loading, setLoading] = useState(false);
  const [generatedTrack, setGeneratedTrack] = useState<Track | null>(null);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['summary']);
  const [expandedModules, setExpandedModules] = useState<number[]>([]); // Track expanded modules
  const [activeSubtopic, setActiveSubtopic] = useState<{ moduleIndex: number; subtopicIndex: number } | null>(null);
  const [userTracks, setUserTracks] = useState<UserTrack[]>([]);
  const [fetchingTracks, setFetchingTracks] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
    fetchUserTracks();
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const toggleModule = (index: number) => {
    setExpandedModules(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const toggleSubtopicPopup = (moduleIndex: number, subtopicIndex: number) => {
    setActiveSubtopic(prev =>
      prev?.moduleIndex === moduleIndex && prev?.subtopicIndex === subtopicIndex
        ? null
        : { moduleIndex, subtopicIndex }
    );
  };

  const addTopic = () => {
    if (topics.length < 4) {
      setTopics([...topics, '']);
    }
  };

  const removeTopic = (index: number) => {
    if (topics.length > 1) {
      setTopics(topics.filter((_, i) => i !== index));
    }
  };

  const updateTopic = (index: number, value: string) => {
    const updatedTopics = [...topics];
    updatedTopics[index] = value;
    setTopics(updatedTopics);
  };

  const generateTrack = async () => {
    const validTopics = topics.filter(topic => topic.trim() !== '');
    if (!subject.trim() || validTopics.length === 0) {
      setError('Please provide a subject and at least one topic');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/tracks', {
        subject,
        topics: validTopics,
        difficulty,
      });

      const track: Track = response.data.track;
      setGeneratedTrack(track);
      setExpandedSections(['summary']);
      setExpandedModules([]);
      setActiveSubtopic(null);
      fetchUserTracks();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to generate track. Please ensure the curriculum service is running or try again later.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const retryGenerateTrack = () => {
    setTopics([topics[0]]);
    generateTrack();
  };

  const fetchUserTracks = async () => {
    setFetchingTracks(true);
    try {
      const response = await axios.get('/api/tracks');
      setUserTracks(response.data.tracks);
    } catch (err: any) {
      console.error('Failed to fetch user tracks:', err);
      setError('Failed to fetch your tracks. Please try again later.');
    } finally {
      setFetchingTracks(false);
    }
  };

  const fetchTrackById = async (trackId: string) => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/tracks?id=${trackId}`);
      const track: Track = response.data.track;
      setGeneratedTrack(track);
      setExpandedSections(['summary']);
      setExpandedModules([]);
      setActiveSubtopic(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load track.');
    } finally {
      setLoading(false);
    }
  };

  const deleteTrack = async (trackId: string) => {
    try {
      await axios.delete(`/api/tracks?id=${trackId}`);
      setUserTracks(userTracks.filter(track => track._id !== trackId));
      if (generatedTrack && generatedTrack._id === trackId) {
        setGeneratedTrack(null);
      }
      setDeleteConfirm(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete track.');
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'beginner': return 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30';
      case 'intermediate': return 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30';
      case 'advanced': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800';
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video': return <Play size={20} className="text-red-500" />;
      case 'article': return <FileText size={20} className="text-blue-600" />;
      default: return <BookOpen size={20} className="text-green-600" />;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'quiz': return <Award size={20} className="text-blue-500" />;
      case 'assignment': return <FileText size={20} className="text-orange-600" />;
      default: return <BookOpen size={20} className="text-gray-700" />;
    }
  };

  // Parse subtopics from module content, resources, and activities
  const parseSubtopics = (module: Module): Subtopic[] => {
    const subtopics: Subtopic[] = [];
    
    // Parse Markdown content for subheadings (##)
    const contentLines = module.content.split('\n');
    let currentSubtopic: Subtopic | null = null;
    
    for (const line of contentLines) {
      if (line.startsWith('## ')) {
        if (currentSubtopic) {
          subtopics.push(currentSubtopic);
        }
        currentSubtopic = {
          title: line.replace('## ', '').trim(),
          content: '',
          type: 'subtopic',
        };
      } else if (currentSubtopic) {
        currentSubtopic.content += line + '\n';
      }
    }
    if (currentSubtopic) {
      subtopics.push(currentSubtopic);
    }

    // If no subtopics found, use Resources and Activities as subtopics
    if (subtopics.length === 0) {
      module.resources.forEach((resource, index) => {
        subtopics.push({
          title: resource.title,
          content: `${resource.type}${resource.duration ? ` • ${resource.duration} min` : ''}`,
          type: 'resource',
          details: resource,
        });
      });
      module.activities.forEach((activity, index) => {
        subtopics.push({
          title: `${capitalize(activity.type)} (${activity.pointsValue} pts)`,
          content: activity.instructions || `${activity.type} worth ${activity.pointsValue} points`,
          type: 'activity',
          details: activity,
        });
      });
    }

    return subtopics;
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-b from-blue-50 via-white to-purple-100'}`}>
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="text-center mb-12 relative">
          <button
            onClick={toggleDarkMode}
            className="absolute top-2 right-2 p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 border border-gray-200 dark:border-gray-700"
            data-no-fd
          >
            {darkMode ? <Sun size={20} className="text-blue-500" /> : <Moon size={20} className="text-gray-600" />}
          </button>
          <div className="animate-slide-in">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
              AI Learning Tracks Generator
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Create structured learning tracks with AI-generated content, quizzes, and resources tailored to your subject and skill level.
            </p>
          </div>
        </header>

        {/* Track History */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-10 border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 dark:text-white">
            <BookOpen size={24} className="text-blue-600 dark:text-blue-400" />
            Your Generated Tracks
            {fetchingTracks && <Loader2 size={20} className="ml-2 animate-spin text-gray-600 dark:text-gray-400" />}
          </h2>
          {userTracks.length > 0 ? (
            <ul className="space-y-4">
              {userTracks.map((track) => (
                <li key={track._id} className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200">
                  <div className="flex-1 cursor-pointer" onClick={() => fetchTrackById(track._id)}>
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">{track.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {track.subject} • {capitalize(track.difficulty)} • Created on {new Date(track.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setDeleteConfirm(track._id)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-600/30 rounded-lg transition-all duration-200"
                    data-no-fd
                  >
                    <Trash2 size={18} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600 dark:text-gray-400 text-center">No tracks generated yet. Create one below!</p>
          )}
        </div>

        {/* Track Generation Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-12 border border-gray-200 dark:border-gray-600">
          <h2 className="text-3xl font-bold mb-8 flex items-center gap-2 dark:text-white">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
              <BookOpen className="text-white" size={24} />
            </div>
            Create New Learning Track
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Subject *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Mathematics, Programming, Physics"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
                data-no-fd
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as 'beginner' | 'intermediate' | 'advanced')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
                data-no-fd
              >
                <option value="beginner">🟢 Beginner</option>
                <option value="intermediate">🟡 Intermediate</option>
                <option value="advanced">🔴 Advanced</option>
              </select>
            </div>
          </div>
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Topics * (Max 4)
            </label>
            <div className="space-y-3">
              {topics.map((topic, index) => (
                <div key={index} className="flex items-center gap-3 group animate-slide-in" style={{ animationDelay: `${index * 100}ms` }}>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => updateTopic(index, e.target.value)}
                    placeholder={`Topic ${index + 1}`}
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
                    data-no-fd
                  />
                  {topics.length > 1 && (
                    <button
                      onClick={() => removeTopic(index)}
                      className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-600/30 rounded-lg transition-all duration-200 opacity-50 group-hover:opacity-100"
                      data-no-fd
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              ))}
              {topics.length < 4 && (
                <button
                  onClick={addTopic}
                  className="flex items-center gap-2 text-blue-600 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 mt-4 px-4 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-600/30 transition-all duration-200"
                  data-no-fd
                >
                  <Plus size={18} />
                  Add Topic
                </button>
              )}
            </div>
          </div>
          {error && (
            <div className="bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6 animate-slide-in">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              {error.includes('Failed to generate track') && (
                <button
                  onClick={retryGenerateTrack}
                  className="mt-4 text-blue-600 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 px-4 py-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-600/30 transition-all duration-200 flex items-center gap-2"
                  data-no-fd
                >
                  <RefreshCw size={16} className="inline-block mr-2" />
                  Retry with One Topic
                </button>
              )}
            </div>
          )}
          <div className="mb-6 bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Generating your track may take a moment as we tailor content and quizzes to your preferences. Thanks for your patience!
            </p>
          </div>
          <button
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-lg"
            onClick={generateTrack}
            data-no-fd
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                Generating Track...
              </>
            ) : (
              <>
                <BookOpen size={18} />
                Generate Track
              </>
            )}
          </button>
        </div>

        {/* Generated Track Display */}
        {generatedTrack && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 mb-12 border border-gray-200 dark:border-gray-600 animate-slide-in">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 dark:text-white">
              <BookOpen size={24} className="text-blue-600 dark:text-blue-400" />
              Generated Track Details
            </h3>
            {/* Section: Summary */}
            <div className="border-b border-gray-200 dark:border-gray-600 mb-4">
              <button
                className="w-full flex justify-between items-center py-3 px-4 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => toggleSection('summary')}
                data-no-fd
              >
                <h4 className="text-lg font-semibold dark:text-white">Summary</h4>
                {expandedSections.includes('summary') ? (
                  <ChevronUp className="text-gray-600 dark:text-gray-300" size={20} />
                ) : (
                  <ChevronDown className="text-gray-600 dark:text-gray-300" size={20} />
                )}
              </button>
              {expandedSections.includes('summary') && (
                <div className="p-4 animate-slide-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Title</h5>
                      <p className="text-gray-600 dark:text-gray-400">{generatedTrack.title}</p>
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Subject</h5>
                      <p className="text-gray-600 dark:text-gray-400">{generatedTrack.subject}</p>
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Difficulty</h5>
                      <span className={`px-3 py-1 rounded-full text-sm ${getDifficultyColor(generatedTrack.difficulty)}`}>
                        {capitalize(generatedTrack.difficulty)}
                      </span>
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Estimated Time</h5>
                      <p className="text-gray-600 dark:text-gray-400">{generatedTrack.estimatedMinutes} minutes</p>
                    </div>
                    <div className="md:col-span-2">
                      <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</h5>
                      <p className="text-gray-600 dark:text-gray-400">{generatedTrack.description}</p>
                    </div>
                    <div className="md:col-span-2">
                      <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tags</h5>
                      <div className="flex flex-wrap gap-2">
                        {generatedTrack.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded-full">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Section: Modules */}
            <div className="border-b border-gray-200 dark:border-gray-600 mb-4">
              <button
                className="w-full flex justify-between items-center py-3 px-4 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => toggleSection('modules')}
                data-no-fd
              >
                <h4 className="text-lg font-semibold dark:text-white">Modules ({generatedTrack.modules.length})</h4>
                {expandedSections.includes('modules') ? (
                  <ChevronUp className="text-gray-600 dark:text-gray-300" size={20} />
                ) : (
                  <ChevronDown className="text-gray-600 dark:text-gray-300" size={20} />
                )}
              </button>
              {expandedSections.includes('modules') && (
                <div className="p-4 animate-slide-in">
                  {generatedTrack.modules.map((module, index) => {
                    const subtopics = parseSubtopics(module);
                    const quizzes = module.activities.filter(activity => activity.type === 'quiz');
                    return (
                      <div
                        key={index}
                        className="border-b border-gray-200 dark:border-gray-600 mb-4 pb-4 last:border-b-0"
                      >
                        {/* Module Header */}
                        <button
                          className="w-full flex justify-between items-center py-3 px-4 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => toggleModule(index)}
                          data-no-fd
                        >
                          <h5 className="text-md font-semibold dark:text-white">
                            Module {module.order}: {module.title}
                          </h5>
                          {expandedModules.includes(index) ? (
                            <ChevronUp className="text-gray-600 dark:text-gray-300" size={20} />
                          ) : (
                            <ChevronDown className="text-gray-600 dark:text-gray-300" size={20} />
                          )}
                        </button>
                        {expandedModules.includes(index) && (
                          <div className="mt-4">
                            {/* Quizzes */}
                            {quizzes.length > 0 && (
                              <div className="mb-6">
                                <h6 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Quizzes</h6>
                                <div className="flex flex-wrap gap-3">
                                  {quizzes.map((quiz, qIndex) => (
                                    <div
                                      key={qIndex}
                                      className="p-2 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:scale-105 hover:shadow-lg transition-all duration-300 animate-slide-in"
                                      style={{ animationDelay: `${qIndex * 50}ms` }}
                                    >
                                      <div className="flex items-center gap-2">
                                        {getActivityIcon(quiz.type)}
                                        <span className="text-xs text-gray-600 dark:text-gray-300">
                                          Quiz ({quiz.pointsValue} pts)
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Subtopics Checkpoints */}
                            <div className="relative flex flex-col items-center">
                              <div className="absolute left-0 right-0 top-0 bottom-0 flex justify-center">
                                <div className="w-1 bg-gray-300 dark:bg-gray-600 relative">
                                  {subtopics.map((_, sIndex) => (
                                    <div
                                      key={sIndex}
                                      className={`absolute w-1 h-16 bg-gray-300 dark:bg-gray-600 ${sIndex % 2 === 0 ? 'translate-x-4' : '-translate-x-4'}`}
                                      style={{ top: `${sIndex * 80}px` }}
                                    />
                                  ))}
                                </div>
                              </div>
                              {subtopics.map((subtopic, sIndex) => (
                                <div
                                  key={sIndex}
                                  className={`flex items-center w-full my-4 relative animate-slide-in ${sIndex % 2 === 0 ? 'justify-start' : 'justify-end'}`}
                                  style={{ animationDelay: `${sIndex * 100}ms` }}
                                >
                                  <button
                                    onClick={() => toggleSubtopicPopup(index, sIndex)}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm transition-all duration-300 
                                      bg-gradient-to-b from-blue-500 to-blue-700 dark:from-blue-400 dark:to-blue-600 
                                      shadow-[0_5px_10px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_15px_rgba(0,0,0,0.4)] 
                                      transform hover:scale-110 active:scale-95
                                      border-b-4 border-blue-800 dark:border-blue-700
                                      ${activeSubtopic?.moduleIndex === index && activeSubtopic?.subtopicIndex === sIndex ? 'scale-110 ring-4 ring-blue-300 dark:ring-blue-500' : ''}`}
                                    data-no-fd
                                    aria-label={`Subtopic ${sIndex + 1}: ${subtopic.title}`}
                                  >
                                    {sIndex + 1}
                                  </button>
                                  <p className="absolute text-xs font-medium text-gray-700 dark:text-gray-300 mt-12 text-center max-w-[120px] truncate">
                                    {subtopic.title}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Section: Quiz */}
            <div className="mb-4">
              <button
                className="w-full flex justify-between items-center py-3 px-4 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => toggleSection('quiz')}
                data-no-fd
              >
                <h4 className="text-lg font-semibold dark:text-white">Final Quiz ({generatedTrack.quiz.questions.length})</h4>
                {expandedSections.includes('quiz') ? (
                  <ChevronUp className="text-gray-600 dark:text-gray-300" size={20} />
                ) : (
                  <ChevronDown className="text-gray-600 dark:text-gray-300" size={20} />
                )}
              </button>
              {expandedSections.includes('quiz') && (
                <div className="p-4 animate-slide-in">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Quiz Overview</h5>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {generatedTrack.quiz.questions.length} questions covering all modules
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Passing Score: <span className="font-semibold">{generatedTrack.quiz.passingScore}%</span>
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Sample Question</h5>
                        <p className="text-sm italic text-gray-600 dark:text-gray-400">
                          "{generatedTrack.quiz.questions[0]?.question || 'No questions available'}"
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {generatedTrack.quiz.questions[0]?.options.length || 0} options
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Subtopic Popup */}
        {activeSubtopic && generatedTrack && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-200 dark:border-gray-600">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold dark:text-white">
                  {generatedTrack.modules[activeSubtopic.moduleIndex].title} - {parseSubtopics(generatedTrack.modules[activeSubtopic.moduleIndex])[activeSubtopic.subtopicIndex].title}
                </h3>
                <button
                  onClick={() => setActiveSubtopic(null)}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-300"
                  data-no-fd
                >
                  <X size={18} />
                </button>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {parseSubtopics(generatedTrack.modules[activeSubtopic.moduleIndex])[activeSubtopic.subtopicIndex].type === 'subtopic' ? (
                  <ReactMarkdown
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        if (className?.includes('language-latex')) {
                          return (
                            <span
                              dangerouslySetInnerHTML={{
                                __html: katex.renderToString(String(children).replace(/\n$/, ''), {
                                  throwOnError: false,
                                }),
                              }}
                              {...props}
                            />
                          );
                        }
                        return <code className={className} {...props}>{children}</code>;
                      },
                    }}
                  >
                    {parseSubtopics(generatedTrack.modules[activeSubtopic.moduleIndex])[activeSubtopic.subtopicIndex].content}
                  </ReactMarkdown>
                ) : parseSubtopics(generatedTrack.modules[activeSubtopic.moduleIndex])[activeSubtopic.subtopicIndex].type === 'resource' ? (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-3">
                      {getResourceIcon((parseSubtopics(generatedTrack.modules[activeSubtopic.moduleIndex])[activeSubtopic.subtopicIndex].details as Resource).type)}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                          {(parseSubtopics(generatedTrack.modules[activeSubtopic.moduleIndex])[activeSubtopic.subtopicIndex].details as Resource).title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {(parseSubtopics(generatedTrack.modules[activeSubtopic.moduleIndex])[activeSubtopic.subtopicIndex].details as Resource).type}
                          {(parseSubtopics(generatedTrack.modules[activeSubtopic.moduleIndex])[activeSubtopic.subtopicIndex].details as Resource).duration && ` • ${(parseSubtopics(generatedTrack.modules[activeSubtopic.moduleIndex])[activeSubtopic.subtopicIndex].details as Resource).duration} min`}
                        </p>
                        <a
                          href={(parseSubtopics(generatedTrack.modules[activeSubtopic.moduleIndex])[activeSubtopic.subtopicIndex].details as Resource).url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline text-sm mt-2 block"
                        >
                          Access Resource
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-3">
                      {getActivityIcon((parseSubtopics(generatedTrack.modules[activeSubtopic.moduleIndex])[activeSubtopic.subtopicIndex].details as Activity).type)}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 capitalize">
                          {(parseSubtopics(generatedTrack.modules[activeSubtopic.moduleIndex])[activeSubtopic.subtopicIndex].details as Activity).type}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {(parseSubtopics(generatedTrack.modules[activeSubtopic.moduleIndex])[activeSubtopic.subtopicIndex].details as Activity).pointsValue} points
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          {(parseSubtopics(generatedTrack.modules[activeSubtopic.moduleIndex])[activeSubtopic.subtopicIndex].details as Activity).instructions || 'Complete this activity to earn points.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={24} className="text-red-600 dark:text-red-400" />
                <h3 className="text-lg font-bold dark:text-white">Confirm Deletion</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                Are you sure you want to delete this track? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-300"
                  data-no-fd
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteTrack(deleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-all duration-300"
                  data-no-fd
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          @keyframes slide-in {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .animate-slide-in {
            animation: slide-in 0.5s ease-out;
          }
          .animate-fade-in {
            animation: fade-in 0.5s ease-out;
          }
        `}</style>
      </div>
    </div>
  );
};

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
export default TracksGenerator;