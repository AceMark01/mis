import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { Briefcase, CheckSquare, Target, Users, MessageSquare, Database, Link, AlertCircle, PlayCircle, User, TrendingUp, RefreshCw } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const CompleteKpiDashboard = () => {
  console.log("🚀 COMPLETE KPI DASHBOARD STARTED");
  
  const { user, submitDesignationToDashboard } = useAuth();
  console.log("👤 User from Auth:", user);
  
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDesignation, setSelectedDesignation] = useState('');
  const [availableDesignations, setAvailableDesignations] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [pendingTasks, setPendingTasks] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);
  
  // Persistent data storage
  const persistentData = useRef(null);
  const hasFetched = useRef(false);
  const abortControllerRef = useRef(null);

  // Google Sheets configuration - Dashboard sheet for both submit and fetch
  const SPREADSHEET_ID = "1etr8qZJ1kombkuemFHF59FNqqKUzVgzffg39bXkZTSA";
  const SHEET_NAME = "Dashboard"; // Dashboard sheet for all operations
  
  // Restore data from localStorage on mount with user-specific keys
  useEffect(() => {
    console.log("🔄 Restoring data from localStorage...");
    
    if (!user) return;
    
    const userKey = user.id || user.username || 'default';
    const storageKey = `kpi_selected_designation_${userKey}`;
    const storedDesignation = localStorage.getItem(storageKey);
    
    if (storedDesignation) {
      setSelectedDesignation(storedDesignation);
      console.log('✅ Restored designation:', storedDesignation);
      
      const stored = localStorage.getItem(`kpi_dashboard_data_${storedDesignation}`);
      if (stored) {
        try {
          const parsedData = JSON.parse(stored);
          setPendingTasks(parsedData);
          persistentData.current = parsedData;
          hasFetched.current = true;
          setIsEmpty(parsedData.length === 0);
          console.log('✅ Restored designation-specific data');
        } catch (e) {
          console.error('❌ Failed to restore data:', e);
          localStorage.removeItem(`kpi_dashboard_data_${storedDesignation}`);
        }
      }
    }
  }, [user]);

  // Handle user authentication and designation setup
  useEffect(() => {
    console.log("👤 User effect triggered:", user);
    
    if (user) {
      console.log('👤 User loaded:', {
        name: user.name,
        id: user.id || user.username,
        designations: user.designations
      });
      
      if (user.designations && user.designations.length > 0) {
        setAvailableDesignations(user.designations);
        
        const userKey = user.id || user.username || 'default';
        const storageKey = `kpi_selected_designation_${userKey}`;
        const storedDesignation = localStorage.getItem(storageKey);
        
        // Check if stored designation is valid for current user
        const isValidDesignation = storedDesignation && user.designations.includes(storedDesignation);
        
        if (!isValidDesignation) {
          const firstDesignation = user.designations[0];
          setSelectedDesignation(firstDesignation);
          localStorage.setItem(storageKey, firstDesignation);
          console.log('🎯 Auto-selected user designation:', firstDesignation);
          
          // Clear invalid cached data if exists
          if (storedDesignation) {
            localStorage.removeItem(`kpi_dashboard_data_${storedDesignation}`);
            console.log("🗑️ CompleteKpiDashboard: Cleared invalid designation data:", storedDesignation);
          }
          
          // Since AuthContext already submitted designation on login, just fetch data
          fetchPendingData(firstDesignation);
        } else {
          setSelectedDesignation(storedDesignation);
          console.log('✅ CompleteKpiDashboard: Using valid stored designation:', storedDesignation);
          
          const hasDataForCurrentDesignation = localStorage.getItem(`kpi_dashboard_data_${storedDesignation}`);
          if (!hasDataForCurrentDesignation) {
            console.log('🔍 No cached data found, fetching fresh data...');
            fetchPendingData(storedDesignation);
          }
        }
      } else {
        console.warn('⚠️ No designations found for user:', user.name);
        setAvailableDesignations([]);
        setIsEmpty(true);
      }
      setIsLoading(false);
    } else {
      console.log("❌ No user data available");
    }
  }, [user]);

  // Fetch pending data from Dashboard sheet (same structure as KpikraTable) - Improved error handling
  const fetchPendingData = useCallback(async (designationToFetch = selectedDesignation) => {
    if (!designationToFetch) {
      setPendingTasks([]);
      return;
    }

    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setIsDataLoading(true);
      setError(null);
      setIsEmpty(false);
      
      console.log(`🔍 Fetching data for designation: ${designationToFetch} from Dashboard sheet`);
      
      // Reduced wait time for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Fetch from Dashboard sheet (same as KpikraTable)
      const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`;
      
      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }

      const text = await response.text();
      
      // Improved JSON parsing
      let jsonData;
      try {
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}') + 1;
        if (jsonStart === -1 || jsonEnd === 0) {
          throw new Error('Invalid response format from Google Sheets');
        }
        jsonData = JSON.parse(text.substring(jsonStart, jsonEnd));
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        throw new Error('Failed to parse response from Google Sheets');
      }

      // Check if we have valid data
      if (!jsonData.table || !jsonData.table.rows) {
        console.log('⚠️ No data found in Dashboard sheet');
        setPendingTasks([]);
        setIsEmpty(true);
        return;
      }

      const items = jsonData.table.rows.map((row, rowIndex) => {
        const itemObj = { 
          _id: `${rowIndex}-${Math.random().toString(36).substr(2, 9)}`,
          _rowIndex: rowIndex + 1,
          _designation: designationToFetch,
          _userId: user?.id || user?.username || 'unknown',
          _fetchTime: new Date().toISOString()
        };
        if (row.c) {
          row.c.forEach((cell, i) => {
            itemObj[`col${i}`] = cell?.v ?? cell?.f ?? "";
          });
        }
        return itemObj;
      });

      console.log(`✅ Successfully fetched ${items.length} records from Dashboard sheet`);
      
      if (items.length === 0) {
        setIsEmpty(true);
      } else {
        setPendingTasks(items);
        persistentData.current = items;
        hasFetched.current = true;
        setIsEmpty(false);
        
        // Cache the data
        const storageKey = `kpi_dashboard_data_${designationToFetch}`;
        try {
          localStorage.setItem(storageKey, JSON.stringify(items));
        } catch (storageError) {
          console.warn('Failed to cache data:', storageError);
        }
      }
      
      return items;
    } catch (err) {
      if (err.name !== 'AbortError') {
        let errorMessage = err.message;
        
        if (err.message.includes('Failed to fetch')) {
          errorMessage = 'Network error - please check your internet connection and try again';
        } else if (err.message.includes('404')) {
          errorMessage = 'Dashboard sheet not found - please contact administrator';
        } else if (err.message.includes('403')) {
          errorMessage = 'Access denied - please check sheet permissions';
        } else if (err.message.includes('Invalid response format')) {
          errorMessage = 'Invalid data format from Google Sheets';
        }
        
        console.error('❌ Fetch error:', err);
        setError(errorMessage);
      }
    } finally {
      setIsDataLoading(false);
      abortControllerRef.current = null;
    }
  }, [selectedDesignation, user?.id, user?.username]);

  // Handle designation dropdown change
  const handleDropdownChange = async (newDesignation) => {
    if (newDesignation === selectedDesignation) return;

    console.log('🔄 Changing designation from', selectedDesignation, 'to', newDesignation);

    // Clear previous data
    setPendingTasks([]);
    persistentData.current = null;
    hasFetched.current = false;
    setIsEmpty(false);
    setError(null);

    setSelectedDesignation(newDesignation);
    
    const userKey = user?.id || user?.username || 'default';
    const storageKey = `kpi_selected_designation_${userKey}`;
    localStorage.setItem(storageKey, newDesignation);
    
    setSubmitMessage("");

    try {
      setIsSubmitting(true);
      
      // Check for cached data first
      const cachedData = localStorage.getItem(`kpi_dashboard_data_${newDesignation}`);
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          setPendingTasks(parsedData);
          persistentData.current = parsedData;
          hasFetched.current = true;
          setIsEmpty(parsedData.length === 0);
          console.log('✅ Using cached data for:', newDesignation);
        } catch (e) {
          localStorage.removeItem(`kpi_dashboard_data_${newDesignation}`);
        }
      }

      // Submit designation to Dashboard sheet using AuthContext method
      await submitDesignationToDashboard(newDesignation, user);
      
      // Fetch fresh data from Dashboard sheet
      await fetchPendingData(newDesignation);
      
      setSubmitMessage("✅ Data loaded successfully!");
    } catch (error) {
      console.error("❌ Error changing designation:", error);
      setSubmitMessage("❌ Failed to load data - " + error.message);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSubmitMessage(""), 3000);
    }
  };

  // Manual refresh function
  const handleManualRefresh = () => {
    if (!selectedDesignation) return;
    
    console.log('🔄 Manual refresh triggered for:', selectedDesignation);
    hasFetched.current = false;
    localStorage.removeItem(`kpi_dashboard_data_${selectedDesignation}`);
    setPendingTasks([]);
    persistentData.current = null;
    setIsEmpty(false);
    setError(null);
    
    fetchPendingData(selectedDesignation);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Get current data (same structure as KpikraTable)
  const currentData = pendingTasks || persistentData.current || [];

  // Process data for UI components (same as KpikraTable structure)
  const { firstRowData, row6Data, tableData } = useMemo(() => ({
    firstRowData: currentData[0] || {},
    row6Data: currentData[5] || {},
    tableData: currentData.slice(3) || []
  }), [currentData]);

  // FIXED: Safe string conversion and split for communication team (same as KpikraTable)
  const communicationTeam = useMemo(() => {
    const col1Value = row6Data.col1;
    if (!col1Value) return [];
    
    // Convert to string safely and split
    return String(col1Value).split(",").map(item => item.trim()).filter(item => item.length > 0);
  }, [row6Data]);

  const howToCommunicate = row6Data.col2 || "No data available";
  const keyPerson = row6Data.col0 || "No data available";

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-red-800">Error Loading Data</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button 
              onClick={handleManualRefresh}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              disabled={isDataLoading || isSubmitting}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-yellow-800">No Data Available</h3>
            <p className="text-sm text-yellow-700 mt-1">
              No data found for {selectedDesignation} in the Dashboard sheet.
            </p>
            <button
              onClick={handleManualRefresh}
              className="mt-2 text-sm text-yellow-600 hover:text-yellow-800 underline"
              disabled={isDataLoading || isSubmitting}
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Designation Selector */}
      <div >
        {submitMessage && (
          <div className={`mt-2 text-sm ${submitMessage.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
            {submitMessage}
          </div>
        )}
      </div>

      {/* Loading Data State */}
      {(isDataLoading || isSubmitting) && (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-600">
              {isSubmitting ? 'Submitting designation to Dashboard sheet...' : 'Loading data...'}
            </p>
          </div>
        </div>
      )}

      {/* Main Content - Same structure as KpikraTable */}
      {!isDataLoading && !isSubmitting && selectedDesignation && currentData && currentData.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Role Information Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-100 p-6 transform transition-all hover:scale-[1.02]">
              <div className="flex items-center gap-3 mb-4">
                <Briefcase className="w-6 h-6 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-800">Role Details</h2>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <h3 className="text-sm font-medium text-blue-600 mb-2">Actual Role</h3>
                <p className="text-gray-800">{firstRowData.col1 || "No data available"}</p>
              </div>
            </div>

            {/* Tasks Card */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl shadow-sm border border-emerald-100 p-6 transform transition-all hover:scale-[1.02]">
              <div className="flex items-center gap-3 mb-4">
                <CheckSquare className="w-6 h-6 text-emerald-600" />
                <h2 className="text-lg font-semibold text-gray-800">Task Overview</h2>
              </div>
              <div className="bg-white rounded-lg p-6 border border-emerald-100 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-4xl font-bold text-emerald-600">{firstRowData.col3 || "0"}</p>
                  <p className="text-sm text-gray-600 mt-1">Total Tasks</p>
                </div>
              </div>
            </div>

            {/* Performance Scoring Card */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-sm border border-purple-100 p-6 transform transition-all hover:scale-[1.02]">
              <div className="flex items-center gap-3 mb-4">
                <Target className="w-6 h-6 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-800">Performance Scoring</h2>
              </div>
              <div className="space-y-4">
                {firstRowData.col4 && (
                  <a
                    href={firstRowData.col4}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-white rounded-lg p-4 border border-purple-100 hover:bg-purple-50 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <PlayCircle className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-medium text-purple-600">How Scoring Works</span>
                    </div>
                  </a>
                )}
                {firstRowData.col5 && (
                  <a
                    href={firstRowData.col5}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-white rounded-lg p-4 border border-purple-100 hover:bg-purple-50 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <PlayCircle className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-medium text-purple-600">How To Score Better</span>
                    </div>
                  </a>
                )}
              </div>
            </div>

            {/* Communication Section */}
            <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Team Communication Card */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-sm border border-amber-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-6 h-6 text-amber-600" />
                  <h2 className="text-lg font-semibold text-gray-800">Team Communication</h2>
                </div>
                <div className="bg-white rounded-lg p-4 border border-amber-100">
                  <h3 className="text-sm font-medium text-amber-600 mb-3">Communication Team</h3>
                  {communicationTeam.length > 0 ? (
                    <ul className="space-y-2">
                      {communicationTeam.map((member, index) => (
                        <li
                          key={index}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-amber-50 transition-colors"
                        >
                          <Users className="w-4 h-4 text-amber-500" />
                          <span className="text-gray-700">{member}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No team members available</p>
                  )}
                </div>
              </div>

              {/* Communication Process Card */}
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl shadow-sm border border-cyan-100 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <MessageSquare className="w-6 h-6 text-cyan-600" />
                  <h2 className="text-lg font-semibold text-gray-800">Communication Process</h2>
                </div>
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border border-cyan-100">
                    <h3 className="text-sm font-medium text-cyan-600 mb-2">How to Communicate</h3>
                    <p className="text-gray-700">{howToCommunicate}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-cyan-100">
                    <h3 className="text-sm font-medium text-cyan-600 mb-2">Key Person</h3>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
                        <Users className="w-5 h-5 text-cyan-600" />
                      </div>
                      <p className="text-gray-700">{keyPerson}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Systems Table */}
            <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-white p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <Database className="w-6 h-6 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-800">Systems and Resources</h2>
                </div>
                <p className="text-sm text-gray-600 mt-1">Personal systems for {selectedDesignation}</p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        System Name
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Task Name
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Links
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {tableData.length > 0 ? (
                      tableData.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{row.col0 || "N/A"}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-700">{row.col1 || "N/A"}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-700">{row.col2 || "N/A"}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              {row.col3 && (
                                <a
                                  href={row.col3}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                                >
                                  <Link className="w-4 h-4" />
                                  <span className="text-sm font-medium">System</span>
                                </a>
                              )}
                              {row.col4 && (
                                <a
                                  href={row.col4}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 transition-colors"
                                >
                                  <Database className="w-4 h-4" />
                                  <span className="text-sm font-medium">Dashboard</span>
                                </a>
                              )}
                              {row.col5 && (
                                <a
                                  href={row.col5}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-purple-600 hover:text-purple-800 transition-colors"
                                >
                                  <PlayCircle className="w-4 h-4" />
                                  <span className="text-sm font-medium">Training</span>
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                          No data available for your role
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(CompleteKpiDashboard);