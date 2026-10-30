import { CHAPTERS, campaignLesson, campaignTarget } from '../gameplay/campaign.js';
const el = (tag, text, cls) => {
  const n = document.createElement(tag);
  n.textContent = text;
  if (cls) n.className = cls;
  return n;
};
export function renderCampaign(root, w, { select, close }) {
  root.replaceChildren(el('div', 'STORY CAMPAIGN', 'eyebrow'), el('h1', 'Bell and Dawn'));
  const c = w.campaign;
  if (!c) {
    root.append(
      el(
        'p',
        'Training is disabled. Use the separate menu button to start a fresh campaign world.',
      ),
    );
    return;
  }
  if (c.status === 'completed') {
    root.append(
      el('h3', 'Light Returns to the Cathedral'),
      el(
        'p',
        '“You brought neither a weapon nor power, but hope, Sophos says. The world is now larger than my task. Choose your own road.” Campaign complete. Your belongings, reputation, companions, and world state are preserved; free play continues.',
      ),
    );
  } else {
    const lesson = campaignLesson(w);
    root.append(
      el('small', 'Chapter ' + (c.stage + 1) + ' / ' + CHAPTERS.length),
      el('h3', lesson.title),
      el('p', 'Sophos: “' + lesson.text + '”', 'reply'),
      el('p', lesson.task),
    );
    if (lesson.id === 'welcome')
      root.append(
        el(
          'p',
          'WASD / arrow keys to walk, Shift — to run. The north hall is directly above the courtyard. Enter its south door and approach Sophos: E — conversation.',
        ),
      );
    const target = campaignTarget(w);
    if (target) {
      const b = el('button', 'Show the Next Objective', 'action');
      b.onclick = () => {
        select(target);
        close();
      };
      root.append(b);
    }
    if (lesson.id === 'orientation')
      root.append(
        el(
          'p',
          'Progress: ' +
            Math.floor(c.walk) +
            '/150 · run: ' +
            Math.floor(c.run) +
            '/60 · windows: ' +
            ['map', 'inventory', 'journal']
              .map(
                (k) => ({ map: 'M', inventory: 'I', journal: 'J' })[k] + (c.facts[k] ? ' ✓' : ' —'),
              )
              .join(' · '),
        ),
      );
  }
  root.append(el('h3', 'Road Traveled'));
  for (const h of c.history) {
    const chapter = CHAPTERS.find((s) => s.id === h.id),
      details = el('details'),
      summary = el('summary', '✓ ' + h.title);
    details.append(summary, el('p', chapter?.text || ''));
    root.append(details);
  }
  root.append(
    el(
      'p',
      'This quest does not lock away the world. Leave the road, take other jobs, and explore any mechanic. Returning any relic to Sophos completes the campaign.',
    ),
  );
}
