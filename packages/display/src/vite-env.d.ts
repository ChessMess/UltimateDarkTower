declare module '*.svg?raw' {
  const content: string;
  export default content;
}

declare module '*.glb' {
  const url: string;
  export default url;
}

declare module '*.glb?url' {
  const url: string;
  export default url;
}

declare module '*.png' {
  const url: string;
  export default url;
}
