document.addEventListener( 'DOMContentLoaded', function () {
	// ========== ПОЛУЧЕНИЕ ЭЛЕМЕНТОВ ==========
	const productsScroll = document.getElementById( 'productsScroll' );
	const navbarTrack = document.querySelector( '.navbar-track' );
	const prevBtn = document.querySelector( '.prev-btn' );
	const nextBtn = document.querySelector( '.next-btn' );

	if ( !productsScroll ) {
		console.error( 'Элемент продуктового скролла не найден' );
		return;
	}

	// ========== КОНФИГУРАЦИЯ ==========
	const config = {
		autoScrollInterval: 4000,
		hoverScrollInterval: 6000,
		transitionDuration: 600,
		loopScroll: true,
		animationEnabled: true,
	};

	// ========== СОСТОЯНИЕ ==========
	let currentIndex = 0;
	let autoScrollTimer = null;
	let isScrolling = false;
	let isHovering = false;
	let cardWidth = 0;
	let totalItems = 0;
	let visibleItems = 0;
	let maxIndex = 0;
	let segments = [];
	let hoverTimer = null;

	// ========== ФУНКЦИИ ДЛЯ КНОПОК ==========
	function scrollNext() {
		if ( !productsScroll ) return;

		const card = productsScroll.querySelector( '.product-card' );
		if ( !card ) return;

		const style = window.getComputedStyle( productsScroll );
		const gap = parseInt( style.gap ) || 30;
		const scrollAmount = card.offsetWidth + gap;

		productsScroll.scrollBy( {
			left: scrollAmount,
			behavior: 'smooth'
		} );

		stopAutoScroll();
		setTimeout( () => {
			if ( !isHovering ) startAutoScroll();
		}, 1000 );
	}

	function scrollPrev() {
		if ( !productsScroll ) return;

		const card = productsScroll.querySelector( '.product-card' );
		if ( !card ) return;

		const style = window.getComputedStyle( productsScroll );
		const gap = parseInt( style.gap ) || 30;
		const scrollAmount = card.offsetWidth + gap;

		productsScroll.scrollBy( {
			left: -scrollAmount,
			behavior: 'smooth'
		} );

		stopAutoScroll();
		setTimeout( () => {
			if ( !isHovering ) startAutoScroll();
		}, 1000 );
	}

	function updateButtonsState() {
		if ( !productsScroll || !prevBtn || !nextBtn ) return;

		const maxScroll = productsScroll.scrollWidth - productsScroll.clientWidth;

		if ( config.loopScroll ) {
			prevBtn.disabled = false;
			nextBtn.disabled = false;
			return;
		}

		prevBtn.disabled = productsScroll.scrollLeft <= 5;
		nextBtn.disabled = productsScroll.scrollLeft >= maxScroll - 5;
	}


	// ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========
	if ( prevBtn ) {
		prevBtn.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			scrollPrev();
		} );
	}

	if ( nextBtn ) {
		nextBtn.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			scrollNext();
		} );
	}

	productsScroll.addEventListener( 'scroll', function () {
		updateCurrentIndex();
		updateButtonsState();
	} );

	// ========== ИНИЦИАЛИЗАЦИЯ ==========
	updateMeasurements();
	createNavbarSegments();
	addProductHoverHandlers();
	updateCurrentIndex();
	startAutoScroll();
	updateButtonsState(); // Добавлено!
} );