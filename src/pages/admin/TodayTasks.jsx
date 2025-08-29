"use client";
import { useState, useEffect } from "react";
import { toast, Toaster } from "react-hot-toast";
import { User } from "lucide-react";
import TodayTasksTable from "../../components/tables/TodayTasktable";

// Complete CORS-safe image utilities - all in one place
const convertGoogleDriveImageUrl = (url) => {
  if (!url || typeof url !== 'string') return null;

  const cleanUrl = url.trim().replace(/^"|"$/g, '');
  
  // If it's already a CORS-safe URL, return it
  if (cleanUrl.includes('drive.google.com/uc?export=view') || 
      cleanUrl.includes('lh3.googleusercontent.com')) {
    return cleanUrl;
  }

  // Extract file ID from various Google Drive URL formats
  let fileId = null;
  
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9-_]+)/,
    /[?&]id=([a-zA-Z0-9-_]+)/,
    /\/d\/([a-zA-Z0-9-_]+)/,
    /\/open\?id=([a-zA-Z0-9-_]+)/,
  ];

  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match) {
      fileId = match[1];
      break;
    }
  }

  if (!fileId) {
    // If it's not a Google Drive URL but looks like a valid URL, return it
    if (cleanUrl.startsWith('http') && !cleanUrl.includes('drive.google.com')) {
      return cleanUrl;
    }
    return null;
  }

  // Return CORS-safe URL (NO thumbnail URLs!)
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
};

// Process spreadsheet image data
const processSpreadsheetImageData = (rawImageData) => {
  if (!rawImageData || typeof rawImageData !== 'string') {
    return { imageUrl: null, userName: '' };
  }

  const cleanedData = rawImageData.replace(/^"|"$/g, '').trim();
  
  if (!cleanedData || cleanedData.toLowerCase() === 'link') {
    return { imageUrl: null, userName: '' };
  }

  let imageUrl = '';
  let userName = '';

  if (cleanedData.includes(',')) {
    // Format: "imageUrl,userName"
    const parts = cleanedData.split(/,(.+)/);
    imageUrl = parts[0]?.trim() || '';
    userName = parts[1]?.trim() || '';
  } else if (cleanedData.startsWith('http')) {
    // Only image URL, no name
    imageUrl = cleanedData.trim();
    userName = '';
  } else {
    // Only name, no image URL
    imageUrl = '';
    userName = cleanedData.trim();
  }

  // Convert image URL to CORS-safe format if it exists
  const corsafeImageUrl = imageUrl ? convertGoogleDriveImageUrl(imageUrl) : null;

  return {
    imageUrl: corsafeImageUrl,
    userName: userName || '',
    combinedValue: userName ? `${imageUrl},${userName}` : imageUrl || userName
  };
};

// Safe Image Component with fallbacks
const SafeImage = ({ 
  src, 
  alt = 'Image', 
  className = '', 
  onError, 
  name = 'User',
  showInitials = true,
  ...props 
}) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  // Get initials for fallback
  const getInitials = (name) => {
    if (!name || name === 'Unknown') return '?';
    return name
      .split(' ')
      .slice(0, 2)
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
  };

  // Reset when src changes
  useEffect(() => {
    setCurrentSrc(src);
    setHasError(false);
  }, [src]);

  const handleImageError = () => {
    setHasError(true);
    setCurrentSrc(null);
    if (onError) onError();
  };

  const handleImageLoad = () => {
    setHasError(false);
  };

  // Show fallback (initials or placeholder)
  if (hasError || !currentSrc) {
    if (showInitials) {
      return (
        <div className={`${className} bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-semibold text-xs`}>
          {getInitials(name)}
        </div>
      );
    } else {
      return (
        <div className={`${className} bg-gray-200 flex items-center justify-center`}>
          <span className="text-gray-400 text-xs">No Image</span>
        </div>
      );
    }
  }

  // Show actual image
  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={handleImageError}
      onLoad={handleImageLoad}
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      loading="eager"
      {...props}
    />
  );
};

