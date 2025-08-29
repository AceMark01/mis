import React, { createContext, useContext, useState, useEffect } from "react";

// Enhanced image conversion utility function that avoids CORS issues
const getDriveImageUrls = (originalUrl) => {
  if (!originalUrl || typeof originalUrl !== "string") return [];
  
  // Extract file ID from various Google Drive URL formats
  let fileId = null;
  
  // Handle different URL patterns
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9-_]+)/,
    /[?&]id=([a-zA-Z0-9-_]+)/,
    /\/d\/([a-zA-Z0-9-_]+)/,
    /\/open\?id=([a-zA-Z0-9-_]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = originalUrl.match(pattern);
    if (match) {
      fileId = match[1];
      break;
    }
  }
  
  if (!fileId) {
    // If it's already a working URL, return it
    if (originalUrl.includes('drive.google.com/uc') || originalUrl.includes('lh3.googleusercontent.com')) {
      return [originalUrl];
    }
    return [];
  }
  
  // Return URLs in order of reliability (avoiding CORS-blocked URLs)
  return [
    `https://drive.google.com/uc?export=view&id=${fileId}`, // Most reliable, no CORS
    `https://lh3.googleusercontent.com/d/${fileId}=w400-h400-c`, // Good fallback
    `https://lh3.googleusercontent.com/d/${fileId}=w400`, // Medium fallback
    `https://lh3.googleusercontent.com/d/${fileId}`, // Basic fallback
  ];
};

// Enhanced image processing function with better comma and false value handling
const processImageUrl = (rawImageData) => {
  // Handle null, undefined, empty string, or non-string values
  if (!rawImageData || typeof rawImageData !== "string") {
    console.log("🚫 processImageUrl: Invalid input data:", rawImageData);
    return null;
  }
  
  // Clean the data - remove quotes and trim whitespace
  const cleanedData = rawImageData.replace(/^"|"$/g, "").trim();
  
  // Handle empty string after cleaning
  if (!cleanedData) {
    console.log("🚫 processImageUrl: Empty string after cleaning");
    return null;
  }
  
  // Handle common false values
  const falseValues = ['link', 'null', 'undefined', 'false', '0', 'n/a', 'na', 'none', ''];
  if (falseValues.includes(cleanedData.toLowerCase())) {
    console.log("🚫 processImageUrl: False value detected:", cleanedData);
    return null;
  }
  
  let imageUrl = "";
  
  // Enhanced comma handling - look for URL patterns in comma-separated data
  if (cleanedData.includes(",")) {
    console.log("🔍 processImageUrl: Processing comma-separated data:", cleanedData);
    
    // Split by comma and find the first valid URL
    const parts = cleanedData.split(",");
    
    for (const part of parts) {
      const trimmedPart = part.trim();
      
      // Skip empty parts or common false values
      if (!trimmedPart || falseValues.includes(trimmedPart.toLowerCase())) {
        continue;
      }
      
      // Check if this part looks like a URL
      if (trimmedPart.startsWith("http") || trimmedPart.includes("drive.google.com")) {
        imageUrl = trimmedPart;
        console.log("✅ processImageUrl: Found URL in comma-separated data:", imageUrl);
        break;
      }
    }
    
    // If no URL found in parts, fallback to first non-empty part
    if (!imageUrl) {
      const firstValidPart = parts.find(part => {
        const trimmed = part.trim();
        return trimmed && !falseValues.includes(trimmed.toLowerCase());
      });
      
      if (firstValidPart) {
        imageUrl = firstValidPart.trim();
        console.log("⚠️ processImageUrl: Using first valid part as fallback:", imageUrl);
      }
    }
    
  } else if (cleanedData.startsWith("http") || cleanedData.includes("drive.google.com")) {
    // Direct URL without comma
    imageUrl = cleanedData;
    console.log("✅ processImageUrl: Direct URL detected:", imageUrl);
  } else {
    // Check if it might be a relative path or other format that could be valid
    console.log("⚠️ processImageUrl: Non-HTTP URL detected, checking validity:", cleanedData);
    
    // Try to construct a URL to validate format
    try {
      // If it's a relative path, it might still be valid for some contexts
      if (cleanedData.includes("/") || cleanedData.includes(".")) {
        imageUrl = cleanedData;
        console.log("✅ processImageUrl: Accepted as potential valid path:", imageUrl);
      } else {
        console.log("🚫 processImageUrl: No valid URL pattern found");
        return null;
      }
    } catch (error) {
      console.log("🚫 processImageUrl: URL validation failed:", error.message);
      return null;
    }
  }
  
  // Final check - ensure we have something that looks like a URL
  if (!imageUrl || imageUrl.toLowerCase() === "link") {
    console.log("🚫 processImageUrl: No valid URL extracted or generic 'link' text");
    return null;
  }
  
  // Convert to proper image URLs using Drive conversion
  try {
    const urls = getDriveImageUrls(imageUrl);
    const finalUrl = urls[0]; // Return the first (best) URL
    
    console.log("✅ processImageUrl: Final processed URL:", finalUrl);
    return finalUrl;
  } catch (error) {
    console.error("💥 processImageUrl: Error in URL conversion:", error);
    return imageUrl; // Return original if conversion fails
  }
};

