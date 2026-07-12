import { useEffect, useRef } from "react";
import Popup from "./Popup";

const DASHBOARD_BASE_URL = 'https://role-snap-459q4ds2w-samuel-c-mbahs-projects.vercel.app/';
const EXTENSION_AUTH_ROUTE = '/extension-auth';
const CLERK_TOKEN_MESSAGE = 'CLERK_TOKEN';
const REQUEST_CLERK_TOKEN = 'REQUEST_CLERK_TOKEN';

function TokenRelay() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const handleTokenMessage = (event: MessageEvent) => {
      if (event.origin !== DASHBOARD_BASE_URL) return;
      const message = event.data as { type?: string; token?: string | null; error?: string | null };
      if (message?.type !== CLERK_TOKEN_MESSAGE) return;

      chrome.storage.local.set({
        clerkToken: message.token ?? null,
        clerkTokenError: message.error ?? null,
        clerkTokenTimestamp: Date.now(),
      });
    };

    const handleRuntimeMessage = (message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
      if (message?.type !== REQUEST_CLERK_TOKEN) return;

      chrome.storage.local.get(['clerkToken', 'clerkTokenError'], (result) => {
        sendResponse({ token: result.clerkToken ?? null, error: result.clerkTokenError ?? null });
      });

      return true;
    };

    window.addEventListener('message', handleTokenMessage);
    chrome.runtime.onMessage.addListener(handleRuntimeMessage);

    return () => {
      window.removeEventListener('message', handleTokenMessage);
      chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
    };
  }, []);

  return (
    <iframe
      ref={iframeRef}
      title="RoleSnap Clerk relay"
      src={`${DASHBOARD_BASE_URL}${EXTENSION_AUTH_ROUTE}`}
      style={{ display: 'none' }}
      sandbox="allow-scripts allow-same-origin allow-forms"
    />
  );
}

function App() {
  return (
    <>
      <TokenRelay />
      <div className="app-container">
        <Popup />
      </div>
    </>
  );
}

export default App;