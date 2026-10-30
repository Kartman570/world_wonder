// Eight projected views share real proportions; shadows and gait are baked once.
import { ANIMALS } from '../core/content.js';
const cache = new Map();
const profiles = {
  deer: {
    body: [20, 8, 10],
    height: 29,
    head: 8,
    neck: 15,
    coat: '#ac7e4d',
    shade: '#6c5036',
    light: '#d4b180',
    legs: 26,
  },
  elk: {
    body: [25, 11, 14],
    height: 35,
    head: 11,
    neck: 17,
    coat: '#786145',
    shade: '#493d2c',
    light: '#a88b61',
    legs: 32,
  },
  goat: {
    body: [17, 8, 10],
    height: 22,
    head: 7,
    neck: 8,
    coat: '#c5bfa4',
    shade: '#7e806d',
    light: '#e1d9bd',
    legs: 20,
  },
  wolf: {
    body: [21, 8, 10],
    height: 19,
    head: 9,
    neck: 4,
    coat: '#939b92',
    shade: '#515f59',
    light: '#c4c7b5',
    legs: 17,
  },
  fox: {
    body: [16, 6, 8],
    height: 15,
    head: 7,
    neck: 3,
    coat: '#c67b3b',
    shade: '#844b2c',
    light: '#eee0b8',
    legs: 13,
  },
  bear: {
    body: [29, 15, 19],
    height: 23,
    head: 13,
    neck: 1,
    coat: '#77563b',
    shade: '#45392d',
    light: '#a08358',
    legs: 16,
  },
  boar: {
    body: [24, 12, 15],
    height: 18,
    head: 11,
    neck: 0,
    coat: '#77614b',
    shade: '#433c31',
    light: '#a18b66',
    legs: 12,
  },
  lynx: {
    body: [18, 9, 10],
    height: 18,
    head: 9,
    neck: 2,
    coat: '#baa276',
    shade: '#75644c',
    light: '#e3d3aa',
    legs: 17,
  },
  badger: {
    body: [17, 9, 9],
    height: 10,
    head: 8,
    neck: 0,
    coat: '#858b80',
    shade: '#46514b',
    light: '#e5e3cc',
    legs: 7,
  },
  hare: {
    body: [12, 7, 9],
    height: 10,
    head: 6,
    neck: 3,
    coat: '#b6ad90',
    shade: '#79775e',
    light: '#e1d7b7',
    legs: 7,
  },
};
export function animalSprite(role, direction = 0, frame = 0) {
  direction = ((Math.round(direction) % 8) + 8) % 8;
  frame = ((Math.floor(frame) % 6) + 6) % 6;
  const key = role + ':' + direction + ':' + frame;
  if (cache.has(key)) return cache.get(key);
  const image = document.createElement('canvas');
  image.width = 192;
  image.height = 160;
  const c = image.getContext('2d');
  c.translate(96, 126);
  const angle = (direction * Math.PI) / 4,
    co = Math.cos(angle),
    si = Math.sin(angle),
    phase = (frame * Math.PI) / 3;
  const project = (u, v, z = 0) => [u * co - v * si, (u * si + v * co) * 0.55 - z];
  const path = (pts, color, width = 0) => {
    c.beginPath();
    pts.map((p) => project(...p)).forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    if (width) {
      c.strokeStyle = color;
      c.lineWidth = width;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.stroke();
    } else {
      c.closePath();
      c.fillStyle = color;
      c.fill();
    }
  };
  const blob = (u, v, z, rx, ry, rz, color) => {
    const [x, y] = project(u, v, z),
      xx = rx * rx * co * co + ry * ry * si * si,
      yy = (rx * rx * si * si + ry * ry * co * co) * 0.3025 + rz * rz,
      xy = (rx * rx - ry * ry) * co * si * 0.55,
      root = Math.sqrt((xx - yy) ** 2 + 4 * xy * xy),
      rot = 0.5 * Math.atan2(2 * xy, xx - yy);
    c.beginPath();
    c.ellipse(
      x,
      y,
      Math.sqrt(Math.max(0.1, (xx + yy + root) / 2)),
      Math.sqrt(Math.max(0.1, (xx + yy - root) / 2)),
      rot,
      0,
      Math.PI * 2,
    );
    c.fillStyle = color;
    c.fill();
  };
  if (role === 'caveSpider') {
    for (const side of [-1, 1])
      for (let j = 0; j < 4; j++) {
        const u = -12 + j * 8,
          bend = Math.sin(phase + j) * 3;
        path(
          [
            [u, side * 4, 9],
            [u - 7, side * (20 + (j % 2) * 5), 17 + bend],
            [u - 2, side * (31 + (j % 2) * 5), 1],
          ],
          '#453b34',
          4,
        );
        path(
          [
            [u, side * 4, 10],
            [u - 7, side * (20 + (j % 2) * 5), 18 + bend],
            [u - 2, side * (31 + (j % 2) * 5), 2],
          ],
          '#a39270',
          1.7,
        );
      }
    blob(-7, 0, 14, 17, 11, 10, '#51483c');
    blob(12, 0, 14, 10, 9, 8, '#857253');
    for (const v of [-4, 4]) blob(20, v, 18, 2, 1, 2, '#e6b26f');
    path(
      [
        [20, -4, 9],
        [26, -6, 5],
        [24, -2, 4],
      ],
      '#c2ad80',
      2,
    );
    path(
      [
        [20, 4, 9],
        [26, 6, 5],
        [24, 2, 4],
      ],
      '#c2ad80',
      2,
    );
  } else if (role === 'caveBat') {
    const flap = Math.sin(phase) * 13;
    for (const side of [-1, 1]) {
      const pts = [
        [0, side * 3, 25],
        [0, side * 21, 48 + flap],
        [-10, side * 43, 36 + flap],
        [-2, side * 28, 23],
        [-11, side * 20, 22],
        [-5, side * 10, 19],
        [-12, side * 4, 16],
      ];
      path(pts, side < 0 ? '#71677c' : '#96859d');
      path(
        [
          [0, side * 3, 25],
          [0, side * 21, 48 + flap],
          [-10, side * 43, 36 + flap],
        ],
        '#b2a2b6',
        1.4,
      );
      path(
        [
          [0, side * 21, 48 + flap],
          [-2, side * 28, 23],
        ],
        '#564e62',
        1,
      );
    }
    blob(0, 0, 24, 6, 7, 13, '#665967');
    blob(8, 0, 31, 6, 6, 6, '#b4a69b');
    for (const v of [-4, 4])
      path(
        [
          [7, v, 34],
          [9, v * 1.7, 45],
          [12, v, 34],
        ],
        '#b2a58e',
      );
  } else {
    const p = profiles[role];
    if (!p) return image;
    blob(0, 0, 0, p.body[0] + 4, p.body[1] + 4, 1, '#10291d55');
    const [length, width, height] = p.body,
      bob = Math.sin(phase * 2) * (role === 'hare' ? 2 : 1),
      z = p.height + bob,
      hx = length * 0.88 + p.head * 0.55,
      hz = z + p.neck;
    const leg = (u, v, index) => {
      const gait = Math.sin(phase + (index % 2 ? Math.PI : 0)) * 4,
        thick = ['bear', 'boar'].includes(role) ? 6 : role === 'hare' ? 4 : 3;
      path(
        [
          [u, v, z - 2],
          [u + gait * 0.35, v, p.legs * 0.45],
          [u + gait, v, 2],
        ],
        '#29372b',
        thick + 1,
      );
      path(
        [
          [u, v, z - 2],
          [u + gait * 0.35, v, p.legs * 0.45],
          [u + gait, v, 2],
        ],
        v * co > 0 ? p.shade : '#444a3c',
        thick,
      );
      blob(
        u + gait + 1,
        v,
        2,
        thick,
        thick * 0.6,
        2,
        ['deer', 'elk', 'goat'].includes(role) ? '#3b3d31' : p.shade,
      );
    };
    const positions = [
      [-length * 0.6, -width * 0.65],
      [length * 0.55, -width * 0.65],
      [-length * 0.6, width * 0.65],
      [length * 0.55, width * 0.65],
    ];
    positions.sort((a, b) => project(...a)[1] - project(...b)[1]);
    positions.forEach(([u, v], i) => leg(u, v, i));
    // Tails are silhouettes, rather than the same small circle on every species.
    if (['fox', 'wolf'].includes(role)) {
      const tip = -length - (role === 'fox' ? 24 : 19),
        lift = role === 'fox' ? 10 : 5;
      path(
        [
          [-length * 0.65, -4, z],
          [-length - 12, -7, z + lift],
          [tip, -2, z - 4],
          [tip + 7, 4, z - 8],
          [-length + 2, 5, z - 5],
        ],
        p.coat,
      );
      if (role === 'fox')
        path(
          [
            [tip, -2, z - 4],
            [tip + 7, 4, z - 8],
            [tip + 12, 2, z - 4],
            [tip + 5, -4, z + 2],
          ],
          p.light,
        );
    } else if (role === 'hare') blob(-length - 1, 0, z + 1, 5, 5, 5, '#eee5cf');
    else if (role === 'lynx')
      path(
        [
          [-length, 0, z],
          [-length - 8, 0, z - 2],
          [-length - 10, 0, z + 3],
        ],
        '#4b4639',
        5,
      );
    else if (['deer', 'elk', 'goat'].includes(role))
      path(
        [
          [-length, 0, z + 2],
          [-length - 7, 0, z - 4],
        ],
        p.light,
        4,
      );
    blob(0, 0, z, length, width, height, p.shade);
    blob(-1, -1, z + height * 0.2, length * 0.95, width * 0.92, height * 0.83, p.coat);
    blob(
      -length * 0.15,
      -width * 0.15,
      z + height * 0.7,
      length * 0.65,
      width * 0.55,
      height * 0.25,
      p.light + '80',
    );
    if (['wolf', 'fox', 'lynx'].includes(role))
      blob(length * 0.3, 0, z + 1, length * 0.6, width * 0.78, height * 0.72, p.coat);
    if (['deer', 'elk', 'goat'].includes(role)) {
      path(
        [
          [length * 0.45, -width * 0.6, z],
          [hx - 3, -4, hz + 4],
          [hx + 4, 4, hz],
          [length * 0.85, width * 0.7, z - height * 0.5],
        ],
        p.coat,
      );
      path(
        [
          [length * 0.75, 0, z],
          [hx + 1, 0, hz - 4],
        ],
        p.light,
        5,
      );
    }
    if (role === 'bear') {
      blob(length * 0.45, 0, z + 8, 15, 13, 18, p.coat);
      blob(hx, 0, hz + 4, 13, 12, 13, p.shade);
    }
    blob(hx, 0, hz, p.head, p.head * 0.8, p.head * 0.8, p.coat);
    const muzzle = ['wolf', 'fox', 'boar', 'elk', 'bear'].includes(role)
      ? p.head * 0.95
      : p.head * 0.45;
    blob(
      hx + p.head * 0.7,
      0,
      hz - 3,
      muzzle,
      p.head * 0.55,
      p.head * 0.4,
      ['bear', 'wolf', 'fox', 'badger'].includes(role) ? p.light : p.coat,
    );
    blob(
      hx + p.head * 0.7 + muzzle * 0.8,
      0,
      hz - 2,
      2.3,
      p.head * 0.38,
      2.3,
      role === 'boar' ? '#c29b83' : '#323c34',
    );
    for (const side of [-1, 1]) {
      const v = side * p.head * 0.6;
      if (role === 'hare') {
        blob(hx - 1, v, hz + 12, 2.4, 2.2, 13, p.shade);
        blob(hx, v, hz + 13, 1.5, 1.4, 10, p.light);
      } else if (role === 'bear') blob(hx - 5, v, hz + 11, 4, 3, 4, p.shade);
      else if (['deer', 'elk', 'goat'].includes(role))
        path(
          [
            [hx - 4, v, hz + 3],
            [hx - 11, side * (p.head + 6), hz + 9],
            [hx + 1, v, hz + 7],
          ],
          p.coat,
        );
      else
        path(
          [
            [hx - 5, v, hz + 3],
            [hx - 4, side * (p.head * 0.8), hz + p.head + 5],
            [hx + 2, v, hz + 5],
          ],
          p.shade,
        );
      if (role === 'lynx')
        path(
          [
            [hx - 4, side * p.head * 0.8, hz + p.head + 4],
            [hx - 5, side * p.head * 0.85, hz + p.head + 11],
          ],
          '#3b3b32',
          2,
        );
      if (side * co >= -0.2)
        blob(hx + p.head * 0.35, side * p.head * 0.73, hz + 2, 1.2, 1, 1.3, '#172a24');
      if (role === 'boar')
        path(
          [
            [hx + p.head * 0.6, side * 6, hz - 6],
            [hx + p.head + 4, side * 7, hz - 2],
            [hx + p.head + 3, side * 7, hz + 2],
          ],
          '#e5d5aa',
          2.5,
        );
      if (['deer', 'elk'].includes(role)) {
        const base = [hx - 4, side * 4, hz + 6],
          end = [hx - 13, side * (role === 'elk' ? 23 : 17), hz + (role === 'elk' ? 31 : 34)];
        path([base, [hx - 7, side * 10, hz + 19], end], '#d9c497', role === 'elk' ? 4 : 2.3);
        if (role === 'elk')
          path(
            [
              [hx - 8, side * 10, hz + 19],
              [hx - 20, side * 24, hz + 24],
              [hx - 13, side * 26, hz + 33],
              [hx - 5, side * 14, hz + 28],
            ],
            '#b6a27c',
          );
        for (let j = 0; j < 3; j++)
          path(
            [
              [hx - 7 - j * 3, side * (10 + j * 3), hz + 18 + j * 6],
              [hx + 1 - j * 4, side * (14 + j * 3), hz + 27 + j * 6],
            ],
            '#e4cf9b',
            1.8,
          );
      }
      if (role === 'goat')
        path(
          [
            [hx - 3, side * 4, hz + 6],
            [hx - 10, side * 6, hz + 22],
            [hx - 15, side * 7, hz + 23],
            [hx - 18, side * 7, hz + 18],
          ],
          '#655d47',
          3,
        );
    }
    if (role === 'goat')
      path(
        [
          [hx + 2, 0, hz - 5],
          [hx - 1, 0, hz - 15],
          [hx - 4, 0, hz - 7],
        ],
        p.light,
      );
    if (role === 'boar')
      for (let j = 0; j < 8; j++)
        path(
          [
            [-length + 6 + j * 5, -1, z + height * 0.7],
            [-length + 4 + j * 5, 0, z + height + 5],
          ],
          '#3d3d30',
          2,
        );
    if (role === 'badger')
      for (const side of [-1, 1])
        path(
          [
            [hx - 5, side * 3, hz + 5],
            [hx + 6, side * 3, hz + 1],
            [hx + 9, side * 2, hz - 2],
          ],
          '#202f2c',
          3,
        );
    if (role === 'lynx')
      for (let j = 0; j < 9; j++)
        blob(
          -length * 0.7 + (j % 5) * 6,
          (j % 2 ? 1 : -1) * width * 0.65,
          z + 3 + (j % 3),
          1.6,
          1.2,
          1.5,
          '#6b573f',
        );
  }
  cache.set(key, image);
  return image;
}
export function drawAnimal(c, entity, pose = entity) {
  const moving = pose.walk || 0,
    frame = Math.floor(((moving * 2.5) / (Math.PI * 2)) * 6);
  c.drawImage(animalSprite(entity.role, pose.dir ?? entity.dir, frame), pose.x - 96, pose.y - 126);
}
