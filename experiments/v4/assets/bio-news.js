(() => {
  const home = document.getElementById('bioNews');
  const deck = document.getElementById('bioNewsCovers');
  const slides = [...deck.querySelectorAll('.news-feature')];
  const previous = document.getElementById('bioNewsCoverPrevious');
  const next = document.getElementById('bioNewsCoverNext');
  const position = document.getElementById('bioNewsCoverPosition');
  const announcement = document.getElementById('bioNewsCoverAnnouncement');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let currentIndex = 0;
  let behind;
  let gesture;
  let settling = false;

  function updatePosition() {
    position.textContent = `${currentIndex + 1} / ${slides.length}`;
    announcement.textContent = `${position.textContent} · ${slides[currentIndex].querySelector('h3').textContent}`;
  }

  function clearBehind() {
    if (!behind) return;
    behind.hidden = true;
    behind.inert = false;
    behind.classList.remove('is-behind');
    behind = undefined;
  }

  function revealBehind(direction) {
    const index = (currentIndex + direction + slides.length) % slides.length;
    const slide = slides[index];
    if (slide === behind) return;
    clearBehind();
    slide.inert = true;
    slide.classList.add('is-behind');
    slide.hidden = false;
    behind = slide;
  }

  function dragTransform(dx, dy) {
    const tilt = reduceMotion.matches ? 0 : Math.max(-13, Math.min(13, dx / deck.clientWidth * 24));
    const verticalOffset = Math.max(-65, Math.min(65, dy * 0.4));
    return `translate3d(${dx}px, ${verticalOffset}px, 0) rotate(${tilt}deg)`;
  }

  async function settle(direction) {
    if (settling || slides.length < 2) return;
    if (direction) revealBehind(direction);
    settling = true;
    const slide = slides[currentIndex];
    const destination = direction ? dragTransform(-direction * deck.clientWidth * 1.35, 90) : 'none';
    if (!reduceMotion.matches) {
      const motion = slide.animate([
        { transform: slide.style.transform || 'none', opacity: 1 },
        { transform: destination, opacity: direction ? 0 : 1 },
      ], { duration: direction ? 260 : 210, easing: 'cubic-bezier(.2,.7,.2,1)' });
      await motion.finished.catch(() => {});
    }
    slide.style.removeProperty('transform');
    if (direction) {
      const wasFocused = slide.contains(document.activeElement);
      slide.hidden = true;
      currentIndex = slides.indexOf(behind);
      behind.inert = false;
      behind.classList.remove('is-behind');
      behind = undefined;
      updatePosition();
      home.scrollIntoView({ block: 'start', behavior: 'instant' });
      if (wasFocused) slides[currentIndex].querySelector('.news-source').focus({ preventScroll: true });
    } else {
      clearBehind();
    }
    settling = false;
  }

  deck.addEventListener('pointerdown', event => {
    if (gesture || settling || slides.length < 2 || !event.isPrimary || event.button !== 0 || event.target.closest('a')) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, start: event.timeStamp, dragging: false };
  });

  deck.addEventListener('pointermove', event => {
    if (event.pointerId !== gesture?.id) return;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (!gesture.dragging) {
      if (Math.abs(dy) >= 10 && Math.abs(dy) > Math.abs(dx)) {
        gesture = undefined;
        return;
      }
      if (Math.abs(dx) < 10 || Math.abs(dx) <= Math.abs(dy)) return;
      gesture.dragging = true;
      deck.setPointerCapture(event.pointerId);
      deck.classList.add('is-dragging');
    }
    revealBehind(dx <= 0 ? 1 : -1);
    slides[currentIndex].style.transform = dragTransform(dx, dy);
  });

  function finishGesture(event) {
    if (event.pointerId !== gesture?.id) return;
    const { x, y, start, dragging } = gesture;
    gesture = undefined;
    if (!dragging) return;
    deck.classList.remove('is-dragging');
    const dx = event.clientX - x;
    const distance = Math.abs(dx);
    const distanceThreshold = Math.min(140, deck.clientWidth * 0.2);
    const quickFlick = distance > 48 && distance / Math.max(1, event.timeStamp - start) > 0.55;
    const isHorizontal = distance > Math.abs(event.clientY - y) * 1.35;
    const commit = event.type === 'pointerup' && isHorizontal && (distance >= distanceThreshold || quickFlick);
    settle(commit ? (dx < 0 ? 1 : -1) : 0);
  }

  deck.addEventListener('pointerup', finishGesture);
  deck.addEventListener('pointercancel', finishGesture);
  deck.addEventListener('lostpointercapture', event => {
    if (event.target === deck) finishGesture(event);
  });
  deck.addEventListener('pointerleave', event => {
    if (gesture?.id === event.pointerId && !gesture.dragging) gesture = undefined;
  });
  deck.addEventListener('dragstart', event => event.preventDefault());

  function turnFromControl(direction) {
    if (!gesture) settle(direction);
  }
  previous.addEventListener('click', () => turnFromControl(-1));
  next.addEventListener('click', () => turnFromControl(1));
  home.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || event.altKey || event.metaKey || event.ctrlKey) return;
    event.preventDefault();
    turnFromControl(event.key === 'ArrowRight' ? 1 : -1);
  });
  updatePosition();

  const header = document.querySelector('body > header');
  const bottomNav = document.querySelector('.mobile-bottom');
  function sizeCoverToViewport() {
    home.style.setProperty('--news-top', `${header.getBoundingClientRect().height}px`);
    home.style.setProperty('--news-bottom', `${bottomNav.getBoundingClientRect().height}px`);
  }
  const chromeObserver = new ResizeObserver(sizeCoverToViewport);
  chromeObserver.observe(header);
  chromeObserver.observe(bottomNav);
  sizeCoverToViewport();
})();
