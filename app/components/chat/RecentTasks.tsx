import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from '@remix-run/react';
import { type ChatHistoryItem } from '~/lib/persistence';
import { ChatAPI, type ChatListItem } from '~/lib/api/chatApi';
import { useAuth } from '~/lib/hooks/useAuth.tsx';

// Helper function to format relative time
function getRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = Date.parse(timestamp);
  const diffMs = now - then;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
}

export const RecentTasks: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'tasks' | 'deployed'>('tasks');
  const [currentPage, setCurrentPage] = useState(1);
  const [tasksPerPage, setTasksPerPage] = useState(10);
  const [tasks, setTasks] = useState<ChatHistoryItem[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isLoadingFromServer, setIsLoadingFromServer] = useState(false);

  // Load chats from cloud storage
  const loadTasks = useCallback(async () => {
    // Try to load from server if authenticated
    if (ChatAPI.isAuthenticated()) {
      try {
        setIsLoadingFromServer(true);
        console.log('Loading chats from server...');
        const { chats } = await ChatAPI.listChats(100, 0);
        
        // Convert server chat format to local format for compatibility
        const convertedChats: ChatHistoryItem[] = chats.map((chat: ChatListItem) => ({
          id: chat.id,
          urlId: chat.id, // Use same ID for URL
          description: chat.title || undefined,
          messages: [], // We don't load full messages in list view
          timestamp: new Date(chat.updated_at).toISOString(),
          metadata: undefined,
          _messageCount: chat.message_count, // Store count for display
        }));
        
        console.log('Loaded chats from server:', convertedChats.length);
        setTasks(convertedChats);
      } catch (error: any) {
        console.error('Failed to load chats from server:', error);
        setTasks([]);
      } finally {
        setIsLoadingFromServer(false);
      }
    } else {
      console.warn('Not authenticated - no chats to load');
      setTasks([]);
    }
  }, [user]);

  useEffect(() => {
    loadTasks();
    
    // Poll for database updates every 30 seconds to catch new chats
    const interval = setInterval(() => {
      loadTasks();
    }, 30000); // Changed from 2000ms to 30000ms (30 seconds)
    
    return () => clearInterval(interval);
  }, [loadTasks]);

  const totalTasks = tasks.length;
  const totalPages = Math.ceil(totalTasks / tasksPerPage);
  const startIndex = (currentPage - 1) * tasksPerPage;
  const endIndex = Math.min(startIndex + tasksPerPage, totalTasks);
  const currentTasks = tasks.slice(startIndex, endIndex);

  const handleTaskClick = (urlId: string | undefined) => {
    if (urlId) {
      navigate(`/chat/${urlId}`);
    }
  };

  const handleRefresh = () => {
    loadTasks();
  };

  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this app?')) {
      try {
        // Delete from server if authenticated
        if (ChatAPI.isAuthenticated()) {
          await ChatAPI.deleteChat(taskId);
          console.log('Deleted chat from server:', taskId);
          setOpenMenuId(null);
          loadTasks(); // Refresh the list
        } else {
          console.warn('Cannot delete - not authenticated');
          alert('Please sign in to delete chats');
        }
      } catch (error) {
        console.error('Failed to delete task:', error);
        alert('Failed to delete the app. Please try again.');
      }
    }
  };

  const handleDuplicateTask = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement duplicate functionality
    console.log('Duplicate task:', taskId);
    setOpenMenuId(null);
  };

  const toggleMenu = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === taskId ? null : taskId);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (openMenuId) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuId]);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  return (
    <div className="flex items-center justify-center w-full">
      <div className="w-full max-w-6xl">
        <div className="mt-[100px]" style={{ opacity: 1, transform: 'none' }}>
          <div className="flex-col hidden px-4 space-y-5 md:flex">
            {/* Header with tabs */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 md:space-x-4">
                <div
                  className="flex items-center space-x-1 cursor-pointer"
                  onClick={() => setActiveTab('tasks')}
                >
                  <img
                    alt="Recent apps"
                    src="https://assets.emergent.sh/assets/task.svg"
                    className={`h-5 md:h-6 w-fit ${activeTab === 'tasks' ? 'opacity-100' : 'opacity-50'}`}
                  />
                  <h2
                    className={`text-[12px] md:text-lg ${
                      activeTab === 'tasks' ? 'text-white' : 'text-[#898E98]'
                    }`}
                  >
                    Recent Apps
                  </h2>
                </div>
                <div className="w-[2px] h-[18px] bg-white/20"></div>
                <div
                  className="flex items-center space-x-1 cursor-pointer"
                  onClick={() => setActiveTab('deployed')}
                >
                  <img
                    alt="Deployed apps"
                    src="https://assets.emergent.sh/assets/globe_white.svg"
                    className={`h-5 md:h-6 w-5 md:w-6 ${activeTab === 'deployed' ? 'opacity-100' : 'opacity-50'}`}
                  />
                  <h2
                    className={`text-[12px] md:text-lg ${
                      activeTab === 'deployed' ? 'text-white' : 'text-[#898E98]'
                    }`}
                  >
                    Deployed Apps
                  </h2>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleRefresh}
                  className="inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 ease-in-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-20 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 pr-3 w-8 h-8 text-white justify-center bg-transparent border-none hover:opacity-80"
                >
                  <div className="flex items-center w-full">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-rotate-cw h-4 w-4"
                    >
                      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
                      <path d="M21 3v5h-5"></path>
                    </svg>
                  </div>
                </button>
              </div>
            </div>

            {/* Table Container */}
            <div className="relative rounded-2xl border border-[#252629] bg-[#0F0F10] overflow-clip">
              {/* Table Header */}
              <div className="sticky top-0 z-10 mb-4">
                <table className="w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-[#18181A]">
                      <th className="text-white/40 font-[Inter] font-normal px-6 py-3 rounded-tl-lg text-[12px] tracking-[1px] w-[70%] text-left">
                        APPS
                      </th>
                      <th className="text-white/40 font-[Inter] font-normal px-6 py-3 text-[12px] tracking-[1px] w-[25%] text-left">
                        LAST MODIFIED
                      </th>
                      <th className="text-white/40 font-[Inter] font-normal px-6 py-3 text-[12px] tracking-[1px] w-[5%] text-left"></th>
                    </tr>
                  </thead>
                </table>
              </div>

              {/* Table Body */}
              <div className="min-h-[500px] max-h-[500px] overflow-y-auto relative text-[12px]">
                <div className="relative w-full overflow-auto">
                  <table className="caption-bottom text-sm relative w-full border-separate border-spacing-0">
                    <thead className="[&_tr]:border-b hidden">
                      <tr className="border-b transition-colors data-[state=selected]:bg-muted bg-[#18181A] hover:bg-[#18181A]">
                        <th className="h-12 text-left align-middle [&:has([role=checkbox])]:pr-0 text-[#8F8F98] font-normal px-6 rounded-tl-lg text-sm font-berkeley w-[70%]">
                          Apps
                        </th>
                        <th className="h-12 text-left align-middle [&:has([role=checkbox])]:pr-0 text-[#8F8F98] font-normal px-6 text-sm font-berkeley w-[25%]">
                          Last Modified
                        </th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0 w-full">
                      {currentTasks.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-12 text-center">
                            <div className="flex flex-col items-center justify-center space-y-3">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-16 h-16 text-gray-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                                />
                              </svg>
                              <div>
                                <p className="text-lg font-medium text-gray-300">No apps yet</p>
                                <p className="text-sm text-gray-500 mt-1">Start a new conversation to create your first app!</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        currentTasks.map((task) => (
                          <tr
                            key={task.id}
                            onClick={() => handleTaskClick(task.urlId)}
                            className="border-b data-[state=selected]:bg-muted transition-all duration-150 cursor-pointer max-h-[68px] group"
                          >
                            <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-[#FFFFFFCC] text-[13px] px-6 w-[70%]">
                              <div className="flex items-start gap-2">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="w-0 h-0 group-hover:w-4 group-hover:h-4 transition-all duration-150 text-gray-400 flex-shrink-0"
                                  style={{ marginTop: '0.375rem' }}
                                >
                                  <path d="m9 18 6-6-6-6"></path>
                                </svg>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium leading-6 tracking-normal text-white/60 group-hover:text-white font-inter transition-all duration-150 line-clamp-1">
                                    {task.description || 'New Chat'}
                                  </div>
                                  <span className="font-inter font-medium text-[13px] lineheight-5 tracking-normal text-white align-middle text-opacity-40 group-hover:text-opacity-60 transition-all duration-150 line-clamp-1">
                                    {(task as any)._messageCount || task.messages?.length || 0} {((task as any)._messageCount || task.messages?.length || 0) === 1 ? 'message' : 'messages'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 [&:has([role=checkbox])]:pr-0 text-[#C2C2CC] text-[12px] md:text-[14px] pl-8 pr-6 py-4 w-[25%] font-inter opacity-50 group-hover:opacity-70 transition-all duration-150 align-top leading-6">
                              {getRelativeTime(task.timestamp)}
                            </td>
                            <td className="p-4 [&:has([role=checkbox])]:pr-0 pl-2 pr-0 py-4 w-[5%] text-right align-top">
                              <div className="flex items-center justify-end gap-2 mr-6 relative">
                                <button
                                  title="Options"
                                  onClick={(e) => toggleMenu(task.id, e)}
                                  className="pb-1.5 rounded transition-colors inline-flex items-center justify-center bg-transparent border-none"
                                >
                                  <svg
                                    width="32"
                                    height="8"
                                    viewBox="0 0 16 4"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="p-1.5 flex w-8 h-8 rounded-md gap-[11.43px] opacity-40 hover:opacity-80"
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <path
                                      fillRule="evenodd"
                                      clipRule="evenodd"
                                      d="M3.55556 2.00043C3.55556 2.47193 3.36825 2.92411 3.03486 3.25751C2.70146 3.59091 2.24927 3.77821 1.77778 3.77821C1.30628 3.77821 0.854097 3.59091 0.520699 3.25751C0.187301 2.92411 0 2.47193 0 2.00043C0 1.52894 0.187301 1.07675 0.520699 0.743356C0.854097 0.409958 1.30628 0.222656 1.77778 0.222656C2.24927 0.222656 2.70146 0.409958 3.03486 0.743356C3.36825 1.07675 3.55556 1.52894 3.55556 2.00043ZM8 0.222656C8.4715 0.222656 8.92368 0.409958 9.25708 0.743356C9.59048 1.07675 9.77778 1.52894 9.77778 2.00043C9.77778 2.47193 9.59048 2.92411 9.25708 3.25751C8.92368 3.59091 8.4715 3.77821 8 3.77821C7.5285 3.77821 7.07632 3.59091 6.74292 3.25751C6.40952 2.92411 6.22222 2.47193 6.22222 2.00043C6.22222 1.52894 6.40952 1.07675 6.74292 0.743356C7.07632 0.409958 7.5285 0.222656 8 0.222656ZM14.2222 0.222656C14.6937 0.222656 15.1459 0.409958 15.4793 0.743356C15.8127 1.07675 16 1.52894 16 2.00043C16 2.47193 15.8127 2.92411 15.4793 3.25751C15.1459 3.59091 14.6937 3.77821 14.2222 3.77821C13.7507 3.77821 13.2985 3.59091 12.9651 3.25751C12.6317 2.92411 12.4444 2.47193 12.4444 2.00043C12.4444 1.52894 12.6317 1.07675 12.9651 0.743356C13.2985 0.409958 13.7507 0.222656 14.2222 0.222656Z"
                                      fill="white"
                                      fillOpacity="1"
                                    ></path>
                                  </svg>
                                </button>
                                
                                {/* Dropdown Menu */}
                                {openMenuId === task.id && (
                                  <div className="absolute right-0 top-8 mt-2 shadow-lg p-1.5 flex flex-col rounded-xl border bg-[#18181A] border-[#242424] z-50 overflow-hidden">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleTaskClick(task.urlId);
                                        setOpenMenuId(null);
                                      }}
                                      className="text-left hover:bg-[#2C2C2E] transition-colors flex items-center gap-3 text-sm text-[#FFFFFF] justify-between w-[148px] h-9 rounded-lg py-2 px-1.5 bg-[#18181A]"
                                    >
                                      <span className="flex-shrink-0">
                                        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                          <path d="M2.3999 13.5999V9.77324L9.27546 2.92879C9.46212 2.74212 9.66953 2.60731 9.89768 2.52435C10.1258 2.44138 10.354 2.3999 10.5821 2.3999C10.831 2.3999 11.0695 2.44657 11.2977 2.5399C11.5258 2.63324 11.7332 2.77324 11.9199 2.9599L13.071 4.11101C13.2369 4.29768 13.3666 4.50509 13.4599 4.73324C13.5532 4.96138 13.5999 5.18953 13.5999 5.41768C13.5999 5.64583 13.5584 5.87916 13.4755 6.11768C13.3925 6.3562 13.2577 6.56879 13.071 6.75546L6.22657 13.5999H2.3999ZM4.26657 11.7332H5.44879L9.21324 7.93768L8.65324 7.34657L8.06212 6.78657L4.26657 10.551V11.7332ZM8.65324 7.34657L8.06212 6.78657L9.21324 7.93768L8.65324 7.34657Z" fill="white" fillOpacity="0.6"></path>
                                        </svg>
                                      </span>
                                      <span className="flex-1 font-medium">Open</span>
                                    </button>
                                    <button
                                      onClick={(e) => handleDeleteTask(task.id, e)}
                                      className="text-left hover:bg-[#2C2C2E] transition-colors flex items-center gap-3 text-sm text-[#FFFFFF] justify-between w-[148px] h-9 rounded-lg py-2 px-1.5 bg-[#18181A]"
                                    >
                                      <span className="flex-shrink-0">
                                        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                          <path fillRule="evenodd" clipRule="evenodd" d="M7.19913 3.2C7.06585 3.1998 6.9363 3.24398 6.83092 3.32557C6.72553 3.40716 6.65031 3.52152 6.61713 3.6506L6.44193 4.3346H9.69453L9.51873 3.6506C9.48557 3.52162 9.41044 3.40734 9.30518 3.32576C9.19991 3.24418 9.0705 3.19993 8.93733 3.2H7.19913ZM10.9335 4.3352L10.6809 3.3518C10.5815 2.96496 10.3562 2.62219 10.0405 2.37745C9.72485 2.13272 9.33675 1.99993 8.93733 2H7.19913C6.79971 1.99993 6.41161 2.13272 6.09595 2.37745C5.78028 2.62219 5.55498 2.96496 5.45553 3.3518L5.20293 4.3352H3.26553C3.1064 4.3352 2.95379 4.39841 2.84126 4.51094C2.72874 4.62346 2.66553 4.77607 2.66553 4.9352C2.66553 5.09433 2.72874 5.24694 2.84126 5.35946C2.95379 5.47199 3.1064 5.5352 3.26553 5.5352H3.32553L4.05453 12.3902C4.10151 12.8324 4.31049 13.2415 4.64118 13.5387C4.97188 13.8359 5.40088 14.0003 5.84553 14H10.2855C10.7301 14.0001 11.1589 13.8357 11.4895 13.5385C11.8201 13.2413 12.029 12.8323 12.0759 12.3902L12.8043 5.5352H12.8655C13.0247 5.5352 13.1773 5.47199 13.2898 5.35946C13.4023 5.24694 13.4655 5.09433 13.4655 4.9352C13.4655 4.77607 13.4023 4.62346 13.2898 4.51094C13.1773 4.39841 13.0247 4.3352 12.8655 4.3352H10.9335ZM11.5983 5.5352H4.53273L5.24793 12.2636C5.26365 12.4111 5.33341 12.5475 5.44376 12.6465C5.55412 12.7456 5.69724 12.8002 5.84553 12.8H10.2855C10.4337 12.8001 10.5767 12.7453 10.6869 12.6463C10.7971 12.5473 10.8668 12.4109 10.8825 12.2636L11.5977 5.5352H11.5983ZM6.86553 6.8C7.02466 6.8 7.17727 6.86321 7.28979 6.97574C7.40231 7.08826 7.46553 7.24087 7.46553 7.4V10.4C7.46553 10.5591 7.40231 10.7117 7.28979 10.8243C7.17727 10.9368 7.02466 11 6.86553 11C6.7064 11 6.55379 10.9368 6.44126 10.8243C6.32874 10.7117 6.26553 10.5591 6.26553 10.4V7.4C6.26553 7.24087 6.32874 7.08826 6.44126 6.97574C6.55379 6.86321 6.7064 6.8 6.86553 6.8ZM9.26553 6.8C9.42466 6.8 9.57727 6.86321 9.68979 6.97574C9.80231 7.08826 9.86553 7.24087 9.86553 7.4V10.4C9.86553 10.5591 9.80231 10.7117 9.68979 10.8243C9.57727 10.9368 9.42466 11 9.26553 11C9.1064 11 8.95379 10.9368 8.84126 10.8243C8.72874 10.7117 8.66553 10.5591 8.66553 10.4V7.4C8.66553 7.24087 8.72874 7.08826 8.84126 6.97574C8.95379 6.86321 9.1064 6.8 9.26553 6.8Z" fill="#CCCCCC"></path>
                                        </svg>
                                      </span>
                                      <span className="flex-1 font-medium">Delete</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer with Pagination */}
              <div className="flex items-center justify-between px-6 py-3 bg-[#18181a] text-[#8f8f98]">
                <p className="text-[14px] font-[Inter] font-medium leading-4 text-white/40 w-[200px]">
                  {totalTasks === 0 
                    ? 'No apps yet' 
                    : `Showing ${startIndex + 1}-${endIndex} out of ${totalTasks}`
                  }
                </p>
                {totalTasks > 0 && (
                  <>
                    <div className="flex items-center space-x-1">
                      <button
                        title="Previous page"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        className="flex items-center justify-center w-8 h-8 rounded-[8px] hover:bg-[#2d2d2d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lucide lucide-chevron-left object-contain w-6 h-6"
                        >
                          <path d="m15 18-6-6 6-6"></path>
                        </svg>
                      </button>
                      <button className="flex items-center justify-center font-[Inter] text-[12px] hover:rounded-[8px] w-8 h-8 text-sm transition-colors bg-[#2d2d2d] text-white bg-[#FFF]/5 border border-white/[6%] rounded-[8px]">
                        {currentPage}
                      </button>
                      <button
                        title="Next page"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        className="flex items-center justify-center w-8 h-8 rounded-[8px] hover:bg-[#2d2d2d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lucide lucide-chevron-right object-contain w-6 h-6"
                        >
                          <path d="m9 18 6-6-6-6"></path>
                        </svg>
                      </button>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <p className="text-[14px] font-[Inter] font-medium leading-4 text-white/40">
                        Apps per page :
                      </p>
                      <div className="relative">
                        <select
                          aria-label="Select apps per page"
                          value={tasksPerPage}
                          onChange={(e) => {
                            setTasksPerPage(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                          className="appearance-none bg-[#1A1A1A] font-[Inter] border px-3 py-1 pr-8 text-[#FFF] text-sm focus:outline-none focus:border-[#FFF] border-opacity-[12px] cursor-pointer rounded-[8px]"
                        >
                          <option value="10">10</option>
                          <option value="25">25</option>
                          <option value="50">50</option>
                        </select>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lucide lucide-chevron-down absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 pointer-events-none text-[#8f8f98]"
                        >
                          <path d="m6 9 6 6 6-6"></path>
                        </svg>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


