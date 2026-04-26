const API_BASE_URL = 'https://rolesnap-worker.samuelcmbah.workers.dev'; //live worker URL

// Create a right-click menu item, when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-job",
    title: "Save Job to RoleSnap",
    contexts: ["selection"]
  });
  console.log("Context menu 'Save to RoleSnap' created.");
});

// Listen for the click on the Context Menu
chrome.contextMenus.onClicked.addListener(async(info, tab) => {
  if (info.menuItemId === "save-job") {

    const selectedText = info.selectionText ?? "";
    const sourceUrl = tab?.url ?? "";

    console.log("Selected text captured:", selectedText.substring(0, 50) + "...");
    console.log("Source URL:", sourceUrl);

    // this is where we'll POST to the API
    try {
      await handleJobCapture(selectedText, sourceUrl);
    } catch (error) {
      console.error("Capture failed:", error);
    }
  }
});

async function handleJobCapture(text: string, sourceUrl: string) {
  console.log("Sending to RoleSnap API...");

  try {
    const parseResponse = await fetch(`${API_BASE_URL}/api/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, sourceUrl })
    });

    if (!parseResponse.ok) {
      const errorData = await parseResponse.json();
      console.error("API Error:", errorData.error);
      throw new Error(errorData.error || "Failed to parse");
    }

    const parsedJobs = await parseResponse.json();

    if (parsedJobs.length === 0) {
      console.warn("Parsing succeeded but no jobs were extracted.");
    }

    // Save the parsed job(s) to your Turso DB via your Worker
    const saveResponse = await fetch(`${API_BASE_URL}/api/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsedJobs)
    });

    if (saveResponse.ok) {
      console.log("✅ Job successfully saved to RoleSnap!");

      // Optional: Visual feedback (Notification)
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon128.png',
        title: 'RoleSnap',
        message: 'Job captured and saved!'
      });
    }
  }
  catch (error: any) {
    console.error("Error in handleJobCapture:", error);
  }

}