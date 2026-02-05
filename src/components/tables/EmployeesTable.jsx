import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { User, Download, ExternalLink } from "react-feather";

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

const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

const isImageUrl = (url) => {
  if (!url || !isValidUrl(url)) return false;
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff'];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some(ext => lowerUrl.includes(ext)) || 
         lowerUrl.includes('drive.google.com') ||
         lowerUrl.includes('googleapis.com');
};

const EmployeesTable = ({ filterTasks, dynamicHeaders }) => {
  const [processedData, setProcessedData] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [commitmentValues, setCommitmentValues] = useState({});
  const [savedCommitments, setSavedCommitments] = useState({});
  const [plannedWorkValues, setPlannedWorkValues] = useState({});
  const [savedPlannedWorkValues, setSavedPlannedWorkValues] = useState({});
  const [selectAll, setSelectAll] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Configuration - exactly as provided
  const scriptUrl = "https://script.google.com/macros/s/AKfycbytIRV-DZXklx1lhpszAvIEWd1rmNjN9U5M1UmAfK8r2XiDi646W2fVYLS__3DS2aa8_w/exec";
  const sheetName = "For Records";
  // Sheet ID: 1Qzzb5c26yWJdEpsSKXLgqcrwcxehmDhHBdldBETHKpY (configured in Apps Script)

  const filteredHeaders = dynamicHeaders.filter(
    (header) =>
      
      header.label.toLowerCase() !== "commitment weekly score"
  );

  const fetchCommitments = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        action: 'getUsers',
        sheetName: sheetName,
        spreadsheetId: "1Qzzb5c26yWJdEpsSKXLgqcrwcxehmDhHBdldBETHKpY"
      });

      console.log('Fetching commitments from:', `${scriptUrl}?${params}`);

      const response = await fetch(`${scriptUrl}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Fetch result:', result);
      
      if (result.status === "success" && result.users) {
        const commitmentMap = {};
        const plannedWorkMap = {};
        
        result.users.forEach(user => {
          const name = user.name || user.c || "";
          const commitment = user.commitment || user.o || "";
          const plannedWorkNotDone = user.plannedWorkNotDone || "";
          const plannedWorkNotDoneOnTime = user.plannedWorkNotDoneOnTime || "";
          
          if (name) {
            const nameKey = name.toLowerCase().trim();
            commitmentMap[nameKey] = commitment;
            plannedWorkMap[nameKey] = {
              plannedWorkNotDone,
              plannedWorkNotDoneOnTime
            };
          }
        });
        
        setSavedCommitments(commitmentMap);
        setSavedPlannedWorkValues(plannedWorkMap);
      }
    } catch (error) {
      console.error("Error fetching commitments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCommitments();
  }, []);

  useEffect(() => {
    const processed = filterTasks.map((item) => {
      const imageHeader = dynamicHeaders.find((h) => h.isImage);
      const rawValue = String(item[imageHeader?.id] || "").replace(/^"|"$/g, "");
      let imageUrl = "", name = "";
      if (rawValue.includes(",")) {
        const parts = rawValue.split(/,(.+)/);
        imageUrl = parts[0]?.trim() || "";
        name = parts[1]?.trim() || "";
      } else if (rawValue.startsWith("http")) {
        imageUrl = rawValue.trim();
      } else {
        name = rawValue.trim();
      }

      const nameKey = name.toLowerCase().trim();
      const existingCommitment = savedCommitments[nameKey] || "";
      const existingPlannedWork = savedPlannedWorkValues[nameKey] || {};

      return {
        ...item,
        _imageUrl: imageUrl,
        _userName: name || "User",
        _existingCommitment: existingCommitment,
        _existingPlannedWorkNotDone: existingPlannedWork.plannedWorkNotDone || "",
        _existingPlannedWorkNotDoneOnTime: existingPlannedWork.plannedWorkNotDoneOnTime || ""
      };
    });
    setProcessedData(processed);
  }, [filterTasks, dynamicHeaders, savedCommitments, savedPlannedWorkValues]);

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      const newIds = new Set(processedData.map((item) => item._id));
      setSelectedIds(newIds);
    }
    setSelectAll(!selectAll);
  };

  const handleCheckboxChange = (id) => {
    const updated = new Set(selectedIds);
    updated.has(id) ? updated.delete(id) : updated.add(id);
    setSelectedIds(updated);
  };

  const handleCommitmentChange = (id, value) => {
    setCommitmentValues((prev) => ({ ...prev, [id]: value }));
  };

  const handlePlannedWorkChange = (id, field, value) => {
    setPlannedWorkValues((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    // Prepare data for submission
    const submittedData = Array.from(
      new Set([...selectedIds, ...Object.keys(plannedWorkValues)])
    ).map((id) => {
      const emp = processedData.find((item) => item._id === id);
      return {
        id,
        name: emp?._userName || "",
        commitment: commitmentValues[id] || "",
        plannedWorkNotDone: plannedWorkValues[id]?.plannedWorkNotDone || "",
        plannedWorkNotDoneOnTime: plannedWorkValues[id]?.plannedWorkNotDoneOnTime || "",
      };
    }).filter(item => 
      // Only include items that have some data to submit
      item.commitment.trim() !== "" || 
      item.plannedWorkNotDone.trim() !== "" || 
      item.plannedWorkNotDoneOnTime.trim() !== ""
    );

    if (submittedData.length === 0) {
      console.log("No data to submit");
      return;
    }

    console.log("Submitting data:", submittedData);

    try {
      setIsSaving(true);
      
      const formData = new URLSearchParams();
      formData.append('action', 'insertInSingleColumn');
      formData.append('sheetName', sheetName);
      formData.append('spreadsheetId', "1Qzzb5c26yWJdEpsSKXLgqcrwcxehmDhHBdldBETHKpY");
      formData.append('data', JSON.stringify(submittedData));

      console.log("Form data being sent:", formData.toString());

      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Submit result:", result);

      if (result.success || result.status === "success") {
        // Update local state with saved values
        const newCommitments = { ...savedCommitments };
        const newPlannedWork = { ...savedPlannedWorkValues };
        
        submittedData.forEach(({ name, commitment, plannedWorkNotDone, plannedWorkNotDoneOnTime }) => {
          const nameKey = name.toLowerCase().trim();
          if (commitment) newCommitments[nameKey] = commitment;
          if (plannedWorkNotDone || plannedWorkNotDoneOnTime) {
            newPlannedWork[nameKey] = {
              plannedWorkNotDone: plannedWorkNotDone || newPlannedWork[nameKey]?.plannedWorkNotDone || "",
              plannedWorkNotDoneOnTime: plannedWorkNotDoneOnTime || newPlannedWork[nameKey]?.plannedWorkNotDoneOnTime || ""
            };
          }
        });
        
        setSavedCommitments(newCommitments);
        setSavedPlannedWorkValues(newPlannedWork);
        
        // Clear form values
        setCommitmentValues({});
        setPlannedWorkValues({});
        setSelectedIds(new Set());
        setSelectAll(false);
        
        // Refresh data from server
        await fetchCommitments();
        
        console.log("Data submitted successfully!");
      } else {
        throw new Error(result.message || result.error || "Unknown error occurred.");
      }
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const getDisplayedCommitment = (item) => {
    const currentValue = commitmentValues[item._id];
    const existingValue = item._existingCommitment;
    return currentValue !== undefined ? currentValue : existingValue || "";
  };

  const getDisplayedPlannedWork = (item, field) => {
    const currentValue = plannedWorkValues[item._id]?.[field];
    const existingValue = field === "plannedWorkNotDone" 
      ? item._existingPlannedWorkNotDone 
      : item._existingPlannedWorkNotDoneOnTime;
    return currentValue !== undefined ? currentValue : existingValue || "";
  };

  const hasPlannedWorkInput = Object.values(plannedWorkValues).some(
    (entry) => entry.plannedWorkNotDone || entry.plannedWorkNotDoneOnTime
  );

  return (
    <div className="bg-white rounded-md border shadow-sm">
      {isLoading && <div className="p-4 text-center text-gray-500">Loading commitments...</div>}

      {/* Fixed header container with scrollable body - scrollbar hidden */}
      <div className="overflow-hidden rounded-md">
        <div className="max-h-96 overflow-y-auto scrollbar-hide" style={{
          scrollbarWidth: 'none', /* Firefox */
          msOverflowStyle: 'none',  /* Internet Explorer 10+ */
        }}>
          <style jsx>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none; /* Safari and Chrome */
            }
          `}</style>
          <table className="w-full divide-y divide-gray-200 table-auto">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2 bg-gray-50 w-32">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={toggleSelectAll}
                      className="form-checkbox text-blue-600"
                    />
                    <span className="ml-2 text-gray-500 text-sm font-times whitespace-nowrap">
                      Select All
                    </span>
                  </label>
                </th>
                {filteredHeaders.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-600 uppercase tracking-wider min-w-32 max-w-48"
                  >
                    <div className="leading-tight">
                      {header.label}
                    </div>
                  </th>
                  
                ))}
                <th className="px-4 py-2 bg-gray-50 text-left text-xs font-medium text-gray-600 uppercase tracking-wider min-w-40">
                  <div className="leading-tight">
                    Commitment
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {processedData.map((item) => {
                const displayedCommitment = getDisplayedCommitment(item);
                const hasExistingCommitment = item._existingCommitment?.trim() !== "";

                return (
                  <tr key={item._id}>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item._id)}
                        onChange={() => handleCheckboxChange(item._id)}
                        className="form-checkbox text-blue-600"
                      />
                    </td>
                    {filteredHeaders.map((header) => {
                      if (header.isImage) {
                        return (
                          <td key={header.id} className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <ImgWithFallback
                                src={item._imageUrl}
                                alt={item._userName}
                                name={item._userName}
                                className="w-10 h-10 rounded-full"
                                fallbackElement={
                                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                    <User size={16} className="text-gray-400" />
                                  </div>
                                }
                              />
                             
                            </div>
                          </td>
                        );
                      }

                      // Handle COL15 as image link
                      if (header.id === "col15") {
                        const cellValue = item[header.id];
                        if (cellValue && isImageUrl(cellValue)) {
                          return (
                            <td key={header.id} className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <a
                                  href={cellValue}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-block hover:opacity-80 transition-opacity"
                                  title={cellValue}
                                >
                                  <ImgWithFallback
                                    src={cellValue}
                                    alt="COL15 Image"
                                    className="w-12 h-12 rounded-md border border-gray-200 hover:border-blue-400 cursor-pointer"
                                    fallbackElement={
                                      <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center border border-gray-200">
                                        <ExternalLink size={16} className="text-gray-400" />
                                      </div>
                                    }
                                  />
                                </a>
                              </div>
                            </td>
                          );
                        }
                        // If not an image URL, display as regular text with link
                        return (
                          <td key={header.id} className="px-4 py-2">
                            {cellValue && isValidUrl(cellValue) ? (
                              <a
                                href={cellValue}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                              >
                                <span className="text-sm truncate">{new URL(cellValue).hostname}</span>
                                <ExternalLink size={14} />
                              </a>
                            ) : (
                              <span className="text-sm text-gray-700">{cellValue || "-"}</span>
                            )}
                          </td>
                        );
                      }

                      if (
                        header.label === "Planned % Work Not Done" ||
                        header.label === "Planned % Work Not Done On Time"
                      ) {
                        const fieldKey =
                          header.label === "Planned % Work Not Done"
                            ? "plannedWorkNotDone"
                            : "plannedWorkNotDoneOnTime";
                        const displayedValue = getDisplayedPlannedWork(item, fieldKey);
                        const hasExistingValue = (fieldKey === "plannedWorkNotDone" 
                          ? item._existingPlannedWorkNotDone 
                          : item._existingPlannedWorkNotDoneOnTime)?.trim() !== "";

                        return (
                          <td key={header.id} className="px-4 py-2">
                            <div className="relative">
                              <input
                                type="number"
                                placeholder={hasExistingValue ? "Update %" : "Enter %"}
                                min="0"
                                max="100"
                                value={displayedValue}
                                onChange={(e) =>
                                  handlePlannedWorkChange(item._id, fieldKey, e.target.value)
                                }
                                className={`w-24 px-2 py-1 border rounded-md text-sm ${
                                  hasExistingValue
                                    ? "border-green-300 bg-green-50 focus:ring focus:ring-green-200"
                                    : "border-gray-300 focus:ring focus:ring-blue-200"
                                }`}
                                style={{
                                  backgroundImage: hasExistingValue && !plannedWorkValues[item._id]?.[fieldKey]
                                    ? `linear-gradient(45deg, transparent 40%, rgba(34, 197, 94, 0.1) 40%, rgba(34, 197, 94, 0.1) 60%, transparent 60%)`
                                    : 'none'
                                }}
                              />
                              {hasExistingValue && !plannedWorkValues[item._id]?.[fieldKey] && (
                                <div className="absolute right-1 top-1/2 transform -translate-y-1/2">
                                  <span className="text-xs text-green-600 font-medium">✓</span>
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={header.id}
                          className="px-4 py-2 text-sm text-gray-700 whitespace-normal break-words"
                        >
                          {item[header.id] || "0"}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder={hasExistingCommitment ? "Update commitment" : "Enter commitment"}
                          value={displayedCommitment}
                          onChange={(e) => handleCommitmentChange(item._id, e.target.value)}
                          disabled={!selectedIds.has(item._id)}
                          className={`w-full px-3 py-1 border text-sm rounded-md ${
                            selectedIds.has(item._id)
                              ? hasExistingCommitment
                                ? "border-green-300 bg-green-50 focus:ring focus:ring-green-200"
                                : "border-gray-300 focus:ring focus:ring-blue-200"
                              : hasExistingCommitment
                              ? "bg-green-50 text-green-700 cursor-not-allowed border-green-200"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                          style={{
                            backgroundImage: hasExistingCommitment && !selectedIds.has(item._id)
                              ? `linear-gradient(45deg, transparent 40%, rgba(34, 197, 94, 0.1) 40%, rgba(34, 197, 94, 0.1) 60%, transparent 60%)`
                              : 'none'
                          }}
                        />
                        {hasExistingCommitment && !selectedIds.has(item._id) && (
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                            <span className="text-xs text-green-600 font-medium">Saved</span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end p-4">
        <button
          onClick={handleSubmit}
          disabled={(!hasPlannedWorkInput && selectedIds.size === 0) || isSaving}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            "Submit Commitments"
          )}
        </button>
      </div>
    </div>
  );
};

EmployeesTable.propTypes = {
  filterTasks: PropTypes.array.isRequired,
  dynamicHeaders: PropTypes.array.isRequired,
  hideSelection: PropTypes.bool
};

export default EmployeesTable;