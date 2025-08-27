// Map a simple activity id to its script file
const ACTIVITY_MAP = {
  'ch1-electrification': '/activities/ch1/electrification.js',
  // add more: 'chX-xyz': '/activities/chX/xyz.js'
};

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('activity-root');
  if (!root) return;

  const id = root.getAttribute('data-activity');
  const src = ACTIVITY_MAP[id];
  if (!src) { console.warn('Unknown activity:', id); return; }

  // load the activity file; when it loads, it should call its mount function
  const s = document.createElement('script');
  s.src = src;
  s.defer = true;
  document.body.appendChild(s);

  // The activity file must define: window.MOUNT_ACTIVITY[id](root)
  // See electrification.js below.
});
