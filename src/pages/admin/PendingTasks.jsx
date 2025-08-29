

"use client";
import { useState, useEffect } from "react";
import { toast, Toaster } from "react-hot-toast";
import { User } from "lucide-react";

const convertGoogleDriveImageUrl = (url) => {
  if (!url) return null;

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9-_]+)/,
    /id=([a-zA-Z0-9-_]+)/,
    /\/d\/([a-zA-Z0-9-_]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const fileId = match[1];
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;

    }
  }

  return url;
};

const Avatar = ({ imageUrl, userName, size = "w-8 h-8" }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleImageError = () => {
    console.log(`Image failed to load: ${imageUrl}`);
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  if (!imageUrl || imageError) {
    return (
      <div className={`${size} bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold shadow-sm`}>
        <span className="text-xs uppercase">
          {userName?.charAt(0) || "?"}
        </span>
      </div>
    );
  }

  return (
    <div className={`${size} relative`}>
      {imageLoading && (
        <div className={`${size} bg-gray-200 rounded-full animate-pulse absolute inset-0`}></div>
      )}
      <img
        src={imageUrl}
        alt={userName || "User"}
        className={`${size} rounded-full object-cover border-2 border-white shadow-sm ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
        onError={handleImageError}
        onLoad={handleImageLoad}
        loading="lazy"
      />
    </div>
  );
};

const PendingTasksTable = ({ isCompact, filterTasks, type }) => {
  const tableHeaders = [
    { key: "col23", label: "Link With Name" },
    { key: "col2", label: "FMS Name" },
    { key: "col3", label: "Task Name" },
    { key: "col9", label: "Pending Task" },
  ];

  return (
    <div className="overflow-auto h-full">
      <table className="w-full border-collapse">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            {tableHeaders.map((header) => (
              <th
                key={header.key}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
              >
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filterTasks.map((task, index) => (
            <tr
              key={task._id}
              className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50"
                }`}
            >
              {tableHeaders.map((header) => (
                <td
                  key={`${task._id}-${header.key}`}
                  className="px-4 py-3 text-sm text-gray-900 border-b"
                >
                  {header.key === "col23" ? (
                    <div className="flex items-center">
                      <Avatar
                        imageUrl={task._imageUrl}
                        userName={task._userName}
                        size="w-6 h-6"
                      />
                      <span className="ml-2" title={`Original: ${task.col23}`}>
                        {task._userName || "No Name"}
                      </span>
                    </div>
                  ) : header.key === "col9" ? (
                    <span className="text-gray-900">
                      {String(task[header.key] || "").trim() || "0"}
                    </span>
                  ) : header.key === "col2" ? (
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      <span className="font-medium">
                        {task._fmsName || String(task[header.key] || "").trim() || "-"}
                      </span>
                    </div>
                  ) : header.key === "col3" ? (
                    <span className="text-gray-900 font-medium">
                      {task._taskName || String(task[header.key] || "").trim() || "-"}
                    </span>
                  ) : (
                    String(task[header.key] || "").trim() || "-"
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AdminPendingTasks = () => {
  const [pendingTasks, setPendingTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("col23");
  const [filterValue, setFilterValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPersonDropdown, setShowPersonDropdown] = useState(false);
  const [dataSheetData, setDataSheetData] = useState([]);

  const DISPLAY_COLUMNS = ["col2", "col3", "col13", "col9"];
  const SPREADSHEET_ID = "1Qzzb5c26yWJdEpsSKXLgqcrwcxehmDhHBdldBETHKpY";
  const PENDING_TASK_COLUMN = "col9";

  const fetchDataSheet = async () => {
    try {
      const response = await fetch(
        `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=Data`
      );
      const text = await response.text();
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      const data = JSON.parse(text.substring(jsonStart, jsonEnd + 1));

      const dataItems = data.table.rows.map((row, rowIndex) => {
        const itemObj = {
          _id: `data-${rowIndex}`,
          _rowIndex: rowIndex + 1,
        };
        if (row.c) {
          row.c.forEach((cell, i) => {
            itemObj[`col${i}`] = cell?.v ?? cell?.f ?? "";
          });
        }
        return itemObj;
      });

      setDataSheetData(dataItems);
      return dataItems;
    } catch (err) {
      console.error("Error fetching Data sheet:", err);
      return [];
    }
  };

  const fetchPendingData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const dataSheetItems = await fetchDataSheet();

      const response = await fetch(
        `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=For Records`
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

        // Get Link With Name data from column N (col13)
        const linkWithNameData = itemObj.col13 ? String(itemObj.col13).trim() : "";

        let imageUrl = "";
        let userName = "";

        if (linkWithNameData.includes(",")) {
          const parts = linkWithNameData.split(",");
          imageUrl = parts[0]?.trim() || "";
          userName = parts.slice(1).join(",").trim() || "";
        } else if (linkWithNameData.startsWith("http")) {
          imageUrl = linkWithNameData.trim();
          userName = "User";
        } else if (linkWithNameData.trim() !== "") {
          imageUrl = "";
          userName = linkWithNameData.trim();
        } else {
          imageUrl = "";
          userName = "Unknown User";
        }

        itemObj._imageUrl = convertGoogleDriveImageUrl(imageUrl);
        itemObj._userName = userName || "Unknown User";
        itemObj._combinedValue = linkWithNameData;

        const matchingDataItem = dataSheetItems.find(dataItem =>
          dataItem._rowIndex === itemObj._rowIndex
        );

        if (matchingDataItem) {
          itemObj._fmsName = String(matchingDataItem.col2 || "").trim();
          itemObj._taskName = String(matchingDataItem.col3 || "").trim();
        } else {
          itemObj._fmsName = String(itemObj.col2 || "").trim();
          itemObj._taskName = String(itemObj.col3 || "").trim();
        }

        return itemObj;
      });

      const filteredItems = fmsItems.filter((item) => {
        const hasDisplayData = DISPLAY_COLUMNS.some((colId) => {
          const value = item[colId];
          return value && String(value).trim() !== "";
        });

        const pendingTaskValue = parseFloat(item[PENDING_TASK_COLUMN]) || 0;
        const hasPendingTask = pendingTaskValue > 0;

        return hasDisplayData && hasPendingTask;
      });

      setPendingTasks(filteredItems);
    } catch (err) {
      console.error("Error fetching pending data:", err);
      setError(err.message);
      toast.error(`Failed to load: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingData();
  }, []);

  const getPersonNamesWithImages = () => {
    const personMap = new Map();

    pendingTasks.forEach((item) => {
      const combinedValue = item._combinedValue;
      if (combinedValue && combinedValue.trim() !== "") {
        if (!personMap.has(combinedValue)) {
          personMap.set(combinedValue, {
            value: combinedValue,
            displayName: item._userName || "User",
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
    pendingTasks.forEach((item) => {
      const fmsName = item._fmsName || String(item.col2 || "").trim();
      if (fmsName !== "") {
        fmsNames.add(fmsName);
      }
    });
    return Array.from(fmsNames).sort();
  };

  const filteredTasks = pendingTasks.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = DISPLAY_COLUMNS.some((colId) => {
      if (colId === "col2") {
        return (item._fmsName || String(item[colId] || "")).toLowerCase().includes(term);
      } else if (colId === "col3") {
        return (item._taskName || String(item[colId] || "")).toLowerCase().includes(term);
      } else {
        return String(item[colId] || "").toLowerCase().includes(term);
      }
    });
    const matchesFilter = filterValue
      ? (filterType === "col2" ? (item._fmsName === filterValue) : item._combinedValue === filterValue)
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

  return (
    <div className="space-y-4" style={{ height: "calc(110vh - 90px)", marginTop: "-40px" }}>
      <Toaster />

      <div className="flex justify-between items-center pt-2">
        <h1 className="text-2xl font-bold text-gray-800">Pending Tasks</h1>
        <div className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded-full">
          {filteredTasks.length} Pending Task
          {filteredTasks.length !== 1 ? "s" : ""} (> 0)
        </div>
      </div>

      <div className="bg-white p-3 rounded border space-y-3">
        <div className="grid md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Search..."
            className="px-3 py-2 border rounded-md w-full max-w-xs focus:ring-red-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="relative">
            <div
              className="border px-3 py-2 rounded w-full focus:ring-red-500 focus:border-red-500 bg-white cursor-pointer flex justify-between items-center"
              onClick={() => setShowPersonDropdown(!showPersonDropdown)}
            >
              {selectedPerson ? (
                <div className="flex items-center">
                  <Avatar
                    imageUrl={selectedPerson.imageUrl}
                    userName={selectedPerson.displayName}
                    size="w-12 h-12"
                  />

                  <span className="ml-2">{selectedPerson.displayName}</span>
                </div>
              ) : (
                <span>All Persons</span>
              )}
              <svg
                className={`w-4 h-4 ml-2 transition-transform ${showPersonDropdown ? "rotate-180" : ""
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
                    <Avatar
                      imageUrl={person.imageUrl}
                      userName={person.displayName}
                      size="w-9 h-9"
                    />
                    <span className="ml-2">{person.displayName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <select
              value={filterType === "col2" ? filterValue : ""}
              onChange={(e) => {
                setFilterType("col2");
                setFilterValue(e.target.value);
              }}
              className="border px-3 py-2 rounded w-full focus:ring-red-500 focus:border-red-500"
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

      {isLoading ? (
        <div className="bg-white rounded-lg border shadow-sm p-6 text-center">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500"></div>
            <p className="text-gray-500">Loading tasks...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-white rounded-lg border shadow-sm p-6 text-center">
          <p className="text-red-500">Error: {error}</p>
          <button
            onClick={fetchPendingData}
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : filteredTasks.length > 0 ? (
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-gray-800">
              {filterValue
                ? `Showing ${filterType === "col2" ? "FMS Name" : "Person"}: ${selectedPerson?.displayName || filterValue
                }`
                : "All Tasks"}
            </h2>
          </div>
          <div className="h-[calc(100vh-270px)] overflow-hidden">
            <PendingTasksTable
              isCompact={true}
              filterTasks={filteredTasks}
              type="pending"
            />
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border shadow-sm p-6 text-center">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">No tasks with Pending Task > 0 match your current filters.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPendingTasks;