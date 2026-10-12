const paths:Record<string,React.ReactNode>={
  panel:<><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/></>,
  compose:<><path d="M13 5H6a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-7"/><path d="m10 14 1-4L19 2l3 3-8 8-4 1Z"/></>,
  search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  down:<path d="m7 10 5 5 5-5"/>,up:<path d="m7 14 5-5 5 5"/>,arrow:<><path d="M12 19V5m-6 6 6-6 6 6"/></>,
  plus:<path d="M12 5v14M5 12h14"/>,stop:<rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor" stroke="none"/>,
  folder:<path d="M3 7V5a2 2 0 0 1 2-2h5l3 3h6a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>,
  copy:<><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3"/></>,
  settings:<><path d="m10 3-1 3-3 1-3 3 2 3-1 3 3 2 3-1 3 2 3-2 1-3 3-1-1-4-3-1-1-3-4-1Z"/><circle cx="12" cy="12" r="3"/></>,
  check:<path d="m5 12 4 4L19 6"/>,close:<path d="m6 6 12 12M6 18 18 6"/>,
  terminal:<><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m6 9 3 3-3 3m6 0h5"/></>,
  shield:<><path d="M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6l-9-4Z"/><path d="m8 12 3 3 5-6"/></>,
  dots:<><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></>,
  logout:<><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5m5-4 4-4-4-4m-6 4h10"/></>,
  file:<><path d="M14 2H5v20h14V7l-5-5Z"/><path d="M14 2v5h5M8 12h8m-8 4h6"/></>,
  bolt:<path d="m13 2-9 12h7l-1 8 10-13h-7l0-7Z"/>,
};
export function Icon({name,size=20}:{name:string;size?:number}) {return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.bolt}</svg>;}