const AdminTodayTasks = () => {
  const [todayTasks, setTodayTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("col23");
  const [filterValue, setFilterValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPersonDropdown, setShowPersonDropdown] = useState(false);

  const DISPLAY_COLUMNS = ["col2", "col3", "col4", "col14"];
  const SPREADSHEET_ID = "1Qzzb5c26yWJdEpsSKXLgqcrwcxehmDhHBdldBETHKpY";
  // Column P (16th column, 0-indexed = col15) represents "Today Task"
  const TODAY_TASK_COLUMN = "col15";

  const fetchTodayData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(
        `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=Data`
      );
      const text = await response.text();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      const data = JSON.parse(text.substring(jsonStart, jsonEnd + 1));

      const fmsItems = data.table.rows.map((row, rowIndex) => {
        const itemObj = {
          _id: `${rowIndex}-${Math.random().toString(36).substr(2, 9)}`,
          _rowIndex: rowIndex + 1,
        };
        if (row.c) {
          row.c.forEach((cell, i) => {
            itemObj[`col${i}`] = cell?.v ?? cell?.f ?? "";
          });
        }

        const rawValue = String(itemObj.col23 || "").replace(/^"|"$/g, "");
        
        // Use CORS-safe image processing
        const { imageUrl, userName, combinedValue } = processSpreadsheetImageData(rawValue);

        itemObj._imageUrl = imageUrl;
        itemObj._userName = userName;
        itemObj._combinedValue = combinedValue;

        return itemObj;
      });

      // Filter items where display columns have data AND Today Task > 0
      const filteredItems = fmsItems.filter((item) => {
        // Check if display columns have data
        const hasDisplayData = DISPLAY_COLUMNS.some((colId) => {
          const value = item[colId];
          return value && String(value).trim() !== "";
        });

        // Check if Today Task value > 0 (Column P = col15)
        const todayTaskValue = parseFloat(item[TODAY_TASK_COLUMN]) || 0;
        const hasTodayTask = todayTaskValue > 0;

        console.log(`Row ${item._rowIndex}: Today Task (col15) = ${item[TODAY_TASK_COLUMN]}, Parsed = ${todayTaskValue}, Has Today Task = ${hasTodayTask}`);

        return hasDisplayData && hasTodayTask;
      });

      setTodayTasks(filteredItems);
      toast.success(`Fetched ${filteredItems.length} tasks with Today Task > 0`);
    } catch (err) {
      console.error("❌ Error fetching today data:", err);
      setError(err.message);
      toast.error(`Failed to load: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayData();
  }, []);

  const getPersonNamesWithImages = () => {
    const personMap = new Map();

    todayTasks.forEach((item) => {
      const combinedValue = item._combinedValue;
      if (combinedValue && combinedValue.trim() !== "") {
        if (!personMap.has(combinedValue)) {
          personMap.set(combinedValue, {
            value: combinedValue,
            // Show actual name if available, otherwise show "Unknown"
            displayName: item._userName || "Unknown", 
            imageUrl: item._imageUrl,
          });
        }
      }
    });

    return Array.from(personMap.values()).sort((a, b) =>
      a.displayName.localeCompare(b.displayName)
    );
  };

  const getFMSNames = () => {
    const fmsNames = new Set();
    todayTasks.forEach((item) => {
      const fmsName = String(item.col2 || "").trim();
      if (fmsName !== "") {
        fmsNames.add(fmsName);
      }
    });
    return Array.from(fmsNames).sort();
  };

  const filteredTasks = todayTasks.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = DISPLAY_COLUMNS.some((colId) =>
      String(item[colId] || "")
        .toLowerCase()
        .includes(term)
    );
    const matchesFilter = filterValue
      ? item._combinedValue === filterValue
      : true;
    return matchesSearch && matchesFilter;
  });

  const handlePersonSelect = (person) => {
    setFilterType("col23");
    setFilterValue(person.value);
    setShowPersonDropdown(false);
  };

  const selectedPerson = getPersonNamesWithImages().find(
    (p) => p.value === filterValue
  );

  // Enhanced image component with fallback - using SafeImage component
  const PersonImage = ({ person, className }) => {
    return (
      <SafeImage
        src={person.imageUrl}
        alt={person.displayName}
        name={person.displayName}
        className={className}
        showInitials={true}
      />
    );
  };

  return (
    <div className="space-y-4" style={{ height: "calc(110vh - 90px)",marginTop:"-40px" }}>
      
      {/* Header */}
      <div className="flex justify-between items-center pt-2">
        <h1 className="text-2xl font-bold text-gray-800">Today Tasks</h1>
        <div className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
          {filteredTasks.length} Today Task
          {filteredTasks.length !== 1 ? "s" : ""} (> 0)
        </div>
      </div>

      {/* Search + Inline Filter */}
      <div className="bg-white p-3 rounded border space-y-3">
        <div className="grid md:grid-cols-3 gap-3">
          {/* Search Input */}
          <input
            type="text"
            placeholder="Search..."
            className="px-3 py-2 border rounded-md w-full max-w-xs focus:ring-green-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {/* Custom Person Dropdown */}
          <div className="relative">
            <div
              className="border px-3 py-2 rounded w-full focus:ring-green-500 focus:border-green-500 bg-white cursor-pointer flex justify-between items-center"
              onClick={() => setShowPersonDropdown(!showPersonDropdown)}
            >
              {selectedPerson ? (
                <div className="flex items-center">
                  <PersonImage 
                    person={selectedPerson} 
                    className="w-6 h-6 rounded-full mr-2 object-cover" 
                  />
                  <span>{selectedPerson.displayName}</span>
                </div>
              ) : (
                <span>All Persons</span>
              )}
              <svg
                className={`w-4 h-4 ml-2 transition-transform ${
                  showPersonDropdown ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>

            {showPersonDropdown && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                <div
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() =>
                    handlePersonSelect({
                      value: "",
                      displayName: "All Persons",
                    })
                  }
                >
                  All Persons
                </div>
                {getPersonNamesWithImages().map((person) => (
                  <div
                    key={person.value}
                    className="p-2 hover:bg-gray-100 cursor-pointer flex items-center"
                    onClick={() => handlePersonSelect(person)}
                  >
                    <PersonImage 
                      person={person} 
                      className="w-6 h-6 rounded-full mr-2 object-cover" 
                    />
                    <span>{person.displayName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FMS Name Dropdown */}
          <div>
            <select
              value={filterType === "col2" ? filterValue : ""}
              onChange={(e) => {
                setFilterType("col2");
                setFilterValue(e.target.value);
              }}
              className="border px-3 py-2 rounded w-full focus:ring-green-500 focus:border-green-500"
            >
              <option value="">All FMS Names</option>
              {getFMSNames().map((fmsName) => (
                <option key={fmsName} value={fmsName}>
                  {fmsName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      {isLoading ? (
        <div className="bg-white rounded-lg border shadow-sm p-6 text-center">
          <p className="text-gray-500">Loading tasks...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-lg border shadow-sm p-6 text-center">
          <p className="text-red-500">Error: {error}</p>
          <button
            onClick={fetchTodayData}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      ) : filteredTasks.length > 0 ? (
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-gray-800">
              {filterValue
                ? `Showing ${filterType === "col2" ? "FMS Name" : "Person"}: ${
                    selectedPerson?.displayName || filterValue
                  }`
                : "All Tasks"}
            </h2>
       
          </div>
          <div className="h-[calc(100vh-270px)] overflow-hidden">
            <TodayTasksTable
              isCompact={true}
              filterTasks={filteredTasks}
              type="pending"
            />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border shadow-sm p-6 text-center">
          <p className="text-gray-500">No tasks with Today Task > 0 match your current filters.</p>
        </div>
      )}
    </div>
  );
};

export default AdminTodayTasks;