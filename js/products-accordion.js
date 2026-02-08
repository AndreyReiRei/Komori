// Скрипт для горизонтального скролл-аккордеона товаров

document.addEventListener( 'DOMContentLoaded', function () {
	const productsScroll = document.getElementById( 'productsScroll' );
	const prevBtn = document.querySelector( '.prev-btn' );
	const nextBtn = document.querySelector( '.next-btn' );
	const indicators = document.querySelectorAll( '.indicator' );

	if ( !productsScroll ) {
		console.error( 'Элемент продуктового скролла не найден' );
		return;
	}

	// Конфигурация
	const config = {
		scrollStep: 400, // Шаг прокрутки в пикселях
		autoScrollInterval: 5000, // Интервал автоскролла (5 секунд)
		transitionDuration: 500, // Длительность анимации
	};

	// Состояние
	let currentIndex = 0;
	let autoScrollTimer = null;
	let isScrolling = false;

	// Функция обновления индикаторов
	function updateIndicators() {
		indicators.forEach( ( indicator, index ) => {
			indicator.classList.toggle( 'active', index === currentIndex );
		} );
	}

	// Функция плавной прокрутки
	function smoothScrollTo( position ) {
		if ( isScrolling ) return;

		isScrolling = true;
		productsScroll.scrollTo( {
			left: position,
			behavior: 'smooth'
		} );

		// Сбрасываем флаг после завершения анимации
		setTimeout( () => {
			isScrolling = false;
		}, config.transitionDuration );
	}

	// Функция прокрутки вперед
	function scrollNext() {
		const maxScroll = productsScroll.scrollWidth - productsScroll.clientWidth;
		const newPosition = Math.min( productsScroll.scrollLeft + config.scrollStep, maxScroll );

		smoothScrollTo( newPosition );
		updateCurrentIndex();
	}

	// Функция прокрутки назад
	function scrollPrev() {
		const newPosition = Math.max( productsScroll.scrollLeft - config.scrollStep, 0 );
		smoothScrollTo( newPosition );
		updateCurrentIndex();
	}

	// Функция прокрутки к определенному индексу
	function scrollToIndex( index ) {
		if ( index < 0 || index >= indicators.length || isScrolling ) return;

		const cardWidth = productsScroll.querySelector( '.product-card' ).offsetWidth + 25; // + gap
		const newPosition = index * cardWidth;

		smoothScrollTo( newPosition );
		currentIndex = index;
		updateIndicators();
	}

	// Функция обновления текущего индекса на основе позиции скролла
	function updateCurrentIndex() {
		const cardWidth = productsScroll.querySelector( '.product-card' ).offsetWidth + 25;
		const scrollPosition = productsScroll.scrollLeft;
		const newIndex = Math.round( scrollPosition / cardWidth );

		if ( newIndex !== currentIndex ) {
			currentIndex = Math.max( 0, Math.min( newIndex, indicators.length - 1 ) );
			updateIndicators();
		}
	}

	// Функция автоматической прокрутки
	function startAutoScroll() {
		stopAutoScroll();

		autoScrollTimer = setInterval( () => {
			const maxScroll = productsScroll.scrollWidth - productsScroll.clientWidth;

			if ( productsScroll.scrollLeft >= maxScroll ) {
				// Если достигли конца, возвращаемся к началу
				smoothScrollTo( 0 );
				currentIndex = 0;
			} else {
				scrollNext();
			}

			updateIndicators();
		}, config.autoScrollInterval );
	}

	// Функция остановки автоскролла
	function stopAutoScroll() {
		if ( autoScrollTimer ) {
			clearInterval( autoScrollTimer );
			autoScrollTimer = null;
		}
	}

	// Обработчики событий для кнопок
	if ( prevBtn ) {
		prevBtn.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			scrollPrev();
			stopAutoScroll();
			startAutoScroll();
		} );
	}

	if ( nextBtn ) {
		nextBtn.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			scrollNext();
			stopAutoScroll();
			startAutoScroll();
		} );
	}

	// Обработчики для индикаторов
	indicators.forEach( ( indicator, index ) => {
		indicator.addEventListener( 'click', function () {
			scrollToIndex( index );
			stopAutoScroll();
			startAutoScroll();
		} );
	} );

	// Обработчик скролла колесиком мыши
	productsScroll.addEventListener( 'wheel', function ( e ) {
		e.preventDefault();
		productsScroll.scrollLeft += e.deltaY;
		updateCurrentIndex();
		stopAutoScroll();
		startAutoScroll();
	} );

	// Обработчики для кнопок "В корзину"
	document.querySelectorAll( '.product-btn' ).forEach( button => {
		button.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			const productTitle = this.closest( '.product-card' ).querySelector( '.product-title' ).textContent;
			const productPrice = this.closest( '.product-card' ).querySelector( '.product-price' ).textContent;

			// В реальном приложении здесь будет добавление в корзину
			// Пока просто покажем сообщение
			showNotification( `Товар "${productTitle}" добавлен в корзину за ${productPrice}` );

			// Анимация кнопки
			const originalText = this.textContent;
			this.textContent = 'Добавлено!';
			this.style.background = 'linear-gradient(135deg, #34c759 0%, #2db14d 100%)';

			setTimeout( () => {
				this.textContent = originalText;
				this.style.background = 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)';
			}, 2000 );
		} );
	} );

	// Функция показа уведомлений
	function showNotification( message ) {
		// Создаем элемент уведомления
		const notification = document.createElement( 'div' );
		notification.className = 'product-notification';
		notification.textContent = message;

		// Стили для уведомления
		notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: linear-gradient(135deg, #ff6b6b 0%, #ff4757 100%);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 10px 25px rgba(255, 107, 107, 0.3);
            z-index: 9999;
            animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s;
            max-width: 400px;
            font-weight: 500;
        `;

		// Добавляем стили анимации
		const style = document.createElement( 'style' );
		style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes fadeOut {
                from {
                    opacity: 1;
                }
                to {
                    opacity: 0;
                }
            }
        `;
		document.head.appendChild( style );

		document.body.appendChild( notification );

		// Удаляем уведомление через 3 секунды
		setTimeout( () => {
			if ( notification.parentNode ) {
				notification.parentNode.removeChild( notification );
			}
		}, 3000 );
	}

	// Обновление состояния кнопок при скролле
	productsScroll.addEventListener( 'scroll', function () {
		updateCurrentIndex();

		// Обновляем состояние кнопок
		if ( prevBtn ) {
			prevBtn.disabled = productsScroll.scrollLeft <= 0;
		}

		if ( nextBtn ) {
			const maxScroll = productsScroll.scrollWidth - productsScroll.clientWidth;
			nextBtn.disabled = productsScroll.scrollLeft >= maxScroll;
		}
	} );

	// Автоскролл при наведении
	productsScroll.addEventListener( 'mouseenter', stopAutoScroll );
	productsScroll.addEventListener( 'mouseleave', startAutoScroll );

	// Инициализация
	updateIndicators();

	// Обновляем состояние кнопок при загрузке
	setTimeout( () => {
		if ( prevBtn ) prevBtn.disabled = productsScroll.scrollLeft <= 0;
		if ( nextBtn ) {
			const maxScroll = productsScroll.scrollWidth - productsScroll.clientWidth;
			nextBtn.disabled = productsScroll.scrollLeft >= maxScroll;
		}
	}, 100 );

	// Запускаем автоскролл
	startAutoScroll();

	// Обновляем при изменении размера окна
	let resizeTimer;
	window.addEventListener( 'resize', function () {
		clearTimeout( resizeTimer );
		resizeTimer = setTimeout( () => {
			updateCurrentIndex();
			stopAutoScroll();
			startAutoScroll();
		}, 250 );
	} );

	console.log( 'Скролл-аккордеон товаров инициализирован' );
} );