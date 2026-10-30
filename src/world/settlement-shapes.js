import { pointInPolygon, segmentDistance } from './map-geometry.js';
export const STYLES = [
  {
    name: 'Ochre Stone',
    wall: '#b4a17b',
    house: '#c2ad87',
    roof: '#8a594a',
    cloth: '#b7865d',
    flag: '#c18b4c',
    mark: 'sun',
  },
  {
    name: 'Blue Slate',
    wall: '#909eaa',
    house: '#b5b8ae',
    roof: '#4d687c',
    cloth: '#718fa3',
    flag: '#5e8eae',
    mark: 'star',
  },
  {
    name: 'Green Shingles',
    wall: '#a7ab91',
    house: '#c4c1a1',
    roof: '#57725a',
    cloth: '#7c9870',
    flag: '#82a35c',
    mark: 'leaf',
  },
  {
    name: 'Red Brick',
    wall: '#a47c68',
    house: '#c5a38c',
    roof: '#674c48',
    cloth: '#ad756d',
    flag: '#b96754',
    mark: 'tower',
  },
  {
    name: 'Pale Limestone',
    wall: '#cbc7b2',
    house: '#dbceb1',
    roof: '#777185',
    cloth: '#9b8ca8',
    flag: '#9a7fa5',
    mark: 'moon',
  },
  {
    name: 'Dark Timber',
    wall: '#8b8e7b',
    house: '#a99578',
    roof: '#5b5140',
    cloth: '#9e9b74',
    flag: '#b5a361',
    mark: 'stag',
  },
];
export function settlementInside(z, x, y, pad = 0) {
  if (z.outline) {
    if (!pointInPolygon(z.outline, x, y)) return false;
    if (!pad) return true;
    return z.outline.every(
      (p, i) => segmentDistance(x, y, p, z.outline[(i + 1) % z.outline.length]) >= pad,
    );
  }
  const u = (x - z.x) / (z.rx - pad),
    v = (y - z.y) / (z.ry - pad);
  if (Math.abs(u) >= 1 || Math.abs(v) >= 1) return false;
  switch (z.pattern) {
    case 'oval':
      return u * u + v * v < 1;
    case 'organic': {
      const a = Math.atan2(v, u),
        radius =
          0.88 + 0.07 * Math.sin(a * 3 + z.shapePhase) + 0.04 * Math.cos(a * 5 - z.shapePhase);
      return u * u + v * v < radius * radius;
    }
    case 'twin':
      return (
        ((u + 0.31) / 0.69) ** 2 + (v / 0.91) ** 2 < 1 ||
        ((u - 0.38) / 0.61) ** 2 + (v / 0.73) ** 2 < 1
      );
    case 'terraces':
      return Math.abs(v) < 0.89 && Math.abs(u) < (v < -0.3 ? 0.68 : v > 0.38 ? 0.78 : 1);
    case 'spindle':
      return Math.abs(u) ** 1.35 + Math.abs(v) ** 1.8 < 1;
    case 'fan':
      return u * u + v * v < 1 && !(u < -0.35 && v < -0.25);
    default:
      return Math.abs(u) ** 4 + Math.abs(v) ** 4 < 1;
  }
}
export function settlementBoundary(z) {
  const out = [];
  for (let y = z.y - z.ry; y <= z.y + z.ry; y++)
    for (let x = z.x - z.rx; x <= z.x + z.rx; x++)
      if (
        settlementInside(z, x, y) &&
        [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([dx, dy]) => !settlementInside(z, x + dx, y + dy))
      )
        out.push({ x, y });
  return out;
}
export function chooseSettlementStyles(w, r) {
  const types = ['capital', 'town', 'village'].sort(() => r() - 0.5),
    patterns = ['oval', 'organic', 'twin', 'terraces', 'spindle', 'fan', 'rounded'],
    palette = [...STYLES].sort(() => r() - 0.5);
  for (const [i, z] of w.cities.entries()) {
    z.kind = types[i];
    z.archetype = z.kind;
    z.isVillage = z.kind === 'village';
    z.fortified = !z.isVillage;
    z.pattern = patterns.splice(Math.floor(r() * patterns.length), 1)[0];
    z.shapePhase = r() * 6.28;
    z.style = { ...palette[i] };
    z.rx =
      z.kind === 'capital'
        ? 68 + Math.floor(r() * 5)
        : z.kind === 'town'
          ? 40 + Math.floor(r() * 6)
          : 30 + Math.floor(r() * 5);
    z.ry =
      z.kind === 'capital'
        ? 56 + Math.floor(r() * 5)
        : z.kind === 'town'
          ? 35 + Math.floor(r() * 5)
          : 27 + Math.floor(r() * 4);
    if (r() < 0.4) {
      z.rx += z.kind === 'capital' ? 7 : 5;
      z.ry -= 4;
    }
    if (z.kind === 'town') {
      z.rx += 3;
      z.ry += 3;
    }
    z.r = Math.max(z.rx, z.ry) + 2;
    z.streetPattern = ['rings', 'lanes', 'winding', 'diagonal'][Math.floor(r() * 4)];
    z.traderRoles =
      z.kind === 'capital'
        ? [
            'smith',
            'cook',
            'herbalist',
            'tailor',
            'farmer',
            'armorer',
            'bowyer',
            'leatherworker',
            'provisioner',
          ]
        : z.kind === 'town'
          ? [
              r() < 0.5 ? 'farmer' : 'smith',
              ...['cook', 'herbalist', 'tailor']
                .sort(() => r() - 0.5)
                .slice(0, 1 + Math.floor(r() * 2)),
            ]
          : [['smith', 'cook', 'herbalist', 'tailor', 'farmer'][Math.floor(r() * 5)]];
  }
  const area = (z) => {
    let n = 0;
    for (let y = -z.ry; y <= z.ry; y++)
      for (let x = -z.rx; x <= z.rx; x++) n += settlementInside(z, z.x + x, z.y + y);
    return n;
  };
  const capital = w.cities.find((z) => z.kind === 'capital'),
    town = w.cities.find((z) => z.kind === 'town'),
    minimum = Math.max(12000, area(town) * 2.05);
  while (area(capital) < minimum) {
    capital.rx += 2;
    capital.ry++;
  }
  capital.r = Math.max(capital.rx, capital.ry) + 2;
}
