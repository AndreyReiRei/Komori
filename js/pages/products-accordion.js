/**
 * Скрипт для горизонтального скролл-аккордеона товаров с навигационной полоской
 * Только навигация и скролл, добавление товаров находится в catalog.js
 */

document.addEventListener( 'DOMContentLoaded', function () {
	// ========== ПОЛУЧЕНИЕ ЭЛЕМЕНТОВ ==========
	let productsScroll = document.getElementById( 'productsScroll' );
	const navbarTrack = document.querySelector( '.navbar-track' );

	// Проверка наличия основного элемента
	if ( !productsScroll ) {
		console.error( 'Элемент продуктового скролла не найден' );
		return;
	}

	// ========== КОНФИГУРАЦИЯ ==========
	const config = {
		autoScrollInterval: 4000, // Интервал автоскролла (4 секунды)
		hoverScrollInterval: 6000, // Интервал автоскролла при наведении на товар (6 секунд)
		transitionDuration: 600, // Длительность анимации прокрутки
		loopScroll: true, // Зацикленная прокрутка (true - включена, false - выключена)
		animationEnabled: true, // Включить анимацию пульсации сегментов
	};

	// ========== СОСТОЯНИЕ ==========
	let currentIndex = 0; // Текущий индекс (номер видимой группы товаров)
	let autoScrollTimer = null; // Таймер для автоматической прокрутки
	let isScrolling = false; // Флаг, указывающий что сейчас происходит программная прокрутка
	let isHovering = false; // Флаг наведения на товар
	let cardWidth = 0; // Ширина одной карточки товара + отступ (gap)
	let totalItems = 0; // Общее количество товаров
	let visibleItems = 0; // Количество товаров, помещающихся на экране
	let maxIndex = 0; // Максимальный индекс (общее количество "экранов" - 1)
	let segments = []; // Массив с элементами сегментов навигационной полоски
	let hoverTimer = null; // Таймер для задержки перед сменой скорости

	// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

	/**
	 * Обновление измерений - вычисляет актуальные размеры карточек и контейнера
	 * Вызывается при загрузке, изменении размера окна и обновлении контента
	 */
	function updateMeasurements() {
		const cards = productsScroll.querySelectorAll( '.product-card' );
		if ( cards.length === 0 ) return;

		const card = cards[0];
		// Получаем значение gap из стилей контейнера
		const style = window.getComputedStyle( productsScroll );
		const gap = parseInt( style.gap ) || 30; // По умолчанию 30px

		// Полная ширина карточки включая отступ справа
		cardWidth = card.offsetWidth + gap;

		// Обновляем общую статистику
		totalItems = cards.length;
		visibleItems = Math.floor( productsScroll.clientWidth / cardWidth );

		// Максимальный индекс = общее количество "экранов" минус 1
		maxIndex = Math.max( 0, totalItems - visibleItems );
	}

	/**
	 * Создание сегментов навигационной полоски
	 * Динамически создает прямоугольные сегменты по количеству "экранов"
	 */
	function createNavbarSegments() {
		if ( !navbarTrack ) return;

		updateMeasurements();

		// Очищаем трек перед созданием новых сегментов
		navbarTrack.innerHTML = '';
		segments = [];

		// Количество сегментов = максимальный индекс + 1 (или хотя бы 1)
		const segmentCount = Math.max( 1, maxIndex + 1 );

		// Создаем сегменты
		for ( let i = 0; i < segmentCount; i++ ) {
			const segment = document.createElement( 'div' );
			segment.className = 'navbar-segment';
			segment.dataset.index = i;

			// Добавляем обработчик клика на каждый сегмент
			segment.addEventListener( 'click', function ( e ) {
				e.stopPropagation();
				const index = parseInt( this.dataset.index );
				scrollToIndex( index ); // Прокручиваем к выбранному индексу
			} );

			navbarTrack.appendChild( segment );
			segments.push( segment );
		}

		// Активируем текущий сегмент
		updateActiveSegment();

		console.debug( 'Created segments:', segmentCount );
	}

	/**
	 * Обновление активного сегмента навигационной полоски
	 * Подсвечивает текущий сегмент и убирает подсветку с остальных
	 */
	function updateActiveSegment() {
		if ( segments.length === 0 ) return;

		// Деактивируем все сегменты
		segments.forEach( segment => {
			segment.classList.remove( 'active' );
			segment.style.animation = ''; // Сбрасываем анимацию
		} );

		// Активируем текущий сегмент
		if ( segments[currentIndex] ) {
			segments[currentIndex].classList.add( 'active' );
		}
	}

	/**
	 * Обновление текущего индекса на основе позиции скролла
	 * Используется при ручном скролле мышкой или тачпадом
	 */
	function updateCurrentIndex() {
		// Не обновляем индекс во время программной прокрутки
		if ( isScrolling ) return;

		updateMeasurements();

		// Защита от деления на ноль
		if ( cardWidth === 0 || maxIndex === 0 ) {
			if ( currentIndex !== 0 ) {
				currentIndex = 0;
				updateActiveSegment();
			}
			return;
		}

		// Вычисляем примерный индекс на основе позиции скролла
		const rawIndex = Math.round( productsScroll.scrollLeft / cardWidth );
		let newIndex;

		if ( config.loopScroll ) {
			// ЗАЦИКЛЕННАЯ ПРОКРУТКА:
			// Если индекс меньше 0 - переходим в конец
			if ( rawIndex < 0 ) {
				newIndex = maxIndex + ( ( rawIndex + 1 ) % maxIndex ) - 1;
				if ( newIndex < 0 ) newIndex = maxIndex;
			}
			// Если индекс больше максимума - переходим в начало
			else if ( rawIndex > maxIndex ) {
				newIndex = rawIndex % ( maxIndex + 1 );
			}
			// Нормальный диапазон
			else {
				newIndex = rawIndex;
			}

			// Корректируем позицию скролла для зацикленности
			if ( rawIndex < 0 || rawIndex > maxIndex ) {
				productsScroll.scrollLeft = newIndex * cardWidth;
			}
		} else {
			// ОБЫЧНАЯ ПРОКРУТКА (без зацикливания)
			newIndex = Math.max( 0, Math.min( rawIndex, maxIndex ) );
		}

		// Обновляем индекс только если он действительно изменился
		if ( newIndex !== currentIndex ) {
			currentIndex = newIndex;
			updateActiveSegment();
		}
	}

	/**
	 * Плавная прокрутка к указанной позиции
	 * @param {number} position - позиция в пикселях
	 * @param {boolean} instant - мгновенная прокрутка без анимации
	 */
	function smoothScrollTo( position, instant = false ) {
		// Предотвращаем множественные вызовы во время анимации
		if ( isScrolling && !instant ) return;

		isScrolling = true;

		// Выполняем прокрутку
		productsScroll.scrollTo( {
			left: position,
			behavior: instant ? 'auto' : 'smooth'
		} );

		// Сбрасываем флаг после завершения анимации
		setTimeout( () => {
			isScrolling = false;
		}, config.transitionDuration );
	}

	/**
	 * Прокрутка к определенному индексу
	 * @param {number} index - индекс для прокрутки
	 */
	function scrollToIndex( index ) {
		updateMeasurements();

		// Проверки валидности индекса
		if ( index < 0 || index > maxIndex || isScrolling || index === currentIndex ) return;

		// Обновляем индекс ДО анимации (чтобы полоска переключилась сразу)
		currentIndex = index;
		updateActiveSegment(); // Полоска меняется мгновенно

		// Затем плавно прокручиваем
		smoothScrollTo( currentIndex * cardWidth );

		// Перезапускаем автоскролл после ручного взаимодействия
		stopAutoScroll();
		startAutoScroll();
	}

	/**
	 * Функция автоматической прокрутки вперед с зацикливанием
	 * Вызывается по таймеру
	 */
	function autoScrollNext() {
		// Не запускаем новую прокрутку, если предыдущая еще не завершилась
		if ( isScrolling ) return;

		updateMeasurements();

		// Защита от некорректных измерений
		if ( cardWidth === 0 || maxIndex === 0 ) return;

		let nextIndex;

		// Определяем следующий индекс с учетом зацикливания
		if ( currentIndex >= maxIndex ) {
			// Если достигли конца - возвращаемся в начало
			nextIndex = 0;
		} else {
			// Иначе просто увеличиваем индекс
			nextIndex = currentIndex + 1;
		}

		// Обновляем индекс ДО анимации
		currentIndex = nextIndex;
		updateActiveSegment(); // Полоска обновляется сразу

		// Затем прокручиваем
		smoothScrollTo( currentIndex * cardWidth );
	}

	/**
	 * Запуск автоматической прокрутки с учетом состояния наведения
	 */
	function startAutoScroll() {
		// Останавливаем предыдущий таймер
		stopAutoScroll();

		// Определяем интервал в зависимости от наличия наведения
		const interval = isHovering ? config.hoverScrollInterval : config.autoScrollInterval;

		// Запускаем новый таймер
		autoScrollTimer = setInterval( autoScrollNext, interval );
	}

	/**
	 * Остановка автоматической прокрутки
	 */
	function stopAutoScroll() {
		if ( autoScrollTimer ) {
			clearInterval( autoScrollTimer );
			autoScrollTimer = null;
		}
	}

	/**
	 * Обработчик наведения на карточку товара
	 */
	function handleProductHover() {
		// Если уже в состоянии наведения - ничего не делаем
		if ( isHovering ) return;

		// Очищаем предыдущий таймер задержки
		if ( hoverTimer ) {
			clearTimeout( hoverTimer );
		}

		// Устанавливаем флаг наведения
		isHovering = true;

		// Перезапускаем автоскролл с новым интервалом
		stopAutoScroll();
		startAutoScroll();
	}

	/**
	 * Обработчик ухода мыши с карточки товара
	 */
	function handleProductLeave() {
		// Очищаем предыдущий таймер задержки
		if ( hoverTimer ) {
			clearTimeout( hoverTimer );
		}

		// Добавляем небольшую задержку перед возвратом к обычной скорости
		hoverTimer = setTimeout( () => {
			// Сбрасываем флаг наведения
			isHovering = false;

			// Перезапускаем автоскролл с обычным интервалом
			stopAutoScroll();
			startAutoScroll();

			hoverTimer = null;
		}, 300 );
	}

	/**
	 * Добавление обработчиков наведения на карточки товаров
	 */
	function addProductHoverHandlers() {
		document.querySelectorAll( '.product-card' ).forEach( card => {
			// Удаляем старые обработчики, чтобы не было дубликатов
			card.removeEventListener( 'mouseenter', handleProductHover );
			card.removeEventListener( 'mouseleave', handleProductLeave );

			// Добавляем новые обработчики
			card.addEventListener( 'mouseenter', handleProductHover );
			card.addEventListener( 'mouseleave', handleProductLeave );
		} );
	}

	/**
	 * Обновление навигации при изменении количества товаров
	 * Без перезагрузки всего аккордеона
	 */
	function updateNavigation() {
		// Сохраняем текущую позицию
		const oldScrollLeft = productsScroll.scrollLeft;

		// Обновляем измерения
		updateMeasurements();

		// Пересоздаем сегменты навигации
		createNavbarSegments();

		// Корректируем индекс, если он вышел за пределы
		if ( currentIndex > maxIndex ) {
			currentIndex = Math.max( 0, maxIndex );
		}

		// Восстанавливаем позицию скролла или корректируем её
		if ( cardWidth > 0 ) {
			const newScrollLeft = Math.min( oldScrollLeft, maxIndex * cardWidth );
			productsScroll.scrollLeft = newScrollLeft;
		}

		// Обновляем активный сегмент
		updateActiveSegment();
	}

	// ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========

	/**
	 * Обработчик скролла - срабатывает при любом скролле (ручном или программном)
	 */
	productsScroll.addEventListener( 'scroll', function () {
		// Обновляем индекс только при ручном скролле
		updateCurrentIndex();
	} );

	/**
	 * Остановка автоскролла при наведении на контейнер
	 */
	productsScroll.addEventListener( 'mouseenter', stopAutoScroll );

	/**
	 * Возобновление автоскролла при уходе мыши с контейнера
	 */
	productsScroll.addEventListener( 'mouseleave', startAutoScroll );

	// ========== ИНИЦИАЛИЗАЦИЯ ==========

	// Первоначальные измерения
	updateMeasurements();

	// Создание навигационных сегментов
	createNavbarSegments();

	// Добавление обработчиков наведения на карточки
	addProductHoverHandlers();

	// Обновление текущего индекса
	updateCurrentIndex();

	// Запуск автоскролла
	startAutoScroll();

	// ========== ОБРАБОТЧИК ИЗМЕНЕНИЯ РАЗМЕРА ОКНА ==========
	let resizeTimer;
	window.addEventListener( 'resize', function () {
		clearTimeout( resizeTimer );
		resizeTimer = setTimeout( () => {
			updateNavigation();

			// Перезапускаем автоскролл
			stopAutoScroll();
			startAutoScroll();
		}, 250 );
	} );

	// ========== НАБЛЮДАТЕЛЬ ЗА ИЗМЕНЕНИЯМИ В DOM ==========
	// MutationObserver отслеживает добавление/удаление товаров
	const observer = new MutationObserver( function ( mutations ) {
		let shouldUpdate = false;

		mutations.forEach( function ( mutation ) {
			if ( mutation.type === 'childList' && mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0 ) {
				shouldUpdate = true;
			}
		} );

		if ( shouldUpdate ) {
			// Обновляем навигацию без перезагрузки
			updateNavigation();

			// Добавляем обработчики для новых карточек
			addProductHoverHandlers();
		}
	} );

	// Запускаем наблюдение за изменениями в контейнере товаров
	observer.observe( productsScroll, { childList: true, subtree: false } );

	// ========== СЛУШАЕМ ОБНОВЛЕНИЯ ТОВАРОВ ==========
	// Слушаем кастомное событие обновления товаров
	window.addEventListener( 'store:productsUpdated', function () {
		// Просто обновляем навигацию без перезагрузки
		updateNavigation();

		// Добавляем обработчики для новых карточек
		addProductHoverHandlers();
	} );

	console.log( 'Скролл-аккордеон товаров инициализирован' );
} );