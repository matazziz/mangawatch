/**
 * UI notation profil (profil public + profil perso + recherche)
 */
import { profileRatingService } from './firebase-service.js?v=6febe24';

function t(key, fallback) {
  return (typeof window.t === 'function' && window.t(key)) || fallback;
}

function formatRatingAverage(avg) {
  if (!avg || avg <= 0) return '—';
  return Number(avg).toFixed(1).replace(/\.0$/, '');
}

function renderRatingSummary(badge, stats) {
  if (!badge) return;
  const avgEl = badge.querySelector('#profile-rating-average');
  const avg = stats && stats.average ? stats.average : 0;
  if (avgEl) avgEl.textContent = formatRatingAverage(avg);
  badge.style.display = 'inline-flex';
}

function updateRateButton(btn, myScore) {
  if (!btn) return;
  if (myScore != null && myScore > 0) {
    btn.classList.add('rated');
    btn.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i><span>' + t('profile.rating.rated', 'Noté') + '</span>';
    btn.setAttribute('aria-label', t('profile.rating.change_rating', 'Modifier votre note ({n}/10)').replace('{n}', String(myScore)));
    btn.title = t('profile.rating.change_rating', 'Modifier votre note ({n}/10)').replace('{n}', String(myScore));
  } else {
    btn.classList.remove('rated');
    btn.innerHTML = '<i class="fas fa-star" aria-hidden="true"></i><span>' + t('profile.rating.rate', 'Noter') + '</span>';
    btn.setAttribute('aria-label', t('profile.rating.rate', 'Noter'));
    btn.title = t('profile.rating.rate', 'Noter');
  }
}

function ensureRatingModal() {
  let overlay = document.getElementById('profile-rating-modal-overlay');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = 'profile-rating-modal-overlay';
  overlay.className = 'profile-rating-modal-overlay';
  overlay.hidden = true;
  overlay.innerHTML =
    '<div class="profile-rating-modal" role="dialog" aria-modal="true" aria-labelledby="profile-rating-modal-title">' +
      '<button type="button" class="profile-rating-modal-close" id="profile-rating-modal-close" aria-label="' + t('profile.close', 'Fermer') + '">' +
        '<i class="fas fa-times" aria-hidden="true"></i>' +
      '</button>' +
      '<div class="profile-rating-modal-header">' +
        '<i class="fas fa-star profile-rating-modal-icon" aria-hidden="true"></i>' +
        '<h3 id="profile-rating-modal-title">' + t('profile.rating.modal_title', 'Noter ce profil') + '</h3>' +
        '<p class="profile-rating-modal-subtitle" id="profile-rating-modal-subtitle">' + t('profile.rating.modal_subtitle', 'Choisissez une note de 1 à 10') + '</p>' +
      '</div>' +
      '<div class="profile-rating-modal-scores" id="profile-rating-modal-scores"></div>' +
    '</div>';

  document.body.appendChild(overlay);

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeRatingModal();
  });
  overlay.querySelector('#profile-rating-modal-close').addEventListener('click', closeRatingModal);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay && !overlay.hidden) closeRatingModal();
  });

  return overlay;
}

function closeRatingModal() {
  const overlay = document.getElementById('profile-rating-modal-overlay');
  if (overlay) overlay.hidden = true;
  document.body.classList.remove('profile-rating-modal-open');
}

function openRatingModal(options) {
  const overlay = ensureRatingModal();
  const scoresWrap = overlay.querySelector('#profile-rating-modal-scores');
  const titleEl = overlay.querySelector('#profile-rating-modal-title');
  const subtitleEl = overlay.querySelector('#profile-rating-modal-subtitle');
  const isEdit = options.myScore != null && options.myScore > 0;

  if (titleEl) {
    titleEl.textContent = isEdit
      ? t('profile.rating.modal_edit_title', 'Modifier votre note')
      : t('profile.rating.modal_title', 'Noter ce profil');
  }
  if (subtitleEl) {
    subtitleEl.textContent = isEdit
      ? t('profile.rating.modal_edit_subtitle', 'Choisissez une nouvelle note de 1 à 10')
      : t('profile.rating.modal_subtitle', 'Choisissez une note de 1 à 10');
  }

  scoresWrap.innerHTML = '';
  for (let i = 1; i <= 10; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'profile-rating-modal-score' + (options.myScore === i ? ' selected' : '');
    btn.textContent = String(i);
    btn.setAttribute('aria-label', t('profile.rating.rate_n', 'Noter {n}/10').replace('{n}', String(i)));
    btn.addEventListener('click', function () {
      options.onPick(i);
    });
    scoresWrap.appendChild(btn);
  }

  overlay.hidden = false;
  document.body.classList.add('profile-rating-modal-open');
  const focusBtn = scoresWrap.querySelector('.profile-rating-modal-score.selected') ||
    scoresWrap.querySelector('.profile-rating-modal-score');
  if (focusBtn) focusBtn.focus();
}

