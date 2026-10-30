import { detailHelp } from './conversation-ui.js';
import { PROJECTS } from '../gameplay/city-projects.js';
import { donateProject } from '../gameplay/city-projects.js';
import { ITEMS } from '../core/content.js';
const el = (tag, text, cls) => {
  const n = document.createElement(tag);
  n.textContent = text;
  if (cls) n.className = cls;
  return n;
};
export function renderProjects(root, w, city, { notify, changed, refresh }) {
  root.replaceChildren(el('div', 'TOWN PROJECTS · O', 'eyebrow'), el('h1', 'A Shared Cause'));
  const feedback = el('p', '', 'panel-feedback');
  root.append(feedback);
  const z = w.cities.find((z) => z.id === city);
  if (!z || w.dungeonSpec) {
    root.append(
      el(
        'p',
        'Visit a town and approach its notice board or quartermaster to contribute supplies.',
      ),
    );
    return;
  }
  root.append(el('small', z.name));
  detailHelp(
    root,
    'How to contribute to construction',
    'Donations to the town are not refunded. The carpenter builds only by day and on site. Construction stops if no carpenter remains alive.',
  );
  const builder = w.entities.find((e) => e.hp > 0 && e.projectBuilder && e.faction === city);
  if (!builder) root.append(el('p', 'The carpenter died: nobody can build for now.'));
  for (const [id, def] of Object.entries(PROJECTS)) {
    const state = w.projects?.[city]?.[id];
    if (!state) continue;
    const card = el('details', '', 'compact-choice');
    card.append(
      el(
        'summary',
        def.name +
          ' · ' +
          (state.status === 'completed'
            ? 'Built'
            : state.status === 'building'
              ? 'Under Construction'
              : 'Gather Supplies'),
      ),
      el('p', def.description),
      el(
        'small',
        state.status === 'completed'
          ? 'Built'
          : state.status === 'building'
            ? 'Construction remaining: ' + Math.ceil(state.remaining) + ' sec. of work'
            : Object.entries(def.cost)
                .map(([k, n]) => ITEMS[k].name + ': ' + (state.funds[k] || 0) + '/' + n)
                .join(' · '),
      ),
    );
    if (state.status === 'funding') {
      const b = el('button', 'Contribute missing supplies from your bag', 'action');
      b.onclick = () => {
        const r = donateProject(w, city, id);
        feedback.textContent = r.message;
        notify(r.message);
        if (r.ok) {
          changed();
          refresh();
        }
      };
      card.append(b);
    }
    root.append(card);
  }
}