// Auto designation submit configuration
const SUBMIT_GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyc-Phvly57klOOaxwMW8lqqrBTjJ2yIbIA9_gV9YmWr55GhXvab_N_TkrmAqyC-4BJFQ/exec";
const SUBMIT_SHEET_ID = "1etr8qZJ1kombkuemFHF59FNqqKUzVgzffg39bXkZTSA";
const SUBMIT_SHEET_NAME = "Dashboard";
const HEADER_NAME = "PERCHASER";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Initial loading true to prevent flash
  const [isInitializing, setIsInitializing] = useState(true); // New state for initialization

  // Function to submit designation to Dashboard sheet (Column A)
  const submitDesignationToDashboard = async (designation, userData) => {
    try {
      console.log("📤 AuthContext: Auto-submitting designation to Dashboard sheet:", designation);
      
      const formData = new FormData();
      formData.append('action', 'updateDesignation');
      formData.append('sheetId', SUBMIT_SHEET_ID);
      formData.append('sheetName', SUBMIT_SHEET_NAME);
      formData.append('header', HEADER_NAME);
      formData.append('column', 'A');
      formData.append('designation', designation);
      formData.append('userName', userData?.name || 'Unknown User');
      formData.append('userEmail', userData?.email || '');
      formData.append('userId', userData?.id || userData?.username || '');
      formData.append('timestamp', new Date().toISOString());

      await fetch(SUBMIT_GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: formData,
      });

      console.log("✅ AuthContext: Designation auto-submitted successfully to Dashboard sheet");
      return true;
    } catch (error) {
      console.error('❌ AuthContext: Error auto-submitting designation:', error);
      return false;
    }
  };

  // Function to fetch image from For Record sheet using Master sheet name
  const fetchImageFromForRecordSheet = async (masterSheetName) => {
    try {
      console.log("🔍 AuthContext: Fetching image from For Record sheet for Master user:", masterSheetName);
      
      // Simplified approach - just try direct fetch first
      const baseUrl = "https://script.google.com/macros/s/AKfycbytIRV-DZXklx1lhpszAvIEWd1rmNjN9U5M1UmAfK8r2XiDi646W2fVYLS__3DS2aa8_w/exec";
      
      try {
        console.log("🔄 AuthContext: Trying direct fetch");
        
        const response = await fetch(baseUrl, {
          method: 'GET',
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          const forRecordData = await response.json();
          
          if (Array.isArray(forRecordData) && forRecordData.length > 0) {
            // Find matching user in For Record sheet using Master sheet name
            const matchingForRecordRow = forRecordData.find(row => {
              if (!row.Name) return false;
              return row.Name.toString().toLowerCase().trim() === masterSheetName.toString().toLowerCase().trim();
            });
            
            if (matchingForRecordRow) {
              // Get image from column N (header "link")
              const rawImageFromLink = matchingForRecordRow.link;
              
              if (rawImageFromLink && rawImageFromLink.toString().trim()) {
                const rawImageData = rawImageFromLink.toString().trim();
                console.log("🖼️ AuthContext: Raw image data from link column:", rawImageData);
                
                // Process the image using the enhanced logic
                const processedImageUrl = processImageUrl(rawImageData);
                
                if (processedImageUrl) {
                  console.log("✅ AuthContext: Processed image URL:", processedImageUrl);
                  return processedImageUrl;
                } else {
                  console.log("⚠️ AuthContext: Image processing failed for:", rawImageData);
                }
              } else {
                console.log("⚠️ AuthContext: No image found in 'link' column for user:", masterSheetName);
              }
            } else {
              console.log("❌ AuthContext: No matching user found in For Record sheet for:", masterSheetName);
            }
          }
        }
      } catch (error) {
       
      }
      
      
      return null;
      
    } catch (error) {
      
      return null;
    }
  };

  // Enhanced function to process existing image URLs
  const processExistingImageUrl = (imageUrl) => {
    if (!imageUrl) {
     
      return null;
    }
    
   
    
    const processedUrl = processImageUrl(imageUrl);
    if (processedUrl) {
      console.log("✅ AuthContext: Successfully processed image URL:", processedUrl);
      return processedUrl;
    }
    
    // Enhanced fallback handling
    try {
      // Check if the original URL is already valid
      const url = new URL(imageUrl);
      
      // Additional validation for known image domains
      const validDomains = [
        'drive.google.com',
        'lh3.googleusercontent.com',
        'images.unsplash.com',
        'imgur.com',
        'cloudinary.com'
      ];
      
      const isValidDomain = validDomains.some(domain => url.hostname.includes(domain));
      
      if (isValidDomain || url.protocol === 'https:') {
        return imageUrl;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  };

  useEffect(() => {
    const initUser = async () => {
      console.log("🔄 AuthContext: Starting user initialization...");
      
      try {
        const storedUser = localStorage.getItem("user");
        
        if (storedUser) {
          console.log("✅ AuthContext: Found stored user, processing...");
          const userData = JSON.parse(storedUser);
          
          let finalUserData = { ...userData };
          let imageUpdated = false;
          
          // Process existing image URL if available
          if (userData.image) {
            const processedImage = processExistingImageUrl(userData.image);
            
            if (processedImage && processedImage !== userData.image) {
              finalUserData.image = processedImage;
              imageUpdated = true;
            } else if (!processedImage) {
              // Remove invalid image
              finalUserData.image = null;
              imageUpdated = true;
            }
          }
          
          // If user doesn't have image or processing failed, try to fetch it from For Record sheet
          if (!finalUserData.image && userData.name) {
            const fetchedImageUrl = await fetchImageFromForRecordSheet(userData.name);
            
            if (fetchedImageUrl) {
              finalUserData.image = fetchedImageUrl;
              imageUpdated = true;
            }
          }
          
          // ROLE-BASED DESIGNATION AUTO SUBMIT
          if (finalUserData.designations && finalUserData.designations.length > 0) {
            const userKey = finalUserData.id || finalUserData.username || 'default';
            const storageKey = `kpi_selected_designation_${userKey}`;
            let storedDesignation = localStorage.getItem(storageKey);
            
            // Check if stored designation is valid for current user
            const isValidDesignation = storedDesignation && finalUserData.designations.includes(storedDesignation);
            
            let selectedDesignation;
            if (isValidDesignation) {
              // Use stored designation if it's valid for current user
              selectedDesignation = storedDesignation;
              console.log("✅ AuthContext: Using valid stored designation:", selectedDesignation);
            } else {
              // Use first available designation from user's designations array
              selectedDesignation = finalUserData.designations[0];
              localStorage.setItem(storageKey, selectedDesignation);
              console.log("🔄 AuthContext: Stored designation invalid, using user's first designation:", selectedDesignation);
              
              // Clear invalid cached data
              if (storedDesignation) {
                localStorage.removeItem(`kpi_dashboard_data_${storedDesignation}`);
                console.log("🗑️ AuthContext: Cleared invalid designation data:", storedDesignation);
              }
            }
            
            // Auto submit the correct designation to Dashboard sheet
            console.log("🚀 AuthContext: Auto-submitting correct designation on user init:", selectedDesignation);
            await submitDesignationToDashboard(selectedDesignation, finalUserData);
          }
          
          // Update user and localStorage if any changes were made
          if (imageUpdated || JSON.stringify(finalUserData) !== JSON.stringify(userData)) {
            setUser(finalUserData);
            localStorage.setItem("user", JSON.stringify(finalUserData));
          } else {
            setUser(finalUserData);
          }
        } else {
          console.log("ℹ️ AuthContext: No stored user found");
        }
      } catch (error) {
        console.error("💥 AuthContext: Error initializing user:", error);
        localStorage.removeItem("user"); // Clear corrupted data
      } finally {
        console.log("✅ AuthContext: User initialization completed");
        setLoading(false);
        setIsInitializing(false);
      }
    };

    initUser();
  }, []);

  const login = async (userData) => {
    console.log("🔐 AuthContext: User login started");
    setLoading(true); // Show loading during login process
    
    try {
      // Process image URL during login if available
      let processedUserData = { ...userData };
      
      if (userData.image) {
        const processedImage = processExistingImageUrl(userData.image);
        if (processedImage) {
          processedUserData.image = processedImage;
          console.log("✅ AuthContext: Processed image during login:", processedImage);
        } else {
          // Remove invalid image and try to fetch from For Record sheet
          processedUserData.image = null;
          console.log("🗑️ AuthContext: Removed invalid image during login");
        }
      }
      
      // If no valid image, try to fetch from For Record sheet
      if (!processedUserData.image && userData.name) {
        console.log("🔍 AuthContext: Fetching image during login from For Record sheet...");
        const fetchedImageUrl = await fetchImageFromForRecordSheet(userData.name);
        
        if (fetchedImageUrl) {
          processedUserData.image = fetchedImageUrl;
          console.log("✅ AuthContext: Added image during login from For Record sheet:", fetchedImageUrl);
        }
      }
      
      // ROLE-BASED DESIGNATION AUTO SUBMIT ON LOGIN
      if (processedUserData.designations && processedUserData.designations.length > 0) {
        const userKey = processedUserData.id || processedUserData.username || 'default';
        const storageKey = `kpi_selected_designation_${userKey}`;
        let storedDesignation = localStorage.getItem(storageKey);
        
        // Check if stored designation is valid for current user
        const isValidDesignation = storedDesignation && processedUserData.designations.includes(storedDesignation);
        
        let selectedDesignation;
        if (isValidDesignation) {
          // Use stored designation if it's valid for current user
          selectedDesignation = storedDesignation;
          console.log("✅ AuthContext: Using valid stored designation on login:", selectedDesignation);
        } else {
          // Use first available designation from user's designations array
          selectedDesignation = processedUserData.designations[0];
          localStorage.setItem(storageKey, selectedDesignation);
          console.log("🔄 AuthContext: Using user's first designation on login:", selectedDesignation);
          
          // Clear invalid cached data if exists
          if (storedDesignation) {
            localStorage.removeItem(`kpi_dashboard_data_${storedDesignation}`);
            console.log("🗑️ AuthContext: Cleared invalid designation data on login:", storedDesignation);
          }
        }
        
        // Auto submit correct designation to Dashboard sheet immediately on login
        console.log("🚀 AuthContext: Auto-submitting correct designation on login:", selectedDesignation);
        await submitDesignationToDashboard(selectedDesignation, processedUserData);
      }
      
      setUser(processedUserData);
      localStorage.setItem("user", JSON.stringify(processedUserData));
      console.log("✅ AuthContext: User login completed with role-based auto designation submit");
    } catch (error) {
      console.error("💥 AuthContext: Error during login:", error);
    } finally {
      setLoading(false); // Hide loading after login complete
    }
  };

  const logout = () => {
    console.log("👋 AuthContext: Logging out user");
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("kpi_selected_designation");
  };

  const isAuthenticated = () => {
    return !!user;
  };

  // Function to manually update user image
  const updateUserImage = async (masterSheetName) => {
    try {
      console.log("🔄 AuthContext: Manually updating image for:", masterSheetName);
      
      const fetchedImageUrl = await fetchImageFromForRecordSheet(masterSheetName);
      
      if (user && fetchedImageUrl) {
        const updatedUser = {
          ...user,
          image: fetchedImageUrl,
        };
        
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        console.log("✅ AuthContext: Image updated successfully:", fetchedImageUrl);
        return fetchedImageUrl;
      }
      
      return null;
    } catch (error) {
      console.error("💥 AuthContext: Error updating image:", error);
      return null;
    }
  };

  // Function to refresh user data
  const refreshUser = async () => {
    try {
      if (user && user.name) {
        console.log("🔄 AuthContext: Refreshing user data for:", user.name);
        await updateUserImage(user.name);
      }
    } catch (error) {
      console.error("💥 AuthContext: Error refreshing user:", error);
    }
  };

  // Enhanced function to manually process current user's image
  const processCurrentUserImage = async () => {
    if (!user) {
      console.log("🚫 AuthContext: No user available for image processing");
      return null;
    }

    console.log("🔄 AuthContext: Processing current user's image...");
    
    let processedImage = null;
    
    // First, try to process existing image
    if (user.image) {
      processedImage = processExistingImageUrl(user.image);
      
      if (processedImage && processedImage !== user.image) {
        const updatedUser = {
          ...user,
          image: processedImage,
        };
        
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        console.log("✅ AuthContext: Current user image processed successfully:", processedImage);
        return processedImage;
      }
    }
    
    // If still no valid image, try to fetch from For Record sheet
    if (!processedImage && user.name) {
      console.log("🔍 AuthContext: No valid processed image, fetching from For Record sheet...");
      const fetchedImageUrl = await fetchImageFromForRecordSheet(user.name);
      
      if (fetchedImageUrl) {
        const updatedUser = {
          ...user,
          image: fetchedImageUrl,
        };
        
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        console.log("✅ AuthContext: Current user image fetched and updated:", fetchedImageUrl);
        return fetchedImageUrl;
      }
    }
    
    return user?.image || null;
  };

  // New function to get fallback image URLs for onError handlers
  const getImageFallbacks = (imageUrl) => {
    if (!imageUrl) return [];
    
    // Get all possible Google Drive URL variations
    const allUrls = getDriveImageUrls(imageUrl);
    
    // Add common fallback patterns
    const fallbacks = [
      ...allUrls,
      // Generic fallback images
      'https://via.placeholder.com/400x400/cccccc/666666?text=No+Image',
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyNUMyMi43NjE0IDI1IDI1IDIyLjc2MTQgMjUgMjBDMjUgMTcuMjM4NiAyMi43NjE0IDE1IDIwIDE1QzE3LjIzODYgMTUgMTUgMTcuMjM4NiAxNSAyMEMxNSAyMi43NjE0IDE3LjIzODYgMjUgMjAgMjVaIiBmaWxsPSIjOUM5Qzk3Ii8+Cjwvc3ZnPgo='
    ];
    
    return [...new Set(fallbacks)]; // Remove duplicates
  };

  // Function to ensure user has a valid image (useful for header components)
  const ensureUserImage = async () => {
    if (!user) return null;
    
    console.log("🔍 AuthContext: Ensuring user has valid image...");
    
    // If user already has a valid processed image, return it
    if (user.image) {
      const validImage = processExistingImageUrl(user.image);
      if (validImage) {
        console.log("✅ AuthContext: User already has valid image:", validImage);
        return validImage;
      }
    }
    
    // Try to fetch image from For Record sheet
    if (user.name) {
      console.log("🔍 AuthContext: Fetching fresh image for user...");
      const fetchedImage = await fetchImageFromForRecordSheet(user.name);
      
      if (fetchedImage) {
        const updatedUser = {
          ...user,
          image: fetchedImage,
        };
        
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        console.log("✅ AuthContext: Updated user with fresh image:", fetchedImage);
        return fetchedImage;
      }
    }
    
    console.log("⚠️ AuthContext: No valid image found for user");
    return null;
  };

  const value = {
    user,
    login,
    logout,
    loading,
    isInitializing, // New state to check if app is still initializing
    isAuthenticated,
    updateUserImage,
    refreshUser,
    processCurrentUserImage, // Enhanced function to process current image
    ensureUserImage, // New function to ensure user has valid image
    fetchImageFromForRecordSheet, // Expose for debugging
    processExistingImageUrl, // Expose for manual processing
    getDriveImageUrls, // Expose utility function
    processImageUrl, // Expose enhanced image processing function
    getImageFallbacks, // New function for onError handling
    submitDesignationToDashboard, // New function to submit designation
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Login Component Example - showing how to handle loading state
export const LoginFormWrapper = ({ children }) => {
  const { user, loading, isInitializing } = useAuth();
  
  // Show loading spinner during initialization or login process
  if (isInitializing || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }
  
  // If user is authenticated, this will be handled by route protection
  // Show login form only when NOT loading and user is null
  return children;
};

// FIXED SafeImage Component - Instant Loading with Smart Fallback
export const SafeImage = ({ 
  src, 
  alt, 
  className, 
  onError, 
  fallbackSrc,
  name = "User",
  showInitials = false,
  ...props 
}) => {
  const [imgSrc, setImgSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shouldShowFallback, setShouldShowFallback] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(0);

  // Enhanced Google Drive URL processing (avoiding CORS issues)
  const getDriveImageUrls = (originalUrl) => {
    if (!originalUrl || typeof originalUrl !== "string") return [];
    
    // Extract file ID from various Google Drive URL formats
    let fileId = null;
    
    // Handle different URL patterns
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9-_]+)/,
      /[?&]id=([a-zA-Z0-9-_]+)/,
      /\/d\/([a-zA-Z0-9-_]+)/,
      /\/open\?id=([a-zA-Z0-9-_]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = originalUrl.match(pattern);
      if (match) {
        fileId = match[1];
        break;
      }
    }
    
    if (!fileId) {
      // If it's already a working URL, return it
      if (originalUrl.includes('drive.google.com/uc') || originalUrl.includes('lh3.googleusercontent.com')) {
        return [originalUrl];
      }
      return [];
    }
    
    // Return URLs that avoid CORS issues
    return [
      `https://drive.google.com/uc?export=view&id=${fileId}`, // Most reliable, no CORS
      `https://lh3.googleusercontent.com/d/${fileId}=w400-h400-c`, // Good fallback
      `https://lh3.googleusercontent.com/d/${fileId}=w400`, // Medium fallback
      `https://lh3.googleusercontent.com/d/${fileId}`, // Basic fallback
    ];
  };

  // Process and clean image URLs
  const processImageUrl = (rawImageData) => {
    if (!rawImageData || typeof rawImageData !== "string") return null;
    
    const cleanedData = rawImageData.replace(/^"|"$/g, "").trim();
    if (!cleanedData || cleanedData.toLowerCase() === 'link') return null;
    
    let imageUrl = "";
    if (cleanedData.includes(",")) {
      const parts = cleanedData.split(",");
      const validPart = parts.find(part => {
        const trimmed = part.trim();
        return trimmed && (trimmed.startsWith("http") || trimmed.includes("drive.google.com"));
      });
      imageUrl = validPart ? validPart.trim() : parts[0]?.trim() || "";
    } else {
      imageUrl = cleanedData;
    }
    
    if (!imageUrl || imageUrl.toLowerCase() === "link") return null;
    
    const urls = getDriveImageUrls(imageUrl);
    return urls;
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .slice(0, 2)
      .map(part => part.charAt(0))
      .join("")
      .toUpperCase();
  };

  const getFallbackImage = () => {
    if (showInitials) {
      return (
        <div className={`${className} bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-semibold`}>
          {getInitials(name)}
        </div>
      );
    }
    
    const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&size=200&rounded=true`;
    return (
      <img
        src={fallbackUrl}
        alt={alt || name}
        className={className}
        {...props}
      />
    );
  };

  // Initialize image immediately
  useEffect(() => {
    // Reset states
    setShouldShowFallback(false);
    setFallbackIndex(0);
    setIsLoading(true);
    
    // Check if src is valid
    if (!src || src.trim() === "" || src.toLowerCase() === 'link') {
      setShouldShowFallback(true);
      setIsLoading(false);
      return;
    }
    
    // Process URL and get all possible URLs
    const urls = processImageUrl(src);
    
    if (!urls || urls.length === 0) {
      setShouldShowFallback(true);
      setIsLoading(false);
      return;
    }
    
    // Set the first URL immediately - no delay
    setImgSrc(urls[0]);
    setIsLoading(false);
    
  }, [src]);

  const handleImageError = () => {
    if (!src) {
      setShouldShowFallback(true);
      return;
    }
    
    const urls = processImageUrl(src);
    if (!urls || urls.length === 0) {
      setShouldShowFallback(true);
      return;
    }
    
    const nextIndex = fallbackIndex + 1;
    
    if (nextIndex < urls.length) {
      // Try next URL
      setFallbackIndex(nextIndex);
      setImgSrc(urls[nextIndex]);
      console.log("🔄 SafeImage: Trying fallback URL:", urls[nextIndex]);
    } else if (fallbackSrc) {
      // Try custom fallback
      setImgSrc(fallbackSrc);
      console.log("🔄 SafeImage: Using custom fallback:", fallbackSrc);
    } else {
      // Show final fallback
      setShouldShowFallback(true);
    }
    
    if (onError) onError();
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  // Show fallback if needed
  if (shouldShowFallback) {
    return getFallbackImage();
  }

  // Show loading state briefly only if needed
  if (isLoading && !imgSrc) {
    return (
      <div className={`${className} bg-gray-200 animate-pulse flex items-center justify-center`}>
        <div className="text-gray-400 text-xs">Loading...</div>
      </div>
    );
  }

  // Show the actual image
  return (
    <img
      src={imgSrc}
      alt={alt || name}
      onError={handleImageError}
      onLoad={handleImageLoad}
      className={className}
      loading="eager" // Changed from lazy to eager for instant loading
      crossOrigin="anonymous"
      referrerPolicy="no-referrer"
      {...props}
    />
  );
};