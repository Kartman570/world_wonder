import { createTownPlan, mainTownStreets } from './town-plan.js';
import { pointInPolygon, MinHeap } from './map-geometry.js';
import { W, H, TILE, point } from '../core/content.js';
import { settlementInside } from './settlement-shapes.js';
import { gatePlan, gateTile, gateOpening, townWorkRoads } from './settlements.js';
const names = {
  smith: 'Smithy',
  cook: 'Inn',
  herbalist: 'Herbalist’s Shop',
  tailor: 'Weaving Workshop',
  farmer: 'Farm Shop',
  armorer: 'Armory',
  bowyer: 'Bowyer',
  leatherworker: 'Leatherworking Workshop',
  provisioner: 'Provisions Shop',
};
const shopType = {
  cook: 'inn',
  herbalist: 'apothecary',
  farmer: 'farmshop',
  armorer: 'armory',
  bowyer: 'bowshop',
  leatherworker: 'leatherworks',
  provisioner: 'provisions',
};
export function generateSettlement(w, z, clear, r) {
  if (w.generatorVersion >= 10) createTownPlan(w, z, r);
  gatePlan(w, z, r);
  const occupied = new Set(),
    streets = new Set(),
    footprints = new Set(),
    buildings = [],
    key = (x, y) => y * W + x,
    inside = (x, y, pad = 0) => settlementInside(z, x, y, pad);
  for (let y = z.y - z.ry; y <= z.y + z.ry; y++)
    for (let x = z.x - z.rx; x <= z.x + z.rx; x++) if (inside(x, y)) w.tiles[key(x, y)] = 0;
  const carve = (x, y, width = 2) => {
    x = Math.round(x);
    y = Math.round(y);
    for (let dy = -Math.floor(width / 2); dy <= Math.floor(width / 2); dy++)
      for (let dx = -Math.floor(width / 2); dx <= Math.floor(width / 2); dx++)
        if (inside(x + dx, y + dy)) {
          w.tiles[key(x + dx, y + dy)] = 3;
          streets.add(key(x + dx, y + dy));
        }
  };
  const line = (a, b, width = 2) => {
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2);
    for (let j = 0; j <= n; j++)
      carve(a[0] + ((b[0] - a[0]) * j) / n, a[1] + ((b[1] - a[1]) * j) / n, width);
  };
  const plaza = z.kind === 'capital' ? 10 : z.kind === 'town' ? 7 : 4;
  for (let y = z.y - plaza; y <= z.y + plaza; y++)
    for (let x = z.x - plaza; x <= z.x + plaza; x++) carve(x, y, 1);
  // Search over the actual settlement outline, so concave forms never cut through their own wall.
  const path = (from, to, avoid = true, extra = null) => {
    if (z.wardPlan) {
      const start = key(Math.round(from.x), Math.round(from.y)),
        goal = key(Math.round(to.x), Math.round(to.y)),
        heap = new MinHeap(),
        cost = new Map([[start, 0]]),
        prev = new Map([[start, -1]]);
      heap.push(start, 0);
      while (heap.length) {
        const { id: i, cost: popped } = heap.pop();
        if (popped > cost.get(i)) continue;
        if (i === goal) {
          const route = [];
          for (let j = i; j !== -1; j = prev.get(j)) route.push([j % W, Math.floor(j / W)]);
          return route.reverse();
        }
        const x = i % W,
          y = Math.floor(i / W);
        for (const [dx, dy] of [
          [1, 0],
          [0, 1],
          [-1, 0],
          [0, -1],
        ]) {
          const xx = x + dx,
            yy = y + dy,
            n = key(xx, yy);
          if (
            !inside(xx, yy) ||
            (avoid && footprints.has(n)) ||
            (extra &&
              xx >= extra.x &&
              xx < extra.x + extra.w &&
              yy >= extra.y &&
              yy < extra.y + extra.h)
          )
            continue;
          const c = cost.get(i) + (streets.has(n) ? 1 : 5);
          if (c < (cost.get(n) ?? Infinity)) {
            cost.set(n, c);
            prev.set(n, i);
            heap.push(n, c);
          }
        }
      }
      return null;
    }
    const sx = Math.round(from.x),
      sy = Math.round(from.y),
      tx = Math.round(to.x),
      ty = Math.round(to.y),
      start = key(sx, sy),
      goal = key(tx, ty),
      queue = [start],
      prev = new Map([[start, -1]]);
    for (let j = 0; j < queue.length; j++) {
      const i = queue[j];
      if (i === goal) {
        const route = [];
        for (let n = i; n !== -1; n = prev.get(n)) route.push([n % W, Math.floor(n / W)]);
        return route.reverse();
      }
      const x = i % W,
        y = Math.floor(i / W);
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ]) {
        const xx = x + dx,
          yy = y + dy,
          n = key(xx, yy);
        if (!prev.has(n) && inside(xx, yy) && (!avoid || !footprints.has(n))) {
          prev.set(n, i);
          queue.push(n);
        }
      }
    }
    return null;
  };
  if (z.wardPlan) {
    for (const edge of z.wardPlan.edges) line(edge.points[0], edge.points[1], 1);
    for (const route of mainTownStreets(z))
      for (let i = 1; i < route.length; i++) line(route[i - 1], route[i], 3);
    const poly = z.wardPlan.wards[0].polygon;
    for (let y = z.y - 15; y <= z.y + 15; y++)
      for (let x = z.x - 15; x <= z.x + 15; x++) if (pointInPolygon(poly, x, y)) carve(x, y, 1);
  } else
    for (const g of z.gatePlan) {
      const route = path(g, z, false);
      if (route) for (const [x, y] of route) carve(x, y, 5);
    }
  if (z.wardPlan) {
  } else if (z.streetPattern === 'rings') {
    for (const radius of [0.38, 0.69]) {
      let prev;
      for (let a = 0; a <= Math.PI * 2 + 0.05; a += 0.06) {
        const p = [z.x + Math.cos(a) * z.rx * radius, z.y + Math.sin(a) * z.ry * radius];
        if (prev) line(prev, p, 1);
        prev = p;
      }
    }
  } else if (z.streetPattern === 'lanes') {
    for (const f of [-0.57, -0.25, 0.28, 0.61])
      line([z.x + z.rx * f, z.y - z.ry * 0.85], [z.x + z.rx * f, z.y + z.ry * 0.85], 1);
    for (const f of [-0.52, 0.52])
      line([z.x - z.rx * 0.85, z.y + z.ry * f], [z.x + z.rx * 0.85, z.y + z.ry * f], 1);
  } else if (z.streetPattern === 'winding') {
    for (const side of [-1, 1]) {
      let prev;
      for (let y = -z.ry * 0.85; y < z.ry * 0.85; y++) {
        const p = [z.x + side * z.rx * 0.45 + Math.sin(y * 0.08 + z.shapePhase) * 6, z.y + y];
        if (prev) line(prev, p, 1);
        prev = p;
      }
    }
  } else
    for (const side of [-1, 1]) {
      line(
        [z.x - z.rx * 0.8, z.y + side * z.ry * 0.58],
        [z.x + z.rx * 0.8, z.y - side * z.ry * 0.58],
        1,
      );
    }
  const add = (b) => {
    b.city = z.id;
    b.style = { ...z.style };
    b.palette = z.palette;
    buildings.push(b);
    w.buildings.push(b);
    for (let y = b.y; y < b.y + b.h; y++)
      for (let x = b.x; x < b.x + b.w; x++) footprints.add(key(x, y));
    for (let y = b.y - (z.wardPlan ? 0 : 1); y <= b.y + b.h + (z.wardPlan ? 0 : 1); y++)
      for (let x = b.x - (z.wardPlan ? 0 : 1); x <= b.x + b.w + (z.wardPlan ? -1 : 1); x++)
        occupied.add(key(x, y));
    if (b.approach) {
      for (const [x, y] of b.approach) if (!footprints.has(key(x, y))) carve(x, y, 1);
      delete b.approach;
    }
    return b;
  };
  const fit = (b, relax) => {
    if (z.wardPlan) {
      for (let y = b.y; y <= b.y + b.h; y++)
        for (let x = b.x; x < b.x + b.w; x++)
          if (
            !inside(x, y, 1) ||
            occupied.has(key(x, y)) ||
            streets.has(key(x, y)) ||
            (Math.abs(x - z.x) < plaza + 1 && Math.abs(y - z.y) < plaza + 1)
          )
            return false;
      b.approach = path({ x: b.x + Math.floor(b.w / 2), y: b.y + b.h + 1 }, z, true, b);
      return !!b.approach;
    }
    for (let y = b.y - 1; y <= b.y + b.h + 1; y++)
      for (let x = b.x - 1; x <= b.x + b.w + 1; x++)
        if (
          !inside(x, y, 2) ||
          occupied.has(key(x, y)) ||
          (!relax && streets.has(key(x, y))) ||
          (Math.abs(x - z.x) < plaza + 2 && Math.abs(y - z.y) < plaza + 2)
        )
          return false;
    return true;
  };
  if (z.fortified)
    for (const g of z.gatePlan) {
      const [dx, dy] = g.side === 'N' || g.side === 'S' ? [7, 0] : [0, 7];
      for (const side of [-1, 1])
        for (let y = g.y + dy * side - 2; y <= g.y + dy * side + 1; y++)
          for (let x = g.x + dx * side - 2; x <= g.x + dx * side + 1; x++) occupied.add(key(x, y));
    }
  const lots = [];
  for (let y = z.y - z.ry + 4; y < z.y + z.ry - 8; y += 1)
    for (let x = z.x - z.rx + 4; x < z.x + z.rx - 8; x++) lots.push({ x, y });
  for (let j = lots.length - 1; j; j--) {
    const k = Math.floor(r() * (j + 1));
    [lots[j], lots[k]] = [lots[k], lots[j]];
  }
  const place = (type, name, width = 7, height = 7, required = true) => {
    if (z.wardPlan) {
      const ranked = z.wardPlan.lots
        .slice()
        .sort((a, b) =>
          required
            ? b.area - a.area
            : Math.hypot(a.center[0] - z.x, a.center[1] - z.y) -
              Math.hypot(b.center[0] - z.x, b.center[1] - z.y),
        );
      for (const lot of ranked)
        for (const [dx, dy] of [
          [0, 0],
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ]) {
          const b = {
            x: Math.round(lot.center[0] - width / 2) + dx,
            y: Math.round(lot.center[1] - height / 2) + dy,
            w: width,
            h: height,
            type,
            name,
            ward: lot.ward,
            parcel: z.wardPlan.lots.indexOf(lot),
          };
          if (fit(b, false)) return add(b);
        }
    }
    for (const relax of z.wardPlan ? [false] : [false, true])
      for (const p of lots) {
        const b = { ...p, w: width, h: height, type, name };
        if (fit(b, relax)) return add(b);
      }
    if (required) {
      const counts = { inside: 0, occupied: 0, streets: 0, plaza: 0, area: 0 };
      for (const p of lots) {
        let ok = true;
        for (let y = p.y - 1; y <= p.y + height + 1 && ok; y++)
          for (let x = p.x - 1; x <= p.x + width + 1; x++) {
            if (!inside(x, y, 2)) {
              counts.inside++;
              ok = false;
              break;
            }
            if (occupied.has(key(x, y))) {
              counts.occupied++;
              ok = false;
              break;
            }
            if (streets.has(key(x, y))) {
              counts.streets++;
              ok = false;
              break;
            }
            if (Math.abs(x - z.x) < plaza + 2 && Math.abs(y - z.y) < plaza + 2) {
              counts.plaza++;
              ok = false;
              break;
            }
          }
        if (ok) counts.area++;
      }
      throw new Error(
        'No ' + type + ' lot ' + w.seed + ' ' + z.kind + ' ' + JSON.stringify(counts),
      );
    }
    return null;
  };
  let castle;
  if (z.kind === 'capital') {
    castle = place('castle', 'Castle ' + z.name, 16, 12);
    place('barracks', 'Town Guard Barracks', 12, 9);
    place('barracks', 'Archers’ Yard', 10, 8);
  } else if (z.kind === 'town') place('townhall', 'Town Hall ' + z.name, 9, 7);
  const originalLots = [...lots];
  if (castle)
    lots.sort(
      (a, b) =>
        Math.hypot(a.x - castle.x, a.y - castle.y) - Math.hypot(b.x - castle.x, b.y - castle.y),
    );
  place(
    z.kind === 'village' ? 'cage' : 'prison',
    z.kind === 'capital' ? 'Royal Prison' : z.kind === 'village' ? 'Village Cage' : 'Town Jail',
    z.kind === 'capital' ? 17 : z.kind === 'village' ? 5 : 9,
    z.kind === 'capital' ? 14 : z.kind === 'village' ? 7 : 8,
  );
  lots.splice(0, lots.length, ...originalLots);
  const stock = place(
    'warehouse',
    z.isVillage ? 'Shared Granary' : 'Town Warehouses',
    z.isVillage ? 6 : 8,
    z.isVillage ? 6 : 7,
  );
  for (const role of z.traderRoles) {
    const b = place(
      shopType[role] || role,
      (names[role] || role) +
        ' “' +
        ['By Three Pines', 'Copper Key', 'White Stone', 'Old Linden', 'Seven Roads'][
          Math.floor(r() * 5)
        ] +
        '”',
    );
    b.traderRole = role;
  }

  const min =
      w.generatorVersion >= 11
        ? z.kind === 'capital'
          ? 28
          : z.kind === 'town'
            ? 12
            : 5
        : z.kind === 'capital'
          ? 38
          : z.kind === 'town'
            ? 16
            : 7,
    target =
      min +
      (w.generatorVersion >= 11
        ? z.kind === 'capital'
          ? 12
          : z.kind === 'town'
            ? 5
            : 2
        : z.wardPlan
          ? z.kind === 'capital'
            ? 30
            : z.kind === 'town'
              ? 10
              : 3
          : 0) +
      Math.floor(r() * (z.kind === 'capital' ? 16 : z.kind === 'town' ? 9 : 5));
  let houses = 0;
  for (let j = 0; j < target; j++) {
    const b = place(
      'house',
      'House',
      w.generatorVersion >= 11
        ? 8 + Math.floor(r() * 3)
        : z.isVillage
          ? 5
          : 5 + Math.floor(r() * 3),
      w.generatorVersion >= 11 ? 7 : z.isVillage ? 5 : 5 + Math.floor(r() * 2),
      false,
    );
    if (b) houses++;
  }
  for (let j = houses; j < min; j++) {
    const b = place('house', 'House', 5, 5, false);
    if (b) houses++;
  }
  for (let j = houses; j < min; j++) {
    if (place('house', 'Small House', 4, 5, false)) houses++;
  }
  for (let j = houses; j < min; j++) {
    if (place('house', 'House by the Jail', 4, 4, false)) houses++;
  }
  if (houses < min) throw new Error('Insufficient homes ' + w.seed + ' ' + z.kind + ': ' + houses);
  if (z.wardPlan)
    for (const lot of z.wardPlan.lots.filter((lot, index) =>
      buildings.some((b) => b.parcel === index),
    ))
      for (let i = 0; i < lot.polygon.length; i++) {
        const a = lot.polygon[i],
          b = lot.polygon[(i + 1) % lot.polygon.length],
          n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2));
        for (let j = 0; j <= n; j++) {
          const x = Math.round(a[0] + ((b[0] - a[0]) * j) / n),
            y = Math.round(a[1] + ((b[1] - a[1]) * j) / n);
          if (!occupied.has(key(x, y))) carve(x, y, 1);
        }
      }
  for (const b of buildings) {
    const door = { x: b.x + Math.floor(b.w / 2), y: b.y + b.h + 1 },
      route = path(door, z);
    if (!route) throw new Error('Disconnected building ' + b.type + ' ' + w.seed);
    for (const [x, y] of route) if (!footprints.has(key(x, y))) carve(x, y, 1);
    for (let y = b.y - 1; y < b.y + b.h + 2; y++)
      for (let x = b.x - 1; x < b.x + b.w + 1; x++)
        if (inside(x, y) && !footprints.has(key(x, y))) w.tiles[key(x, y)] = 3;
  }
  // Compact workshops are already full-height, unlike legacy street-front rooms.
  for (const b of buildings) b.fullRoom = true;
  if (z.fortified) {
    let last;
    for (const p of z.wallBoundary) {
      if (gateOpening(z, p.x, p.y)) continue;
      const b = { x: p.x, y: p.y, w: 1, h: 1, type: 'wall', city: z.id, style: { ...z.style } };
      if (last && last.y === b.y && last.x + last.w === b.x) last.w++;
      else {
        w.buildings.push(b);
        last = b;
      }
    }
    for (const g of z.gatePlan) {
      const [dx, dy] = g.side === 'N' || g.side === 'S' ? [7, 0] : [0, 7];
      for (const side of [-1, 1])
        w.buildings.push({
          x: g.x + dx * side - 1,
          y: g.y + dy * side - 1,
          w: 2,
          h: 2,
          type: 'tower',
          city: z.id,
          style: { ...z.style },
        });
    }
  }
  const decor = (type, x, y) =>
    w.buildings.push({ x, y, w: 1, h: 1, type, city: z.id, style: { ...z.style } });
  if (z.kind === 'capital')
    for (const [dx, dy] of [
      [-7, -7],
      [7, -7],
      [-7, 7],
      [7, 7],
    ])
      decor('statue', z.x + dx, z.y + dy);
  for (const g of z.gatePlan) decor('cityFlag', g.x + 1, g.y + 1);
  decor('cityFlag', z.x + plaza - 1, z.y - plaza + 1);
  z.houseCount = houses;
  z.layoutName =
    { capital: 'Royal City', town: 'Artisans’ Town', village: 'Village' }[z.kind] +
    ' · ' +
    {
      wards: 'Voronoi wards',
      oval: 'oval',
      organic: 'irregular outline',
      twin: 'two boroughs',
      terraces: 'terraced',
      spindle: 'elongated',
      fan: 'fan-shaped',
      rounded: 'rounded',
    }[z.pattern];
  for (const [name, x, y] of [
    [z.layoutName, z.x, z.y - plaza - 3],
    ['CENTRAL SQUARE', z.x, z.y],
    ['RESIDENTIAL WARDS', z.x - z.rx * 0.4, z.y + z.ry * 0.4],
    ['MARKET', z.x + z.rx * 0.3, z.y],
    ['MAIN GATE', z.primaryGate.x, z.primaryGate.y],
    ['WAREHOUSES', stock.x, stock.y],
  ])
    w.districts.push({ name, ...point(x, y), city: z.id });
  if (castle)
    w.districts.push({
      name: 'ROYAL COURT',
      ...point(castle.x + 8, castle.y + 13),
      city: z.id,
    });
  if (z.wardPlan)
    for (const ward of z.wardPlan.wards.filter((ward) => ward.id !== 0)) {
      const name =
        ward.id === 0
          ? 'MARKET SQUARE'
          : ward.type === 'craft'
            ? 'CRAFTING BOROUGH'
            : ward.type === 'garden'
              ? 'GARDEN WARD'
              : 'RESIDENTIAL BOROUGH';
      w.districts.push({ name, ...point(...ward.center), city: z.id, ward: ward.id });
    }
  z.hunt = point(z.x - z.rx - 14, z.y + 19);
  z.mine = point(z.x + z.rx + 12, z.y - 12);
  townWorkRoads(w, z);
  w.warehouses[z.id] = {
    gold: z.kind === 'capital' ? 1400 : 650,
    ration: 45,
    fish: 15,
    log: 40,
    ore: 30,
    hide: 20,
    herb: 20,
    fiber: 45,
    bait: 100,
    arrow: 150,
  };
  z.buildingCount = buildings.length;
}
