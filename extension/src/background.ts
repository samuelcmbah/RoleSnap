// Create a right-click menu item
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-job",
    title: "Save Job to RoleSnap",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const selectedText = info.selectionText;
  const sourceUrl = tab?.url ?? "";

  console.log("Selected text:", selectedText);
  console.log("Source URL:", sourceUrl);

  // Week 4: this is where we'll POST to the API
});