export async function initProfileRatingUI(options) {
  const profileEmail = (options && options.profileEmail) || '';
  const allowVote = !!(options && options.allowVote);
  const bannerBadge = document.getElementById('profile-rating-banner-badge');
  const voteSlot = document.getElementById('profile-rating-vote-slot');
  const subbanner = document.getElementById('profile-subbanner');

  if (!bannerBadge || !profileEmail) return;

  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
  const voterEmail = currentUser && currentUser.email ? String(currentUser.email).toLowerCase() : '';
  const isSelf = voterEmail && voterEmail === String(profileEmail).toLowerCase();

  let stats = { average: 0, count: 0 };
  let myScore = null;

  try {
    stats = await profileRatingService.getStats(profileEmail);
    if (allowVote && voterEmail && !isSelf) {
      myScore = await profileRatingService.getMyVote(profileEmail, voterEmail);
    }
  } catch (e) {
    console.warn('[ProfileRatingUI]', e);
  }

  renderRatingSummary(bannerBadge, stats);

  let rateBtn = document.getElementById('profile-rating-open-btn');
  if (allowVote && voterEmail && !isSelf) {
    const parent = voteSlot || subbanner;
    if (!rateBtn && parent) {
      rateBtn = document.createElement('button');
      rateBtn.type = 'button';
      rateBtn.id = 'profile-rating-open-btn';
      rateBtn.className = 'profile-rating-open-btn';
      if (voteSlot) voteSlot.appendChild(rateBtn);
      else parent.appendChild(rateBtn);
    }
    if (voteSlot) voteSlot.style.display = 'inline-flex';
    if (rateBtn) {
      rateBtn.style.display = 'inline-flex';
      updateRateButton(rateBtn, myScore);
      rateBtn.onclick = function () {
        openRatingModal({
          myScore: myScore,
          onPick: async function (score) {
            const modalScores = document.querySelectorAll('.profile-rating-modal-score');
            modalScores.forEach(function (b) { b.disabled = true; });
            try {
              const result = await profileRatingService.setRating(profileEmail, voterEmail, score);
              myScore = result.myScore;
              renderRatingSummary(bannerBadge, result);
              updateRateButton(rateBtn, myScore);
              closeRatingModal();
            } catch (err) {
              console.error('[ProfileRatingUI] setRating:', err);
              alert(t('profile.rating.error', 'Impossible d\'enregistrer votre note.'));
              modalScores.forEach(function (b) { b.disabled = false; });
            }
          }
        });
      };
    }
  } else {
    if (rateBtn) rateBtn.style.display = 'none';
    if (voteSlot) voteSlot.style.display = 'none';
  }

  if (subbanner && typeof window.updateProfileSubbannerVisibility === 'function') {
    window.updateProfileSubbannerVisibility();
  } else if (subbanner) {
    subbanner.classList.add('visible');
  }
}

export function ratingBadgeHtml(stats) {
  const avg = stats && stats.average ? stats.average : 0;
  if (!avg || avg <= 0) return '';
  const text = formatRatingAverage(avg);
  return '<span class="profile-rating-badge-search" title="' + text + '/10"><i class="fas fa-star" aria-hidden="true"></i>' + text + '</span>';
}

export async function fetchProfileRatingsForSearch(emails) {
  try {
    return await profileRatingService.getStatsBulk(emails);
  } catch (e) {
    return {};
  }
}

export function requestProfileRatingInit(options) {
  const opts = options || {};
  function run() {
    if (typeof window.initProfileRatingUI === 'function') {
      window.initProfileRatingUI(opts);
      return true;
    }
    return false;
  }
  if (run()) return;
  let attempts = 0;
  const timer = setInterval(function () {
    attempts += 1;
    if (run() || attempts >= 40) clearInterval(timer);
  }, 100);
  window.addEventListener('profileRatingUIReady', function onReady() {
    window.removeEventListener('profileRatingUIReady', onReady);
    run();
  }, { once: true });
}

if (typeof window !== 'undefined') {
  window.initProfileRatingUI = initProfileRatingUI;
  window.ratingBadgeHtml = ratingBadgeHtml;
  window.fetchProfileRatingsForSearch = fetchProfileRatingsForSearch;
  window.requestProfileRatingInit = requestProfileRatingInit;
  window.dispatchEvent(new CustomEvent('profileRatingUIReady'));
}
