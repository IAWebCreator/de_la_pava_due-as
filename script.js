/**
 * Family Videos Archive - De La Pava Marulanda
 * Interactive JavaScript for video cards, filtering, and accessibility
 */

(function () {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================

    const MAX_VISIBLE_CHIPS = 4; // Number of chips to show before collapsing

    // ============================================
    // DOM ELEMENTS
    // ============================================

    const participantFilter = document.getElementById('participant-filter');
    const videoCards = document.querySelectorAll('.video-card');
    const emptyState = document.querySelector('.empty-state');
    const resetFilterBtn = document.getElementById('reset-filter');

    // ============================================
    // PARTICIPANTS DATA
    // ============================================

    // Collect all unique participants from video cards
    function collectParticipants() {
        const participantsSet = new Set();

        videoCards.forEach(card => {
            const participants = card.dataset.participants.split(',');
            participants.forEach(p => participantsSet.add(p.trim()));
        });

        // Sort alphabetically
        return Array.from(participantsSet).sort((a, b) =>
            a.localeCompare(b, 'es', { sensitivity: 'base' })
        );
    }

    // Populate filter dropdown with participants
    function populateFilterDropdown() {
        const participants = collectParticipants();

        participants.forEach(participant => {
            const option = document.createElement('option');
            option.value = participant;
            option.textContent = participant;
            participantFilter.appendChild(option);
        });
    }

    // ============================================
    // CHIP GENERATION
    // ============================================

    // Generate chips for a card
    function generateChips(card) {
        const chipsContainer = card.querySelector('.video-card__chips');
        const participants = card.dataset.participants.split(',').map(p => p.trim());
        const totalCount = participants.length;

        // Clear existing chips
        chipsContainer.innerHTML = '';

        // Create chips
        participants.forEach((participant, index) => {
            const chip = document.createElement('span');
            chip.className = 'chip';
            chip.textContent = participant;

            // Hide chips beyond MAX_VISIBLE_CHIPS
            if (index >= MAX_VISIBLE_CHIPS) {
                chip.classList.add('chip--hidden');
            }

            chipsContainer.appendChild(chip);
        });

        // Add expand button if needed
        if (totalCount > MAX_VISIBLE_CHIPS) {
            const hiddenCount = totalCount - MAX_VISIBLE_CHIPS;

            const expandBtn = document.createElement('button');
            expandBtn.className = 'chip chip--expand';
            expandBtn.type = 'button';
            expandBtn.setAttribute('aria-expanded', 'false');
            expandBtn.innerHTML = `+${hiddenCount} más`;
            expandBtn.title = `Ver ${hiddenCount} participantes más`;

            // Click handler to expand/collapse
            expandBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent video from playing
                toggleChips(card, expandBtn);
            });

            chipsContainer.appendChild(expandBtn);
        }
    }

    // Toggle chip visibility
    function toggleChips(card, expandBtn) {
        const isExpanded = expandBtn.getAttribute('aria-expanded') === 'true';
        const participants = card.dataset.participants.split(',').map(p => p.trim());
        const hiddenCount = participants.length - MAX_VISIBLE_CHIPS;

        // Get all chips that should be toggled (those after MAX_VISIBLE_CHIPS)
        const allChips = card.querySelectorAll('.chip:not(.chip--expand)');
        const toggleableChips = Array.from(allChips).slice(MAX_VISIBLE_CHIPS);

        if (isExpanded) {
            // Collapse - hide the extra chips
            expandBtn.setAttribute('aria-expanded', 'false');
            expandBtn.textContent = `+${hiddenCount} más`;
            expandBtn.title = `Ver ${hiddenCount} participantes más`;

            toggleableChips.forEach(chip => {
                chip.classList.remove('chip--visible');
                chip.classList.add('chip--hidden');
            });
        } else {
            // Expand - show all chips
            expandBtn.setAttribute('aria-expanded', 'true');
            expandBtn.textContent = 'Ver menos';
            expandBtn.title = 'Ocultar participantes';

            toggleableChips.forEach(chip => {
                chip.classList.remove('chip--hidden');
                chip.classList.add('chip--visible');
            });
        }
    }

    // ============================================
    // VIDEO CARD INTERACTIONS
    // ============================================

    // Toggle video card expand/collapse
    function toggleVideoCard(card) {
        const thumbnailBtn = card.querySelector('.video-card__thumbnail');
        const embedContainer = card.querySelector('.video-card__embed');
        const playerContainer = card.querySelector('.video-card__player');
        const isExpanded = thumbnailBtn.getAttribute('aria-expanded') === 'true';

        if (isExpanded) {
            // Collapse
            thumbnailBtn.setAttribute('aria-expanded', 'false');
            embedContainer.hidden = true;
            card.removeAttribute('data-expanded');

            // Remove iframe to stop video playback
            const iframe = playerContainer.querySelector('iframe');
            if (iframe) {
                iframe.remove();
            }
        } else {
            // Collapse all other cards first
            videoCards.forEach(otherCard => {
                if (otherCard !== card) {
                    const otherBtn = otherCard.querySelector('.video-card__thumbnail');
                    const otherEmbed = otherCard.querySelector('.video-card__embed');
                    const otherPlayer = otherCard.querySelector('.video-card__player');

                    if (otherBtn.getAttribute('aria-expanded') === 'true') {
                        otherBtn.setAttribute('aria-expanded', 'false');
                        otherEmbed.hidden = true;
                        otherCard.removeAttribute('data-expanded');
                        const otherIframe = otherPlayer.querySelector('iframe');
                        if (otherIframe) {
                            otherIframe.remove();
                        }
                    }
                }
            });

            // Expand this card
            thumbnailBtn.setAttribute('aria-expanded', 'true');
            embedContainer.hidden = false;
            card.setAttribute('data-expanded', 'true');

            // Load YouTube embed
            loadYouTubeEmbed(card);

            // Scroll card into view smoothly
            setTimeout(() => {
                card.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }

    // Lazy load YouTube embed
    function loadYouTubeEmbed(card) {
        const videoId = card.dataset.videoId;
        const playerContainer = card.querySelector('.video-card__player');
        const videoTitle = card.querySelector('.video-card__title').textContent;

        // Add loading state
        playerContainer.classList.add('video-card__player--loading');

        // Create iframe with youtube-nocookie for better compatibility
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1&enablejsapi=0`;
        iframe.title = videoTitle;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        iframe.loading = 'lazy';

        // Remove loading state when iframe loads
        iframe.addEventListener('load', () => {
            playerContainer.classList.remove('video-card__player--loading');
        });

        playerContainer.appendChild(iframe);
    }

    // ============================================
    // FILTERING
    // ============================================

    // Filter videos by participant
    function filterVideos(selectedParticipant) {
        let visibleCount = 0;

        videoCards.forEach(card => {
            const participants = card.dataset.participants.split(',').map(p => p.trim());
            const chips = card.querySelectorAll('.chip:not(.chip--expand)');

            if (!selectedParticipant || participants.includes(selectedParticipant)) {
                card.hidden = false;
                visibleCount++;

                // Highlight matching chips
                chips.forEach(chip => {
                    if (selectedParticipant && chip.textContent.trim() === selectedParticipant) {
                        chip.classList.add('chip--highlighted');
                    } else {
                        chip.classList.remove('chip--highlighted');
                    }
                });
            } else {
                card.hidden = true;

                // Collapse if hidden while expanded
                const thumbnailBtn = card.querySelector('.video-card__thumbnail');
                if (thumbnailBtn.getAttribute('aria-expanded') === 'true') {
                    toggleVideoCard(card);
                }
            }
        });

        // Show/hide empty state
        if (visibleCount === 0) {
            emptyState.hidden = false;
        } else {
            emptyState.hidden = true;
        }
    }

    // Reset filter
    function resetFilter() {
        participantFilter.value = '';
        filterVideos('');
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================

    // Video card click handlers
    videoCards.forEach(card => {
        const thumbnailBtn = card.querySelector('.video-card__thumbnail');

        thumbnailBtn.addEventListener('click', () => {
            toggleVideoCard(card);
        });

        // Keyboard support
        thumbnailBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleVideoCard(card);
            }
        });
    });

    // Filter dropdown change
    participantFilter.addEventListener('change', (e) => {
        filterVideos(e.target.value);
    });

    // Reset filter button
    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', resetFilter);
    }

    // Escape key to collapse all videos
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            videoCards.forEach(card => {
                const thumbnailBtn = card.querySelector('.video-card__thumbnail');
                if (thumbnailBtn.getAttribute('aria-expanded') === 'true') {
                    toggleVideoCard(card);
                }
            });
        }
    });

    // ============================================
    // INITIALIZATION
    // ============================================

    function init() {
        // Generate chips from data-participants
        videoCards.forEach(card => generateChips(card));

        // Populate filter dropdown
        populateFilterDropdown();
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
