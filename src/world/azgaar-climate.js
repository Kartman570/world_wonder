// Adapted from Azgaar's precipitation-generator.ts (MIT, vendor/azgaar.LICENSE).
// The UI/options globals are replaced by explicit grid inputs and a seeded wind.
export function transportMoisture(heights, nx, ny, random) {
  const rain = new Float32Array(heights.length),
    west = random() < 0.65,
    north = random() < 0.5;
  const pass = (start, step, count) => {
    let humidity = Math.max(0, 110 - heights[start]);
    for (let j = 0, i = start; j < count; j++, i += step) {
      const h = heights[i],
        next = j < count - 1 ? heights[i + step] : h;
      if (h < 20) {
        humidity = Math.min(110, humidity + 9);
        rain[i] += 3;
        continue;
      }
      const rise = Math.max(0, next - h),
        normal = Math.max(0.25, humidity / 26),
        loss = Math.min(humidity, normal + rise * (h / 70) ** 2);
      rain[i] += loss;
      humidity = Math.max(0, humidity - loss + (loss > 1.5 ? 0.5 : 0));
    }
  };
  for (let y = 0; y < ny; y++) pass(y * nx + (west ? 0 : nx - 1), west ? 1 : -1, nx);
  for (let x = 0; x < nx; x++) pass((north ? 0 : (ny - 1) * nx) + x, north ? nx : -nx, ny);
  return {
    rain,
    wind: { horizontal: west ? 'west' : 'east', vertical: north ? 'north' : 'south' },
  };
}
