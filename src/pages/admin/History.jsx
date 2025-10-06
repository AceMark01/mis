import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { User } from "lucide-react";

const ImgWithFallback = ({ src, alt, name, fallbackElement, className }) => {
    const [imgSrc, setImgSrc] = useState("");
    const [loadFailed, setLoadFailed] = useState(false);
    const [attempts, setAttempts] = useState(0);

    const getDriveImageUrls = (originalUrl) => {
        if (!originalUrl || typeof originalUrl !== "string") return [];
        const fileIdMatch = originalUrl.match(/\/file\/d\/([^/]+)|id=([^&]+)|\/d\/([^/]+)/);
        const fileId = fileIdMatch ? fileIdMatch[1] || fileIdMatch[2] || fileIdMatch[3] : null;
        if (!fileId) return [originalUrl];
        return [
            `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`,
            `https://lh3.googleusercontent.com/d/${fileId}=w400`,
            `https://drive.google.com/uc?export=view&id=${fileId}`,
            originalUrl,
        ];
    };

    useEffect(() => {
        if (!src || src.trim() === "") {
            setLoadFailed(true);
            return;
        }
        const urls = getDriveImageUrls(src);
        if (urls.length === 0) {
            setLoadFailed(true);
            return;
        }
        setImgSrc(urls[0]);
        setLoadFailed(false);
        setAttempts(0);
    }, [src]);

    const handleError = () => {
        const urls = getDriveImageUrls(src);
        const nextAttempt = attempts + 1;
        if (nextAttempt < urls.length) {
            setImgSrc(urls[nextAttempt]);
            setAttempts(nextAttempt);
        } else {
            setLoadFailed(true);
        }
    };

    if (loadFailed || !src) {
        return fallbackElement || (
            <div className={`${className} bg-indigo-500 text-white flex items-center justify-center`}>
                {name?.split(" ").slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase() || "?"}
            </div>
        );
    }

    return (
        <img
            src={imgSrc}
            alt={alt}
            onError={handleError}
            className={`${className} object-cover`}
            loading="lazy"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
        />
    );
};

const HistoryRecords = () => {
    const [historyTasks, setHistoryTasks] = useState([]);
    const [historyHeaders, setHistoryHeaders] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("linkWithName");
    const [filterValue, setFilterValue] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showPersonDropdown, setShowPersonDropdown] = useState(false);

    const SPREADSHEET_ID = "1Qzzb5c26yWJdEpsSKXLgqcrwcxehmDhHBdldBETHKpY";

    // Helper function for column widths
    const getColumnWidth = (label) => {
        const lowerLabel = label.toLowerCase();
        if (lowerLabel.includes('employee') || lowerLabel.includes('name')) return "200px";
        if (lowerLabel.includes('date')) return "140px";
        if (lowerLabel.includes('description') || lowerLabel.includes('comment')) return "250px";
        if (lowerLabel.includes('target') || lowerLabel.includes('actual')) return "120px";
        if (lowerLabel.includes('status')) return "120px";
        if (lowerLabel.includes('experience')) return "150px";
        if (lowerLabel.includes('post') || lowerLabel.includes('number')) return "130px";
        return "150px";
    };

    const fetchHistoryData = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch(
                `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=Records`
            );
            
            const text = await response.text();
            const jsonStart = text.indexOf("{");
            const jsonEnd = text.lastIndexOf("}");
            const data = JSON.parse(text.substring(jsonStart, jsonEnd + 1));

            if (!data.table || !data.table.rows) {
                throw new Error("No table data found");
            }

         // Dynamic column mapping - exclude linkWithName column
