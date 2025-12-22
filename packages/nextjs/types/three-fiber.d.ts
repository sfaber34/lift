import "@react-three/fiber";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      boxGeometry: any;
      meshStandardMaterial: any;
      meshBasicMaterial: any;
      cylinderGeometry: any;
      coneGeometry: any;
      sphereGeometry: any;
      planeGeometry: any;
      ambientLight: any;
      directionalLight: any;
      fog: any;
    }
  }
}

export {};
