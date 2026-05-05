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
	let productsCurrentIndex = 0; // Текущий индекс (номер видимой группы товаров)
	let productsAutoScrollTimer = null; // Таймер для автоматической прокрутки
	let productsIsScrolling = false; // Флаг, указывающий что сейчас происходит программная прокрутка
	let productsIsHovering = false; // Флаг наведения на товар
	let productsCardWidth = 0; // Ширина одной карточки товара + отступ (gap)
	let productsTotalItems = 0; // Общее количество товаров
	let productsVisibleItems = 0; // Количество товаров, помещающихся на экране
	let productsMaxIndex = 0; // Максимальный индекс (общее количество "экранов" - 1)
	let productsSegments = []; // Массив с элементами сегментов навигационной полоски
	let productsHoverTimer = null; // Таймер для задержки перед сменой скорости

	// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

	/**
	 * Обновление измерений - вычисляет актуальные размеры карточек и контейнера
	 * Вызывается при загрузке, изменении размера окна и обновлении контента
	 */
	function productsUpdateMeasurements() {
		const cards = productsScroll.querySelectorAll( '.product-card' );
		if ( cards.length === 0 ) return;

		const card = cards[0];
		// Получаем значение gap из стилей контейнера
		const style = window.getComputedStyle( productsScroll );
		const gap = parseInt( style.gap ) || 30; // По умолчанию 30px

		// Полная ширина карточки включая отступ справа
		productsCardWidth = card.offsetWidth + gap;

		// Обновляем общую статистику
		productsTotalItems = cards.length;
		productsVisibleItems = Math.floor( productsScroll.clientWidth / productsCardWidth );

		// Максимальный индекс = общее количество "экранов" минус 1
		productsMaxIndex = Math.max( 0, productsTotalItems - productsVisibleItems );
	}

	/**
	 * Создание сегментов навигационной полоски
	 * Динамически создает прямоугольные сегменты по количеству "экранов"
	 */
	function productsCreateNavbarSegments() {
		if ( !navbarTrack ) return;

		productsUpdateMeasurements();

		// Очищаем трек перед созданием новых сегментов
		navbarTrack.innerHTML = '';
		productsSegments = [];

		// Количество сегментов = максимальный индекс + 1 (или хотя бы 1)
		const segmentCount = Math.max( 1, productsMaxIndex + 1 );

		// Создаем сегменты
		for ( let i = 0; i < segmentCount; i++ ) {
			const segment = document.createElement( 'div' );
			segment.className = 'navbar-segment';
			segment.dataset.index = i;

			// Добавляем обработчик клика на каждый сегмент
			segment.addEventListener( 'click', function ( e ) {
				e.stopPropagation();
				const index = parseInt( this.dataset.index );
				productsScrollToIndex( index ); // Прокручиваем к выбранному индексу
			} );

			navbarTrack.appendChild( segment );
			productsSegments.push( segment );
		}

		// Активируем текущий сегмент
		productsUpdateActiveSegment();

		console.debug( 'Created segments:', segmentCount );
	}

	/**
	 * Обновление активного сегмента навигационной полоски
	 * Подсвечивает текущий сегмент и убирает подсветку с остальных
	 */
	function productsUpdateActiveSegment() {
		if ( productsSegments.length === 0 ) return;

		// Деактивируем все сегменты
		productsSegments.forEach( segment => {
			segment.classList.remove( 'active' );
			segment.style.animation = ''; // Сбрасываем анимацию
		} );

		// Активируем текущий сегмент
		if ( productsSegments[productsCurrentIndex] ) {
			productsSegments[productsCurrentIndex].classList.add( 'active' );
		}
	}

	/**
	 * Обновление текущего индекса на основе позиции скролла
	 * Используется при ручном скролле мышкой или тачпадом
	 */
	function productsUpdateCurrentIndex() {
		// Не обновляем индекс во время программной прокрутки
		if ( productsIsScrolling ) return;

		productsUpdateMeasurements();

		// Защита от деления на ноль
		if ( productsCardWidth === 0 || productsMaxIndex === 0 ) {
			if ( productsCurrentIndex !== 0 ) {
				productsCurrentIndex = 0;
				productsUpdateActiveSegment();
			}
			return;
		}

		// Вычисляем примерный индекс на основе позиции скролла
		const rawIndex = Math.round( productsScroll.scrollLeft / productsCardWidth );
		let newIndex;

		if ( config.loopScroll ) {
			// ЗАЦИКЛЕННАЯ ПРОКРУТКА:
			// Если индекс меньше 0 - переходим в конец
			if ( rawIndex < 0 ) {
				newIndex = productsMaxIndex + ( ( rawIndex + 1 ) % productsMaxIndex ) - 1;
				if ( newIndex < 0 ) newIndex = productsMaxIndex;
			}
			// Если индекс больше максимума - переходим в начало
			else if ( rawIndex > productsMaxIndex ) {
				newIndex = rawIndex % ( productsMaxIndex + 1 );
			}
			// Нормальный диапазон
			else {
				newIndex = rawIndex;
			}

			// Корректируем позицию скролла для зацикленности
			if ( rawIndex < 0 || rawIndex > productsMaxIndex ) {
				productsScroll.scrollLeft = newIndex * productsCardWidth;
			}
		} else {
			// ОБЫЧНАЯ ПРОКРУТКА (без зацикливания)
			newIndex = Math.max( 0, Math.min( rawIndex, productsMaxIndex ) );
		}

		// Обновляем индекс только если он действительно изменился
		if ( newIndex !== productsCurrentIndex ) {
			productsCurrentIndex = newIndex;
			productsUpdateActiveSegment();
		}
	}

	/**
	 * Плавная прокрутка к указанной позиции
	 * @param {number} position - позиция в пикселях
	 * @param {boolean} instant - мгновенная прокрутка без анимации
	 */
	function productsSmoothScrollTo( position, instant = false ) {
		// Предотвращаем множественные вызовы во время анимации
		if ( productsIsScrolling && !instant ) return;

		productsIsScrolling = true;

		// Выполняем прокрутку
		productsScroll.scrollTo( {
			left: position,
			behavior: instant ? 'auto' : 'smooth'
		} );

		// Сбрасываем флаг после завершения анимации
		setTimeout( () => {
			productsIsScrolling = false;
		}, config.transitionDuration );
	}

	/**
	 * Прокрутка к определенному индексу
	 * @param {number} index - индекс для прокрутки
	 */
	function productsScrollToIndex( index ) {
		productsUpdateMeasurements();

		// Проверки валидности индекса
		if ( index < 0 || index > productsMaxIndex || productsIsScrolling || index === productsCurrentIndex ) return;

		// Обновляем индекс ДО анимации (чтобы полоска переключилась сразу)
		productsCurrentIndex = index;
		productsUpdateActiveSegment(); // Полоска меняется мгновенно

		// Затем плавно прокручиваем
		productsSmoothScrollTo( productsCurrentIndex * productsCardWidth );

		// Перезапускаем автоскролл после ручного взаимодействия
		productsStopAutoScroll();
		productsStartAutoScroll();
	}

	/**
	 * Функция автоматической прокрутки вперед с зацикливанием
	 * Вызывается по таймеру
	 */
	function productsAutoScrollNext() {
		// Не запускаем новую прокрутку, если предыдущая еще не завершилась
		if ( productsIsScrolling ) return;

		productsUpdateMeasurements();

		// Защита от некорректных измерений
		if ( productsCardWidth === 0 || productsMaxIndex === 0 ) return;

		let nextIndex;

		// Определяем следующий индекс с учетом зацикливания
		if ( productsCurrentIndex >= productsMaxIndex ) {
			// Если достигли конца - возвращаемся в начало
			nextIndex = 0;
		} else {
			// Иначе просто увеличиваем индекс
			nextIndex = productsCurrentIndex + 1;
		}

		// Обновляем индекс ДО анимации
		productsCurrentIndex = nextIndex;
		productsUpdateActiveSegment(); // Полоска обновляется сразу

		// Затем прокручиваем
		productsSmoothScrollTo( productsCurrentIndex * productsCardWidth );
	}

	/**
	 * Запуск автоматической прокрутки с учетом состояния наведения
	 */
	function productsStartAutoScroll() {
		// Останавливаем предыдущий таймер
		productsStopAutoScroll();

		// Определяем интервал в зависимости от наличия наведения
		const interval = productsIsHovering ? config.hoverScrollInterval : config.autoScrollInterval;

		// Запускаем новый таймер
		productsAutoScrollTimer = setInterval( productsAutoScrollNext, interval );
	}

	/**
	 * Остановка автоматической прокрутки
	 */
	function productsStopAutoScroll() {
		if ( productsAutoScrollTimer ) {
			clearInterval( productsAutoScrollTimer );
			productsAutoScrollTimer = null;
		}
	}

	/**
	 * Обработчик наведения на карточку товара
	 */
	function productsHandleProductHover() {
		// Если уже в состоянии наведения - ничего не делаем
		if ( productsIsHovering ) return;

		// Очищаем предыдущий таймер задержки
		if ( productsHoverTimer ) {
			clearTimeout( productsHoverTimer );
		}

		// Устанавливаем флаг наведения
		productsIsHovering = true;

		// Перезапускаем автоскролл с новым интервалом
		productsStopAutoScroll();
		productsStartAutoScroll();
	}

	/**
	 * Обработчик ухода мыши с карточки товара
	 */
	function productsHandleProductLeave() {
		// Очищаем предыдущий таймер задержки
		if ( productsHoverTimer ) {
			clearTimeout( productsHoverTimer );
		}

		// Добавляем небольшую задержку перед возвратом к обычной скорости
		productsHoverTimer = setTimeout( () => {
			// Сбрасываем флаг наведения
			productsIsHovering = false;

			// Перезапускаем автоскролл с обычным интервалом
			productsStopAutoScroll();
			productsStartAutoScroll();

			productsHoverTimer = null;
		}, 300 );
	}

	/**
	 * Добавление обработчиков наведения на карточки товаров
	 */
	function productsAddProductHoverHandlers() {
		document.querySelectorAll( '.product-card' ).forEach( card => {
			// Удаляем старые обработчики, чтобы не было дубликатов
			card.removeEventListener( 'mouseenter', productsHandleProductHover );
			card.removeEventListener( 'mouseleave', productsHandleProductLeave );

			// Добавляем новые обработчики
			card.addEventListener( 'mouseenter', productsHandleProductHover );
			card.addEventListener( 'mouseleave', productsHandleProductLeave );
		} );
	}

	/**
	 * Обновление навигации при изменении количества товаров
	 * Без перезагрузки всего аккордеона
	 */
	function productsUpdateNavigation() {
		// Сохраняем текущую позицию
		const oldScrollLeft = productsScroll.scrollLeft;

		// Обновляем измерения
		productsUpdateMeasurements();

		// Пересоздаем сегменты навигации
		productsCreateNavbarSegments();

		// Корректируем индекс, если он вышел за пределы
		if ( productsCurrentIndex > productsMaxIndex ) {
			productsCurrentIndex = Math.max( 0, productsMaxIndex );
		}

		// Восстанавливаем позицию скролла или корректируем её
		if ( productsCardWidth > 0 ) {
			const newScrollLeft = Math.min( oldScrollLeft, productsMaxIndex * productsCardWidth );
			productsScroll.scrollLeft = newScrollLeft;
		}

		// Обновляем активный сегмент
		productsUpdateActiveSegment();
	}

	// ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========

	/**
	 * Обработчик скролла - срабатывает при любом скролле (ручном или программном)
	 */
	productsScroll.addEventListener( 'scroll', function () {
		// Обновляем индекс только при ручном скролле
		productsUpdateCurrentIndex();
	} );

	/**
	 * Остановка автоскролла при наведении на контейнер
	 */
	productsScroll.addEventListener( 'mouseenter', productsStopAutoScroll );

	/**
	 * Возобновление автоскролла при уходе мыши с контейнера
	 */
	productsScroll.addEventListener( 'mouseleave', productsStartAutoScroll );

	// ========== ИНИЦИАЛИЗАЦИЯ ==========

	// Первоначальные измерения
	productsUpdateMeasurements();

	// Создание навигационных сегментов
	productsCreateNavbarSegments();

	// Добавление обработчиков наведения на карточки
	productsAddProductHoverHandlers();

	// Обновление текущего индекса
	productsUpdateCurrentIndex();

	// Запуск автоскролла
	productsStartAutoScroll();

	// ========== ОБРАБОТЧИК ИЗМЕНЕНИЯ РАЗМЕРА ОКНА ==========
	let productsResizeTimer;
	window.addEventListener( 'resize', function () {
		clearTimeout( productsResizeTimer );
		productsResizeTimer = setTimeout( () => {
			productsUpdateNavigation();

			// Перезапускаем автоскролл
			productsStopAutoScroll();
			productsStartAutoScroll();
		}, 250 );
	} );

	// ========== НАБЛЮДАТЕЛЬ ЗА ИЗМЕНЕНИЯМИ В DOM ==========
	// MutationObserver отслеживает добавление/удаление товаров
	const productsObserver = new MutationObserver( function ( mutations ) {
		let shouldUpdate = false;

		mutations.forEach( function ( mutation ) {
			if ( mutation.type === 'childList' && mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0 ) {
				shouldUpdate = true;
			}
		} );

		if ( shouldUpdate ) {
			// Обновляем навигацию без перезагрузки
			productsUpdateNavigation();

			// Добавляем обработчики для новых карточек
			productsAddProductHoverHandlers();
		}
	} );

	// Запускаем наблюдение за изменениями в контейнере товаров
	productsObserver.observe( productsScroll, { childList: true, subtree: false } );

	// ========== СЛУШАЕМ ОБНОВЛЕНИЯ ТОВАРОВ ==========
	// Слушаем кастомное событие обновления товаров
	window.addEventListener( 'store:productsUpdated', function () {
		// Обновляем навигацию
		productsUpdateNavigation();

		// Добавляем обработчики для новых карточек
		productsAddProductHoverHandlers();
	} );

	console.log( '✅ Скролл-аккордеон товаров инициализирован' );
} );