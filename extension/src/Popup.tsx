import React, { useEffect, useState } from 'react';

// Define the shape of our Job
interface Job {
  title: string;
  contact_info: string;
}

// Define our possible UI states
type Status = 'idle' | 'loading' | 'success' | 'error';

// Define the shape of what we store in Chrome Storage
interface StorageData {
  lastAction?: {
    status: Status;
    jobs?: Job[];
  };
}

const Popup: React.FC = () => {
  const [status, setStatus] = useState<Status>('idle');
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    // Fetch the last action from storage with explicit typing
    chrome.storage.local.get(['lastAction'], (result: StorageData) => {
      if (result.lastAction) {
        setStatus(result.lastAction.status);
        if (result.lastAction.jobs) {
          setJobs(result.lastAction.jobs);
        }
      }
    });

    // 2. Listen for live updates from background.ts
    // Using a more specific type for the message
    const listener = (message: { type: string; status: Status; jobs?: Job[] }) => {
      if (message.type === 'STATUS_UPDATE') {
        setStatus(message.status);

        if (message.status === 'success') {
          const incomingJobs = message.jobs;
          console.log("Incoming jobs:", incomingJobs);
          setJobs(Array.isArray(incomingJobs) ? incomingJobs : []);
        } else {
          setJobs([]); // Clear list on error
        }
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  return (
    <div className="w-full p-4 bg-white min-h-screen">
      <div className="flex items-center gap-2 mb-6">
        <div className="bg-blue-600 p-1.5 rounded-lg shadow-sm">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          </svg>
        </div>
        <span className="font-bold text-slate-800 text-lg tracking-tight">RoleSnap</span>
      </div>

      {/* IDLE STATE */}
      {status === 'idle' && (
        <div className="py-10 text-center">
          <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed px-4">
            Highlight a job description and <span className="text-blue-600 font-semibold">right-click</span> to save it to your board.
          </p>
        </div>
      )}

      {/* LOADING STATE */}
      {status === 'loading' && (
        <div className="py-12 flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-600 text-sm font-medium animate-pulse">AI is extracting jobs...</p>
        </div>
      )}

      {/* SUCCESS STATE */}
      {status === 'success' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Found {jobs.length} {jobs.length === 1 ? 'Job' : 'Jobs'}
            </h3>
            <div className="flex items-center gap-1.5 bg-green-100 px-2 py-0.5 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              <span className="text-[10px] font-bold text-green-700 uppercase">Synced</span>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {Array.isArray(jobs) && jobs.map((job, index) => (
              <div
                key={index}
                className="group bg-slate-50 border border-slate-200 hover:border-blue-200 hover:bg-blue-50/30 rounded-xl p-4 transition-all duration-200"
              >
                <h2 className="text-slate-900 font-bold text-base leading-tight mb-1 group-hover:text-blue-700 transition-colors">
                  {job.title || "Unknown Title"}
                </h2>
                <p className="text-slate-600 text-sm flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {job.contact_info || "Unknown Contact Info"}
                </p>
              </div>
            ))}
          </div>

          <a
            href="https://rolesnap-dashboard.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="block text-center w-full bg-slate-900 hover:bg-black text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-slate-200 text-sm"
          >
            Go to Dashboard
          </a>
        </div>
      )}

      {/* ERROR STATE */}
      {status === 'error' && (
        <div className="py-8 text-center bg-red-50/50 rounded-2xl border border-red-100">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-3">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-slate-900 font-bold">Extraction Failed</p>
          <p className="text-slate-500 text-xs mt-1 px-6 leading-relaxed">
            We couldn't retrieve job details in that text. Try highlighting the job title and contact information directly.
          </p>
          <button
            onClick={() => setStatus('idle')}
            className="mt-6 px-4 py-2 bg-white border border-red-200 rounded-lg text-xs text-red-600 font-bold hover:bg-red-50 transition-colors shadow-sm"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default Popup;