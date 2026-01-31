document.addEventListener('DOMContentLoaded', () => {
    const DEV_MODE = false; // set true untuk dev

    // --- Elemen DOM ---
    const startOverlay = document.getElementById('start-overlay');
    const startInteractiveArea = document.getElementById('start-interactive-area');
    const splashScreen = document.getElementById('splash-screen');
    const splashTextElement = document.getElementById('splash-text');
    const splashLogo = document.querySelector('.splash-logo');
    const bgWave = document.querySelector('#main-content .bg-wave');
    const bgOrnament = document.querySelector('#main-content .bg-ornament');
    const centerContent = document.querySelector('.center-start');
    const aboutContent = document.querySelector('.about');
    const aboutScreen = document.getElementById('about-screen');
    const aboutBackButton = document.getElementById('about-back-button');
    const topRightLogo = document.getElementById('top-right-logo');
    const mainContent = document.getElementById('main-content');
    const levelSelectScreen = document.getElementById('level-select-screen');
    const startButton = document.getElementById('start-button');
    const backToMainButton = document.getElementById('back-to-main-button');
    const backgroundMusic = new Audio('./assets/musik-latar.mp3');

    const demoButton = document.getElementById('demo-button');
    const modelButton = document.getElementById('model-button');
    const modelModal = document.getElementById('model-modal');
    const modelCancel = document.getElementById('model-cancel');
    const modelContinue = document.getElementById('model-continue');
    const modelCancelMobile = document.getElementById('model-cancel-mobile');
    const modelContinueMobile = document.getElementById('model-continue-mobile');
    const confirmModal = document.getElementById('confirm-modal');
    const confirmOk = document.getElementById('confirm-ok');
    const confirmCancel = document.getElementById('confirm-cancel');
    const confirmSelected = document.getElementById('confirm-selected');

    const modelImg = document.getElementById('model-img');
    const modelName = document.getElementById('model-name');
    const modelRole = document.getElementById('model-role');
    const modelCharacteristics = document.getElementById('model-characteristics');
    const modelHobbies = document.getElementById('model-hobbies');
    const modelQuote = document.getElementById('model-quote');
    const prevBtn = modelModal ? modelModal.querySelector('.carousel-nav.prev') : null;
    const nextBtn = modelModal ? modelModal.querySelector('.carousel-nav.next') : null;
    const prevBtnMobile = modelModal ? modelModal.querySelector('.mobile-actions .carousel-nav.prev') : null;
    const nextBtnMobile = modelModal ? modelModal.querySelector('.mobile-actions .carousel-nav.next') : null;

    const modelLabelMap = { shizuku: 'Chika', hiyori: 'Hana', chitose: 'Akira', haru: 'Rin', natori: 'Tatsuya' };
    const modelKeyByName = { Chika: 'shizuku', Hana: 'hiyori', Akira: 'chitose', Rin: 'haru', Tatsuya: 'natori' };
    let selectedModel = localStorage.getItem('model') || 'Chika';
    let characters = [];
    let currentIndex = 0;

    // --- Fungsi Splash ---
    const textToType = "NihonGo!";
    let charIndex = 0;

    function startTypingAnimation() {
        if (!splashTextElement) return;
        splashTextElement.style.animation = 'blink-caret .75s step-end infinite';
        function type() {
            if (charIndex < textToType.length) {
                splashTextElement.textContent += textToType.charAt(charIndex);
                charIndex++;
                setTimeout(type, 220);
            } else {
                splashTextElement.style.borderRight = 'none';
                splashTextElement.style.animation = 'none';
                setTimeout(hideSplashScreen, 2100);
            }
        }
        type();
    }

    function animateMainContent() {
        if (bgWave) bgWave.classList.add('animate');
        setTimeout(() => { if (bgOrnament) bgOrnament.classList.add('animate'); }, 400);
        setTimeout(() => { if (centerContent) centerContent.classList.add('animate'); }, 900);
        setTimeout(() => { if (aboutContent) aboutContent.classList.add('animate'); }, 900);
        setTimeout(() => { if (topRightLogo) topRightLogo.classList.add('visible'); }, 1200);
    }

    function hideSplashScreen() {
        if (!splashScreen) return;
        splashScreen.classList.add('hidden');
        document.body.style.overflow = 'auto';
        splashScreen.addEventListener('transitionend', () => {
            splashScreen.remove();
            animateMainContent();
        }, { once: true });
    }

    // --- Level Select Screen ---
    const showLevelSelect = () => {
        if (levelSelectScreen) {
            levelSelectScreen.classList.remove('exiting');
            levelSelectScreen.classList.add('visible');
        }
    };
    
    const showMainMenu = () => {
        if (levelSelectScreen) {
            levelSelectScreen.classList.add('exiting');
            levelSelectScreen.classList.remove('visible');
            const handleTransitionEnd = () => {
                levelSelectScreen.classList.remove('exiting');
                levelSelectScreen.removeEventListener('transitionend', handleTransitionEnd);
            };
            levelSelectScreen.addEventListener('transitionend', handleTransitionEnd);
        }
    };

    // --- Flow returning ---
    const isReturning = sessionStorage.getItem('isReturning') === 'true';
    if (isReturning) {
        sessionStorage.removeItem('isReturning');

        if (startOverlay) startOverlay.remove();
        if (splashScreen) splashScreen.remove();
        
        document.body.style.overflow = 'auto';
        if (bgWave) bgWave.classList.add('animate');
        if (bgOrnament) bgOrnament.classList.add('animate');
        if (centerContent) centerContent.classList.add('animate');
        if (aboutContent) aboutContent.classList.add('animate');
        if (topRightLogo) topRightLogo.classList.add('visible');
        showLevelSelect();
    } else {
        // --- First visit ---
        if (startInteractiveArea && startOverlay) {
            startInteractiveArea.addEventListener('click', () => {
                startOverlay.classList.add('hidden');

                if (!DEV_MODE) {
                    backgroundMusic.play().catch(e => console.error("Autoplay music failed:", e));
                }

                if (DEV_MODE) {
                    hideSplashScreen();
                } else {
                    setTimeout(() => {
                        if (splashLogo) splashLogo.classList.add('animate');
                        setTimeout(startTypingAnimation, 2500);
                    }, 1000);
                }
            }, { once: true });
        }
    }

    // --- Buttons ---
    if (startButton) startButton.addEventListener('click', showLevelSelect);
    if (backToMainButton) backToMainButton.addEventListener('click', showMainMenu);

    // About screen navigation
    const showAbout = () => {
        if (aboutScreen) {
            aboutScreen.classList.remove('exiting');
            aboutScreen.classList.add('visible');
        }
    };
    const hideAbout = () => {
        if (aboutScreen) {
            aboutScreen.classList.add('exiting');
            aboutScreen.classList.remove('visible');
            const onEnd = () => {
                aboutScreen.classList.remove('exiting');
                aboutScreen.removeEventListener('transitionend', onEnd);
            };
            aboutScreen.addEventListener('transitionend', onEnd);
        }
    };
    const aboutBtn = document.getElementById('about-button');
    if (aboutBtn) aboutBtn.addEventListener('click', showAbout);
    if (aboutBackButton) aboutBackButton.addEventListener('click', hideAbout);

    // --- Model Modal ---
    const updateModelButtonLabel = () => {
        if (!modelButton) return;
        const label = selectedModel ? (modelLabelMap[selectedModel] || selectedModel) : 'Pilih Model';
        modelButton.textContent = label;
    };
    updateModelButtonLabel();

    // Load characters data
    const fetchCharacters = async () => {
        try {
            const res = await fetch('/character.json');
            const data = await res.json();
            characters = data.characters || [];
            // Set index to selected model if present
            const idx = characters.findIndex(c => c.name === selectedModel);
            currentIndex = idx >= 0 ? idx : 0;
            renderCarousel();
        } catch (e) {
            console.error('Failed to load character.json', e);
        }
    };
    fetchCharacters();

    const truncate = (text, len=110, addEllipsis=true) => {
        if (!text) return '';
        if (text.length <= len) return text;
        return addEllipsis ? text.slice(0, len - 1) + '…' : text.slice(0, len);
    };

    const renderCarousel = () => {
        if (!characters.length) return;
        const c = characters[currentIndex];
        if (modelImg) modelImg.src = c.image_url;
        if (modelName) modelName.textContent = c.name;
        if (modelRole) modelRole.textContent = truncate(c.role, 70);
        if (modelCharacteristics) modelCharacteristics.textContent = truncate(c.characteristics, 160, false);
        if (modelHobbies) modelHobbies.textContent = truncate(c.hobbies, 120);
        if (modelQuote) modelQuote.textContent = truncate(c.quote, 90);
        // Update selectedModel to match current card
        selectedModel = c.name;
        updateModelButtonLabel();
    };

    if (modelButton && modelModal) {
        modelButton.addEventListener('click', () => {
            modelModal.classList.remove('hidden');
            renderCarousel();
        });
    }

    if (modelCancel && modelModal) {
        modelCancel.addEventListener('click', () => modelModal.classList.add('hidden'));
    }
    
    if (modelCancelMobile && modelModal) {
        modelCancelMobile.addEventListener('click', () => modelModal.classList.add('hidden'));
    }

    if (modelContinue && modelModal) {
        modelContinue.addEventListener('click', () => {
            modelModal.classList.add('hidden'); // hanya tutup modal
            // Save the selected model to localStorage
            localStorage.setItem('model', selectedModel);
            updateModelButtonLabel();
        });
    }
    
    if (modelContinueMobile && modelModal) {
        modelContinueMobile.addEventListener('click', () => {
            modelModal.classList.add('hidden'); // hanya tutup modal
            // Save the selected model to localStorage
            localStorage.setItem('model', selectedModel);
            updateModelButtonLabel();
        });
    }

    // Carousel navigation
    const handlePrevClick = () => { 
        if (!characters.length) return; 
        currentIndex = (currentIndex - 1 + characters.length) % characters.length; 
        renderCarousel(); 
    };
    
    const handleNextClick = () => { 
        if (!characters.length) return; 
        currentIndex = (currentIndex + 1) % characters.length; 
        renderCarousel(); 
    };
    
    // Desktop carousel buttons
    if (prevBtn) prevBtn.addEventListener('click', handlePrevClick);
    if (nextBtn) nextBtn.addEventListener('click', handleNextClick);
    
    // Mobile carousel buttons
    if (prevBtnMobile) prevBtnMobile.addEventListener('click', handlePrevClick);
    if (nextBtnMobile) nextBtnMobile.addEventListener('click', handleNextClick);

    // --- FreeTalk button --- redirect ke chat.html dengan model yg dipilih
    if (demoButton) {
        demoButton.addEventListener('click', () => {
            // Show confirmation modal first
            if (confirmModal && confirmSelected) {
                const label = modelLabelMap[selectedModel] || selectedModel;
                confirmSelected.textContent = `Model yang dipilih: ${label}`;
                confirmModal.classList.remove('hidden');
            } else {
                // Fallback direct navigation
                localStorage.setItem('model', selectedModel);
                sessionStorage.setItem('isReturning', 'true');
                window.location.href = '/chat';
            }
        });
    }

    if (confirmCancel && confirmModal) {
        confirmCancel.addEventListener('click', () => confirmModal.classList.add('hidden'));
    }

    if (confirmOk && confirmModal) {
        confirmOk.addEventListener('click', () => {
            confirmModal.classList.add('hidden');
            localStorage.setItem('model', selectedModel);
            sessionStorage.setItem('isReturning', 'true');
            window.location.href = '/chat';
        });
    }
});
