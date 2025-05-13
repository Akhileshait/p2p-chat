/// <reference types="vite/client" />

interface Window {
  global: Window;
  process: {
    env: Record<string, string>;
  };
}

declare global {
  interface Process {
    env: Record<string, string>;
  }
  
  var process: Process;
}
