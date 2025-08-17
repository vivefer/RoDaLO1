export const generateScanData = (gridX, gridY, stepSize) => {
  const data = [];
  
  for (let y = 0; y < gridY; y++) {
    for (let x = 0; x < gridX; x++) {
      data.push({
        x: x * stepSize,
        y: y * stepSize,
        z: Math.random() * 25 + 5, // Height between 5-30cm
        gridX: x,
        gridY: y
      });
    }
  }
  
  return data;
};

export const generateHeightMap = (gridX, gridY) => {
  // Generate more realistic height data using Perlin noise simulation
  const heightMap = [];
  
  for (let y = 0; y < gridY; y++) {
    const row = [];
    for (let x = 0; x < gridX; x++) {
      // Simple noise function
      const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 10 + 
                   Math.random() * 5 + 10;
      row.push(Math.max(0, noise));
    }
    heightMap.push(row);
  }
  
  return heightMap;
};
