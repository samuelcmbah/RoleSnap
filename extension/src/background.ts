const API_BASE_URL = 'https://rolesnap-worker.samuelcmbah.workers.dev'; //live worker URL
const TOKEN_POLL_INTERVAL = 250
const TOKEN_POLL_TIMEOUT = 8000

const readClerkTokenFromStorage = () => {
  return new Promise<{ clerkToken?: string | null; clerkTokenError?: string | null }>((resolve) => {
    chrome.storage.local.get(['clerkToken', 'clerkTokenError'], (result) => {
      resolve(result as { clerkToken?: string | null; clerkTokenError?: string | null })
    })
  })
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const getClerkToken = async (): Promise<string | null> => {
  const deadline = Date.now() + TOKEN_POLL_TIMEOUT

  while (Date.now() < deadline) {
    const result = await readClerkTokenFromStorage()
    if (result.clerkToken) {
      return result.clerkToken
    }
    if (result.clerkTokenError) {
      console.warn('Clerk token error from dashboard iframe:', result.clerkTokenError)
      return null
    }
    await delay(TOKEN_POLL_INTERVAL)
  }

  return null
}

// Create a right-click menu item, when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error("SidePanel Setup Error:", error));
  } else {
    console.error("SidePanel API not found! Check your manifest.json permissions.");
  }

  chrome.contextMenus.create({
    id: "save-job",
    title: "Save Job to RoleSnap",
    contexts: ["selection"]
  });

  console.log("RoleSnap initialized: Sidebar behavior set and Context Menu created.");
});

// Listen for the click on the Context Menu
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "save-job") {
    if (!tab || !tab.windowId || !tab.id) {
      console.error("Context menu clicked, but tab information is missing.");
      return;
    }

    const selectedText = info.selectionText ?? "";
    const sourceUrl = tab?.url ?? "";

    console.log("Selected text captured:", selectedText.substring(0, 50) + "...");
    console.log("Source URL:", sourceUrl);

    // OPEN THE SIDE PANEL AUTOMATICALLY
    // This ensures that if the user right-clicks to save, the sidebar 
    // opens up so they can see the loading/success state.
    await chrome.sidePanel.open({
      tabId: tab.id,
      windowId: tab.windowId
    });

    // Notify Popup we are starting
    await chrome.storage.local.set({
      lastAction: {
        status: 'loading',
        jobs: []
      }
    });

    // Broadcast to popup if it's currently open
    chrome.runtime.sendMessage({
      type: 'STATUS_UPDATE',
      status: 'loading'
    });

    // this is where we'll POST to the API
    try {
      await handleJobCapture(selectedText, sourceUrl);

    } catch (error) {
      console.error("Capture failed:", error);

      await chrome.storage.local.set({
        lastAction: {
          status: 'error',
          jobs: []
        }
      });

      chrome.runtime.sendMessage({
        type: 'STATUS_UPDATE',
        status: 'error'
      });
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

    const response = await parseResponse.json();

    const parsedJobs = Array.isArray(response.data) ? response.data : [response.data];

    console.log("Parsed jobs received from API:", parsedJobs);
    if (parsedJobs.length === 0) {
      await chrome.storage.local.set({
        lastAction: {
          status: 'error',
          jobs: []
        }
      });

      chrome.runtime.sendMessage({
        type: 'STATUS_UPDATE',
        status: 'error'
      });

      return;
    }

    const token = await getClerkToken();
    if (!token) {
      console.error('Missing Clerk token for /api/jobs request');
      throw new Error('Not authenticated with Clerk. Open the dashboard and sign in to connect the extension.');
    }

    // Save the parsed job(s) to your Turso DB via your Worker
    const saveResponse = await fetch(`${API_BASE_URL}/api/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(parsedJobs)
    });

    if (!saveResponse.ok) {
      const errorData = await saveResponse.json();
      console.error('Save API Error:', errorData.error);
      throw new Error(errorData.error?.message || 'Failed to save jobs');
    }

    console.log("✅ Job successfully saved to RoleSnap!");

    // 2. Store success state for the Popup
    const successData = {
      status: 'success',
      jobs: Array.isArray(parsedJobs) ? parsedJobs : [parsedJobs]
    };

    await chrome.storage.local.set({
      lastAction: {
        status: 'success',
        jobs: successData.jobs
      }
    });

    chrome.runtime.sendMessage({
      type: 'STATUS_UPDATE',
      status: 'success',
      jobs: successData.jobs
    });

    // Optional: Visual feedback (Notification)
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon128.png',
      title: 'RoleSnap',
      message: 'Job captured and saved!'
    });
  } catch (error: any) {
    console.error("Error in handleJobCapture:", error);

    await chrome.storage.local.set({
      lastAction: {
        status: 'error',
        jobs: []
      }
    });

    chrome.runtime.sendMessage({
      type: 'STATUS_UPDATE',
      status: 'error'
    });
  }
}
