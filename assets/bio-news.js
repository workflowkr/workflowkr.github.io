(() => {
  const deck = document.getElementById('bioNewsDeck');
  const cards = [...deck.querySelectorAll('[data-news-id]')];
  const next = document.getElementById('bioNewsNext');
  const reset = document.getElementById('bioNewsReset');
  const progress = document.getElementById('bioNewsProgress');
  const empty = document.getElementById('bioNewsEmpty');
  const storageKey = 'workflowkr-dismissed-bio-news';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const dismissed = new Set();
  let activeCard;
  let leaving = false;
  let swipe;

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(saved)) {
      for (const id of saved) dismissed.add(id);
    }
  } catch {}

  function saveDismissed() {
    try { localStorage.setItem(storageKey, JSON.stringify([...dismissed])); } catch {}
  }

  function showNextCard() {
    const remainingCards = cards.filter(card => !dismissed.has(card.dataset.newsId));
    activeCard = remainingCards[0];
    for (const card of cards) card.hidden = card !== activeCard;
    const isEmpty = !activeCard;
    deck.hidden = isEmpty;
    empty.hidden = !isEmpty;
    next.hidden = isEmpty;
    reset.hidden = !isEmpty;
    progress.textContent = activeCard
      ? (cards.length - remainingCards.length + 1) + ' / ' + cards.length
      : '';
  }

  function dismissCard() {
    if (!activeCard || leaving) return;
    leaving = true;
    const card = activeCard;
    card.classList.add('is-leaving');

    const finish = () => {
      const focusWasOnNext = document.activeElement === next;
      dismissed.add(card.dataset.newsId);
      saveDismissed();
      showNextCard();
      card.classList.remove('is-leaving');
      leaving = false;
      if (!activeCard && focusWasOnNext) reset.focus();
    };
    if (reduceMotion.matches) finish();
    else window.setTimeout(finish, 180);
  }

  function finishSwipe(event) {
    if (!swipe || swipe.pointerId !== event.pointerId) return;
    const { card, x, dragging } = swipe;
    swipe = null;
    card.classList.remove('is-dragging');
    card.style.removeProperty('--news-offset');
    if (event.type === 'pointerup' && dragging && event.clientX - x <= -Math.min(100, card.offsetWidth / 4)) {
      dismissCard();
    }
  }

  deck.addEventListener('pointerdown', event => {
    if (!activeCard || leaving || swipe || !event.isPrimary || event.button !== 0 ||
        !activeCard.contains(event.target) || event.target.closest('a, button')) return;
    swipe = { card: activeCard, pointerId: event.pointerId, x: event.clientX, y: event.clientY, dragging: false };
  });

  deck.addEventListener('pointermove', event => {
    if (!swipe || swipe.pointerId !== event.pointerId) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    if (!swipe.dragging) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
        swipe = null;
        return;
      }
      if (dx > -12 || -dx < Math.abs(dy)) return;
      swipe.dragging = true;
      deck.setPointerCapture(event.pointerId);
      swipe.card.classList.add('is-dragging');
    }
    swipe.card.style.setProperty('--news-offset', Math.min(dx, 0) + 'px');
  });

  deck.addEventListener('pointerup', finishSwipe);
  deck.addEventListener('pointercancel', finishSwipe);
  deck.addEventListener('lostpointercapture', event => {
    if (event.target === deck) finishSwipe(event);
  });
  deck.addEventListener('pointerleave', event => {
    if (!swipe?.dragging) finishSwipe(event);
  });
  next.addEventListener('click', dismissCard);
  reset.addEventListener('click', () => {
    for (const card of cards) dismissed.delete(card.dataset.newsId);
    saveDismissed();
    showNextCard();
    next.focus();
  });
  showNextCard();
})();