const dynamicMapping = data.table.cols
    .filter(col => !col.label.toLowerCase().includes('link') || !col.label.toLowerCase().includes('name'))
    .map((col, index) => {
        // Find original index for correct data mapping
        const originalIndex = data.table.cols.findIndex(originalCol => originalCol.id === col.id);
        return {
            index: originalIndex,
            label: col.label,
            key: col.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
            width: getColumnWidth(col.label)
        };
    });


            console.log("Available columns:", dynamicMapping);

            const headers = dynamicMapping.map(col => ({
                id: col.key,
                label: col.label,
                width: col.width
            }));

            const historyItems = data.table.rows.map((row, i) => {
                const item = {
                    _id: `${i}-${Math.random().toString(36).substr(2, 9)}`,
                    _rowIndex: i + 1
                };

                if (row.c) {
                    dynamicMapping.forEach(col => {
                        const cell = row.c[col.index];
                        let value = cell?.v ?? cell?.f ?? "";

                     // Format date values
if (col.label.toLowerCase().includes('date') && value) {
    if (typeof value === 'string' && value.startsWith('Date(')) {
        try {
            const match = value.match(/Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)/);
            if (match) {
                const [, year, month, day, hour = 0, minute = 0, second = 0] = match;
                const date = new Date(year, month, day, hour, minute, second);
                value = date.toLocaleDateString();
            }
        } catch (e) {
            console.error('Date parsing error:', e);
        }
    }
}

// Add percentage symbol and handle empty values
if (col.label.includes('% Work Not Done')) {
    if (!value || value === "" || value === null || value === undefined) {
        value = "0%";
    } else if (!String(value).includes('%')) {
        value = value + '%';
    }
}

item[col.key] = value;


                        item[col.key] = value;
                    });

                    // Find employee column and process it
                    const employeeCol = dynamicMapping.find(col => 
                        col.label.toLowerCase().includes('employee') || 
                        col.label.toLowerCase().includes('name') ||
                        col.key.includes('name')
                    );

                    if (employeeCol) {
                        const rawValue = String(item[employeeCol.key] || "");
                        let imageUrl = "";
                        let userName = "";

                        if (rawValue.includes(",")) {
                            const parts = rawValue.split(/,(.+)/);
                            imageUrl = parts[0]?.trim() || "";
                            userName = parts[1]?.trim() || "";
                        } else if (rawValue.startsWith("http")) {
                            imageUrl = rawValue.trim();
                            userName = "";
                        } else {
                            imageUrl = "";
                            userName = rawValue.trim();
                        }

                        item._imageUrl = imageUrl;
                        item._userName = userName || "User";
                        item._combinedValue = userName ? `${imageUrl},${userName}` : imageUrl || userName;
                        item.linkWithName = rawValue;
                    }
                }
                return item;
            });

            const filteredItems = historyItems.filter((item) =>
                Object.values(item).some(value => value && String(value).trim() !== "" && !String(value).startsWith("_"))
            );

            setHistoryHeaders(headers);
            setHistoryTasks(filteredItems);
            toast.success(`Fetched ${filteredItems.length} history records`);
        } catch (err) {
            setError(err.message);
            toast.error(`Failed to load data: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHistoryData();
    }, []);

    // Get unique employee names with images for dropdown
    const getEmployeeNamesWithImages = () => {
        const employeeMap = new Map();

        historyTasks.forEach((item) => {
            const combinedValue = item._combinedValue;
            if (combinedValue && combinedValue.trim() !== "") {
                if (!combinedValue.includes("undefined") && !combinedValue.includes("null")) {
                    if (!employeeMap.has(combinedValue)) {
                        employeeMap.set(combinedValue, {
                            value: combinedValue,
                            displayName: item._userName || "Employee",
                            imageUrl: item._imageUrl,
                        });
                    }
                }
            }
        });

        return Array.from(employeeMap.values()).sort((a, b) =>
            a.displayName.localeCompare(b.displayName)
        );
    };

    // Filter tasks based on search and filters
    const filteredTasks = historyTasks.filter((item) => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = Object.values(item).some(value =>
            String(value || "").toLowerCase().includes(term)
        );

        let matchesFilter = true;
        if (filterValue) {
            if (filterType === "linkWithName") {
                matchesFilter = item._combinedValue === filterValue;
            }
        }

        return matchesSearch && matchesFilter;
    });

    const handleEmployeeSelect = (employee) => {
        setFilterType("linkWithName");
        setFilterValue(employee.value);
        setShowPersonDropdown(false);
    };

    const selectedEmployee = getEmployeeNamesWithImages().find(
        (emp) => emp.value === filterValue
    );

    if (isLoading) {
        return (
            <div className="space-y-4" style={{ height: "calc(100vh - 90px)", marginTop: "-40px" }}>
                <div className="bg-white rounded-lg border shadow-sm p-6 text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-slate-600 font-medium">Loading History Records...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-4" style={{ height: "calc(100vh - 90px)", marginTop: "-40px" }}>
                <div className="bg-white rounded-lg border shadow-sm p-6 text-center">
                    <p className="text-red-600 font-medium">Error: {error}</p>
                    <button
                        onClick={fetchHistoryData}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 w-full" style={{ height: "calc(110vh - 90px)", marginTop: "-40px", width: "100%" }}>
            {/* Header */}
            <div className="flex justify-between items-center pt-2">
                <h1 className="text-2xl font-bold text-gray-800">History Records</h1>
                <div className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                    {filteredTasks.length} Record{filteredTasks.length !== 1 ? "s" : ""}
                </div>
            </div>

            {/* Search + Filter */}
            <div className="bg-white p-3 rounded border space-y-3 relative">
                <div className="grid md:grid-cols-2 gap-3">
                    {/* Search Input */}
                    <input
                        type="text"
                        placeholder="Search employees, tasks, dates, status..."
                        className="px-3 py-2 border rounded-md w-full focus:ring-green-500 focus:border-green-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />

                    {/* Employee Dropdown */}
                    <div className="relative">
                        <div
                            className="border px-3 py-2 rounded w-full focus:ring-green-500 focus:border-green-500 bg-white cursor-pointer flex justify-between items-center"
                            onClick={() => setShowPersonDropdown(!showPersonDropdown)}
                        >
                            {selectedEmployee ? (
                                <div className="flex items-center">
                                    {selectedEmployee.imageUrl ? (
                                        <ImgWithFallback
                                            src={selectedEmployee.imageUrl}
                                            alt={selectedEmployee.displayName}
                                            name={selectedEmployee.displayName}
                                            className="w-6 h-6 rounded-full mr-2"
                                            fallbackElement={
                                                <div className="w-6 h-6 bg-gray-200 rounded-full mr-2 flex items-center justify-center">
                                                    <span className="text-xs">
                                                        {selectedEmployee.displayName?.charAt(0) || "?"}
                                                    </span>
                                                </div>
                                            }
                                        />
                                    ) : (
                                        <div className="w-6 h-6 bg-gray-200 rounded-full mr-2 flex items-center justify-center">
                                            <span className="text-xs">
                                                {selectedEmployee.displayName?.charAt(0) || "?"}
                                            </span>
                                        </div>
                                    )}
                                    <span>{selectedEmployee.displayName}</span>
                                </div>
                            ) : (
                                <span>All Employees</span>
                            )}
                            <svg
                                className={`w-4 h-4 ml-2 transition-transform ${showPersonDropdown ? "rotate-180" : ""}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
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
                            <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                <div
                                    className="p-2 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => handleEmployeeSelect({
                                        value: "",
                                        displayName: "All Employees",
                                    })}
                                >
                                    All Employees
                                </div>
                                {getEmployeeNamesWithImages().map((employee) => (
                                    <div
                                        key={employee.value}
                                        className="p-2 hover:bg-gray-100 cursor-pointer flex items-center"
                                        onClick={() => handleEmployeeSelect(employee)}
                                    >
                                        {employee.imageUrl ? (
                                            <ImgWithFallback
                                                src={employee.imageUrl}
                                                alt={employee.displayName}
                                                name={employee.displayName}
                                                className="w-6 h-6 rounded-full mr-2"
                                                fallbackElement={
                                                    <div className="w-6 h-6 bg-gray-200 rounded-full mr-2 flex items-center justify-center">
                                                        <span className="text-xs">
                                                            {employee.displayName?.charAt(0) || "?"}
                                                        </span>
                                                    </div>
                                                }
                                            />
                                        ) : (
                                            <div className="w-6 h-6 bg-gray-200 rounded-full mr-2 flex items-center justify-center">
                                                <span className="text-sm">
                                                    {employee.displayName?.charAt(0) || "?"}
                                                </span>
                                            </div>
                                        )}
                                        <span>{employee.displayName}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Records Table */}
            {filteredTasks.length > 0 ? (
                <div className="bg-white rounded-lg border shadow-sm p-4 relative">
                    <div className="mb-3">
                        <h2 className="text-lg font-semibold text-gray-800">
                            {filterValue
                                ? `Showing Employee: ${selectedEmployee?.displayName || filterValue}`
                                : "Historical Task Records"}
                        </h2>
                    </div>

                    {/* Scrollable table container */}
                    <div className="h-[calc(100vh-270px)] overflow-hidden relative">
                        <div className="absolute inset-0 overflow-auto">
                            <table className="w-full border-collapse" style={{ minWidth: '1800px' }}>
                                {/* Sticky Header */}
                                <thead className="bg-gray-100 sticky top-0 z-10">
                                    <tr className="border-b-2 border-gray-300">
                                        {historyHeaders.map((header) => (
                                            <th
                                                key={header.id}
                                                className="text-left text-sm font-bold text-gray-800 px-4 py-3 border-r border-gray-300 last:border-r-0 bg-gray-100 align-top"
                                                style={{
                                                    width: header.width,
                                                    minWidth: header.width,
                                                    maxWidth: header.width,
                                                    position: 'sticky',
                                                    top: 0,
                                                    verticalAlign: 'top'
                                                }}
                                            >
                                                <div 
                                                    className="leading-tight text-center break-words hyphens-auto" 
                                                    style={{
                                                        wordBreak: 'break-word',
                                                        overflowWrap: 'break-word',
                                                        lineHeight: '1.3',
                                                        fontSize: '12px',
                                                        fontWeight: '700'
                                                    }}
                                                    title={header.label}
                                                >
                                                    {header.label}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                {/* Table Body */}
                                <tbody>
                                    {filteredTasks.map((task) => (
                                        <tr
                                            key={task._id}
                                            className="bg-white hover:bg-blue-50 hover:shadow-sm transition-all duration-200 border-b border-gray-200"
                                        >
                                            {historyHeaders.map((header) => (
                                                <td
                                                    key={header.id}
                                                    className="text-sm text-gray-900 px-4 py-3 border-r border-gray-200 last:border-r-0 align-top"
                                                    style={{
                                                        width: header.width,
                                                        minWidth: header.width,
                                                        maxWidth: header.width
                                                    }}
                                                >
                                                                                                       {header.id.includes('name') && header.label.toLowerCase().includes('employee') ? (
                                                        (() => {
                                                            const cellData = String(task[header.id] || "").trim();

                                                            if (cellData.includes(',')) {
                                                                const parts = cellData.split(',');
                                                                const imageUrl = parts[0]?.trim();
                                                                const name = parts[1]?.trim() || "Unknown";

                                                                if (imageUrl && (imageUrl.startsWith('http') || imageUrl.startsWith('https'))) {
                                                                    return (
                                                                        <div className="flex items-center gap-2 w-full">
                                                                            <ImgWithFallback
                                                                                src={imageUrl}
                                                                                alt={name}
                                                                                name={name}
                                                                                className="w-9 h-9 rounded-full flex-shrink-0 border-2 border-white shadow-sm"
                                                                                fallbackElement={
                                                                                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm">
                                                                                        {name.charAt(0).toUpperCase()}
                                                                                    </div>
                                                                                }
                                                                            />
                                                                            <span
                                                                                className="font-medium text-gray-900 flex-1 whitespace-nowrap overflow-hidden text-ellipsis"
                                                                                title={name}
                                                                                style={{ minWidth: '0' }}
                                                                            >
                                                                                {name}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                }
                                                            }

                                                            const displayName = cellData || "Unknown";
                                                            return (
                                                                <div className="flex items-center gap-2 w-full">
                                                                    <div className="w-9 h-9 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm">
                                                                        {displayName.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <span
                                                                        className="font-medium text-gray-900 flex-1 whitespace-nowrap overflow-hidden text-ellipsis"
                                                                        title={displayName}
                                                                        style={{ minWidth: '0' }}
                                                                    >
                                                                        {displayName}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })()
                                                    ) : (

                                                        <div
                                                            className="truncate pr-2"
                                                            title={task[header.id] || ""}
                                                        >
                                                            <span className={`
                                                                ${task[header.id] ? 'text-gray-900' : 'text-gray-400'}
                                                                ${header.id.toLowerCase().includes('status') ? 'font-medium px-2 py-1 rounded-full text-xs ' + 
                                                                    (String(task[header.id]).toLowerCase() === 'completed' ? 'bg-green-100 text-green-800' :
                                                                     String(task[header.id]).toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                                     String(task[header.id]).toLowerCase().includes('progress') ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800') : ''}
                                                            `}>
                                                                {task[header.id] || "0"}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-lg border shadow-sm p-6 text-center">
                    <div className="text-gray-400 mb-4">
                        <User size={48} className="mx-auto" />
                    </div>
                    <p className="text-gray-500 text-lg">
                        {searchTerm || filterValue ? "No records match your current filters." : "No history data found"}
                    </p>
                    <p className="text-gray-400 text-sm mt-2">
                        {searchTerm || filterValue ? "Try adjusting your search or filter criteria." : "Please check your data source"}
                    </p>
                    {(searchTerm || filterValue) && (
                        <button
                            onClick={() => {
                                setSearchTerm("");
                                setFilterValue("");
                                setFilterType("linkWithName");
                            }}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            )}

            {/* Custom scrollbar styles */}
            <style jsx global>{`
                .overflow-auto::-webkit-scrollbar {
                    width: 12px;
                    height: 12px;
                }
                
                .overflow-auto::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 6px;
                }
                
                .overflow-auto::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 6px;
                    border: 2px solid #f1f5f9;
                }
                
                .overflow-auto::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }

                .overflow-auto::-webkit-scrollbar-corner {
                    background: #f1f5f9;
                }

                /* Firefox scrollbar */
                .overflow-auto {
                    scrollbar-width: thin;
                    scrollbar-color: #cbd5e1 #f1f5f9;
                }

                /* Break long words in headers */
                .break-words {
                    word-break: break-word;
                    overflow-wrap: break-word;
                    hyphens: auto;
                }
            `}</style>
        </div>
    );
};

export default HistoryRecords;
