// Type declarations for importing BPMN files as raw strings using Vite's ?raw suffix
declare module '*.bpmn?raw' {
  const content: string;
  export default content;
}
