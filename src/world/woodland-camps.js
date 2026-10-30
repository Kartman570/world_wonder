import { W, H, TILE, point } from '../core/content.js';
import { segmentDistance } from './map-geometry.js';
import { frontierContains } from './frontier-geography.js';
export function placeForestCamps(w, r, routeRoad) {
  const segments = w.roads.flatMap((path) => path.slice(1).map((b, i) => [path[i], b])),
    main = w.mainRoads.flatMap((path) => path.slice(1).map((b, i) => [path[i], b]));
  w.trailMask = new Uint8Array(W * H);
  w.forestTrails = [];
  const camps = w.places.filter((z) => ['red', 'ash', 'thorn'].includes(z.id)),
    placed = [];
  for (const z of camps) {
    let site;
    for (let attempt = 0; attempt < 24000; attempt++) {
      const [a, b] = main[Math.floor(r() * main.length)],
        t = r(),
        side = r() < 0.5 ? -1 : 1,
        d = 50 + r() * (attempt < 8000 ? 70 : 190),
        dx = b[0] - a[0],
        dy = b[1] - a[1],
        len = Math.hypot(dx, dy) || 1,
        x = Math.round(a[0] + dx * t - (dy / len) * d * side),
        y = Math.round(a[1] + dy * t + (dx / len) * d * side);
      if (x < 30 || y < 30 || x > W - 31 || y > H - 31 || frontierContains(w, x, y, 45)) continue;
      if (w.cities.some((p) => p.portSite && Math.hypot(p.portSite.x - x, p.portSite.y - y) < 60))
        continue;
      if (
        w.places.some(
          (p) =>
            p !== z &&
            !camps.includes(p) &&
            Math.hypot(p.x - x, p.y - y) < (p.r || 20) + (w.cities.includes(p) ? 70 : 45),
        ) ||
        placed.some((p) => Math.hypot(p.x - x, p.y - y) < 90)
      )
        continue;
      let nearest,
        dist = Infinity;
      for (const [a, b] of segments) {
        const dd = segmentDistance(x, y, a, b);
        if (dd < dist) {
          dist = dd;
          const dx = b[0] - a[0],
            dy = b[1] - a[1],
            t = Math.max(
              0,
              Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)),
            );
          nearest = [a[0] + dx * t, a[1] + dy * t];
        }
      }
      if (dist < 42 || dist > (attempt < 8000 ? 115 : 260)) continue;
      let dry = true,
        forest = 0,
        total = 0;
      for (let yy = -13; yy <= 13; yy += 2)
        for (let xx = -16; xx <= 16; xx += 2)
          if ([2, 4, 17].includes(w.tile(x + xx, y + yy))) dry = false;
      for (let yy = -32; yy <= 32; yy += 8)
        for (let xx = -32; xx <= 32; xx += 8) {
          total++;
          if ([0, 9].includes(w.tile(x + xx, y + yy))) forest++;
        }
      if (!dry || forest / total < (attempt < 8000 ? 0.6 : 0.55)) continue;
      site = { x, y, near: nearest, roadDistance: dist };
      break;
    }
    if (!site) throw new Error('No forest clearing for ' + z.id + ' ' + w.seed);
    Object.assign(z, site, { forestCamp: true });
    placed.push(z);
    const paint = (path) => {
      for (let k = 1; k < path.length; k++) {
        const a = path[k - 1],
          b = path[k],
          steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2);
        for (let j = 0; j <= steps; j++) {
          const t = j / (steps || 1),
            x = Math.round(a[0] + (b[0] - a[0]) * t),
            y = Math.round(a[1] + (b[1] - a[1]) * t),
            i = y * W + x;
          if (w.roadMask[i]) continue;
          w.trailMask[i] = 1;
          w.tiles[i] = [2, 4, 5].includes(w.tiles[i]) ? 5 : 19;
        }
      }
    };
    let path;
    w.allowForestTrail = true;
    try {
      path = routeRoad(w, [site.near, [z.x, z.y]], paint);
    } finally {
      w.allowForestTrail = false;
    }
    w.forestTrails.push({
      camp: z.id,
      points: path,
      junction: point(...site.near),
      destination: point(z.x, z.y),
    });
  }
  const thorn = camps.find((z) => z.id === 'thorn');
  Object.assign(w.territories[3], point(thorn.x, thorn.y));
}
