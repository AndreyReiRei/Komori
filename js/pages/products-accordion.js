/**
 * ============================================================================
 * ACCORDION.JS - МОДУЛЬ КАРУСЕЛИ ТОВАРОВ (ИСПРАВЛЕННАЯ ВЕРСИЯ)
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * - Создает и управляет горизонтальной каруселью товаров на главной странице
 * - Автоматическая и ручная прокрутка с анимацией
 * - Навигационные индикаторы (сегменты под каруселью)
 * - Отбор товаров по приоритету (хиты > новинки > скидки)
 * 
 * ОСОБЕННОСТИ:
 * - Циклическая прокрутка (зацикленная)
 * - Замедление при наведении мыши
 * - Адаптивность (пересчет при изменении размера окна)
 * - Однократный рендеринг товаров
 * 
 * ЗАВИСИМОСТИ:
 * - Должен быть элемент #productsScroll в DOM
 * - store.products - массив товаров
 * - store.isFavorite() - проверка избранного
 * - store.cart - корзина
 * - API.getSafeImageUrl(), API.formatPrice() и др.
 * 
 * НЕ ДЕЛАЕТ:
 * - НЕ управляет кнопками "В корзину" и "Избранное" (это ButtonManager)
 * - НЕ работает на страницах каталога (только главная)
 * 
 * ============================================================================
 */

( function () {
	'use strict';

	// =========================================================================
	// 1. ПРОВЕРКА - ЕСТЬ ЛИ КОНТЕЙНЕР ДЛЯ АККОРДЕОНА?
	// =========================================================================

	const productsScroll = document.getElementById( 'productsScroll' );
	if ( !productsScroll ) {
		console.log( '📊 Аккордеон: контейнер #productsScroll не найден. Модуль неактивен.' );
		return;
	}

	// Проверяем наличие необходимых глобальных объектов
	if ( !window.store ) {
		console.error( '📊 Аккордеон: глобальный объект store не найден!' );
		return;
	}
	if ( !window.API ) {
		console.error( '📊 Аккордеон: глобальный объект API не найден!' );
		return;
	}

	console.log( '📊 Аккордеон: начало инициализации...' );

	// =========================================================================
	// 2. КОНФИГУРАЦИЯ
	// =========================================================================

	/**
	 * Все настраиваемые параметры аккордеона
	 * Изменяйте значения здесь, не трогая логику
	 */
	const CONFIG = {
		// Интервалы автопрокрутки (в миллисекундах)
		autoScrollInterval: 5000,      // Обычный режим
		hoverScrollInterval: 10000,    // При наведении мыши (медленнее)

		// Анимация
		transitionDuration: 600,       // Длительность анимации скролла (мс)

		// Прокрутка
		loopScroll: true,              // true = зацикленная, false = с остановкой на краях

		// Лимиты товаров
		maxTotalProducts: 15,          // Максимум карточек в карусели
		maxPerCategory: 2,             // Не более 2 товаров из одной категории

		// Задержки
		hoverLeaveDelay: 300,          // Задержка перед возвратом к быстрой прокрутке (мс)
		resizeDebounceDelay: 250,      // Задержка при ресайзе (мс) - уменьшает количество пересчетов
		initDelay: 200                 // Задержка перед инициализацией (мс) - ждем рендеринг
	};

	// =========================================================================
	// 3. СОСТОЯНИЕ АККОРДЕОНА
	// =========================================================================

	/**
	 * Централизованное хранилище состояния
	 * Все переменные собраны в одном объекте для удобства управления и очистки
	 */
	const state = {
		// Флаги состояния
		isInitialized: false,          // true после полной инициализации
		productsRendered: false,       // true после рендеринга товаров
		isScrolling: false,            // true во время анимации скролла
		isHovering: false,             // true когда мышь над карточкой

		// Текущая позиция
		currentIndex: 0,               // Индекс активного слайда

		// Измерения (обновляются при ресайзе)
		cardWidth: 0,                  // Ширина одной карточки + gap
		totalItems: 0,                 // Общее количество карточек
		visibleItems: 0,               // Сколько карточек видно одновременно
		maxIndex: 0,                   // Максимальный индекс (totalItems - visibleItems)

		// Навигация
		segments: [],                  // Массив DOM-элементов сегментов навигации

		// Таймеры (нужны для очистки)
		timers: {
			autoScroll: null,          // setInterval автопрокрутки
			hover: null,               // setTimeout задержки hover
			resize: null,              // setTimeout debounce ресайза
			scrollEnd: null            // setTimeout окончания анимации скролла
		},

		// Наблюдатели (нужны для очистки)
		observer: null                 // MutationObserver за изменениями DOM
	};

	// =========================================================================
	// 4. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
	// =========================================================================

	/**
	 * Безопасное экранирование HTML-спецсимволов
	 * Защищает от XSS-атак при вставке пользовательских данных
	 * 
	 * @param {string} str - строка для экранирования
	 * @returns {string} Безопасная строка
	 */
	function escapeHtml( str ) {
		if ( !str ) return '';
		const map = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#039;'
		};
		return str.replace( /[&<>"']/g, char => map[char] || char );
	}

	/**
	 * Безопасное выполнение функции с перехватом ошибок
	 * 
	 * @param {Function} fn - функция для выполнения
	 * @param {string} context - описание контекста для лога ошибки
	 */
	function safeExecute( fn, context ) {
		try {
			fn();
		} catch ( error ) {
			console.error( `📊 Аккордеон: ошибка в "${context}"`, error );
		}
	}

	/**
	 * Безопасное получение значения из store с проверкой
	 * 
	 * @param {string} path - путь к свойству, например "products"
	 * @param {*} defaultValue - значение по умолчанию
	 * @returns {*} Значение из store или defaultValue
	 */
	function getFromStore( path, defaultValue = null ) {
		try {
			const keys = path.split( '.' );
			let value = window.store;
			for ( const key of keys ) {
				if ( value === null || value === undefined ) return defaultValue;
				value = value[key];
			}
			return value !== undefined ? value : defaultValue;
		} catch ( error ) {
			return defaultValue;
		}
	}

	// =========================================================================
	// 5. ОТБОР ТОВАРОВ ДЛЯ КАРУСЕЛИ
	// =========================================================================

	/**
	 * Вычисляет приоритет товара для сортировки
	 * Чем выше число - тем выше в списке
	 * 
	 * Приоритеты:
	 * - Хит продаж: +100 (самый высокий)
	 * - Новинка:     +50
	 * - Скидка:      +25
	 * - Обычный:     0
	 * 
	 * @param {Object} product - объект товара из store
	 * @returns {number} Числовой приоритет
	 */
	function getProductPriority( product ) {
		if ( !product ) return 0;

		let priority = 0;
		if ( product.isHit ) priority += 100;
		if ( product.isNew ) priority += 50;
		if ( product.oldPrice && product.oldPrice > product.price ) priority += 25;
		return priority;
	}

	/**
	 * Получает отфильтрованный и отсортированный список товаров
	 * 
	 * Алгоритм:
	 * 1. Берем все товары из store
	 * 2. Фильтруем - только в наличии
	 * 3. Сортируем по приоритету
	 * 4. Отбираем с учетом лимитов (не более 2 из категории, всего 15)
	 * 
	 * @returns {Array} Массив отобранных товаров
	 */
	function getAccordionProducts() {
		try {
			// Безопасно получаем товары
			const allProducts = getFromStore( 'products', [] );

			if ( !Array.isArray( allProducts ) ) {
				console.error( '📊 Аккордеон: store.products не является массивом' );
				return [];
			}

			// Фильтруем: только товары в наличии с количеством > 0
			const availableProducts = allProducts.filter( product => {
				return product &&
					product.status === 'in-stock' &&
					typeof product.quantity === 'number' &&
					product.quantity > 0;
			} );

			if ( availableProducts.length === 0 ) {
				console.log( '📊 Аккордеон: нет товаров в наличии' );
				return [];
			}

			// Сортируем по убыванию приоритета
			const sorted = [...availableProducts].sort( ( a, b ) => {
				return getProductPriority( b ) - getProductPriority( a );
			} );

			// Отбираем товары с учетом лимитов по категориям
			const result = [];
			const categoryCount = {};

			for ( const product of sorted ) {
				const category = product.category || 'uncategorized';
				const usedInCategory = categoryCount[category] || 0;

				// Пропускаем если в категории уже максимум
				if ( usedInCategory >= CONFIG.maxPerCategory ) {
					continue;
				}

				// Прерываем если набрали достаточно товаров
				if ( result.length >= CONFIG.maxTotalProducts ) {
					break;
				}

				result.push( product );
				categoryCount[category] = usedInCategory + 1;
			}

			console.log( `📊 Аккордеон: отобрано ${result.length} товаров из ${availableProducts.length} доступных` );
			return result;
		} catch ( error ) {
			console.error( '📊 Аккордеон: ошибка при отборе товаров:', error );
			return [];
		}
	}

	// =========================================================================
	// 6. СОЗДАНИЕ DOM-ЭЛЕМЕНТОВ КАРТОЧЕК
	// =========================================================================

	/**
	 * Создает HTML-строку с бейджами товара
	 * 
	 * @param {Object} product - объект товара
	 * @returns {string} HTML-строка с бейджами или пустая строка
	 */
	function createBadgesHtml( product ) {
		const badges = [];

		if ( product.isNew ) {
			badges.push( '<span class="product-badge new">Новинка</span>' );
		}
		if ( product.isHit ) {
			badges.push( '<span class="product-badge hit">Хит</span>' );
		}
		if ( product.oldPrice && product.oldPrice > product.price ) {
			const discount = Math.round( ( 1 - product.price / product.oldPrice ) * 100 );
			if ( discount > 0 ) {
				badges.push( `<span class="product-badge sale">-${discount}%</span>` );
			}
		}

		return badges.length > 0
			? `<div class="product-badges">${badges.join( '' )}</div>`
			: '';
	}

	/**
	 * Создает DOM-элемент карточки товара
	 * 
	 * Важно: создает ТОЛЬКО структуру карточки.
	 * Обработчики кнопок не добавляются - их обрабатывает ButtonManager через делегирование.
	 * 
	 * @param {Object} product - объект товара
	 * @returns {HTMLElement} DOM-элемент карточки
	 */
	function createProductCard( product ) {
		const card = document.createElement( 'div' );
		card.className = 'product-card';
		card.dataset.id = product.id;

		try {
			// Безопасно получаем начальные состояния для визуала
			const isFavorite = getFromStore( 'isFavorite', () => false )
				? window.store.isFavorite( product.id )
				: false;

			const cart = getFromStore( 'cart', [] );
			const inCart = Array.isArray( cart )
				? cart.find( item => item.id == product.id )
				: null;
			const inCartQuantity = inCart ? ( inCart.quantity || 0 ) : 0;
			const availableQuantity = ( product.quantity || 0 ) - inCartQuantity;
			const isInStock = product.status === 'in-stock' && availableQuantity > 0;

			// Классы для кнопки избранного
			const favoriteClass = isFavorite ? ' active' : '';
			const heartIcon = isFavorite ? 'fas' : 'far'; // fas = заполненное, far = контурное

			// Безопасно получаем URL
			let categoryUrl = '#';
			if ( typeof window.store.getCategoryUrl === 'function' ) {
				try {
					categoryUrl = window.store.getCategoryUrl( product.category ) || '#';
				} catch ( e ) {
					console.warn( '📊 Аккордеон: ошибка при получении URL категории', e );
				}
			}

			// Безопасно получаем URL изображения
			let imageUrl = product.image || '';
			if ( typeof window.API.getSafeImageUrl === 'function' ) {
				try {
					imageUrl = window.API.getSafeImageUrl( product.image );
				} catch ( e ) {
					console.warn( '📊 Аккордеон: ошибка при получении безопасного URL изображения' );
				}
			}

			// Безопасно получаем fallback SVG
			let fallbackSvg = '';
			if ( typeof window.API.getFallbackSvg === 'function' ) {
				try {
					fallbackSvg = window.API.getFallbackSvg( product.name );
				} catch ( e ) {
					// Не критично, оставляем пустым
				}
			}

			// Безопасно форматируем цену
			let formattedPrice = product.price;
			if ( typeof window.API.formatPrice === 'function' ) {
				try {
					formattedPrice = window.API.formatPrice( product.price );
				} catch ( e ) {
					// Оставляем как есть
				}
			}

			let formattedOldPrice = '';
			if ( product.oldPrice ) {
				if ( typeof window.API.formatPrice === 'function' ) {
					try {
						formattedOldPrice = window.API.formatPrice( product.oldPrice );
					} catch ( e ) {
						formattedOldPrice = product.oldPrice;
					}
				} else {
					formattedOldPrice = product.oldPrice;
				}
			}

			// Собираем HTML карточки
			card.innerHTML = `
                <a href="${categoryUrl}" class="product-card-link">
                    <div class="product-image">
                        <img src="${escapeHtml( imageUrl )}" 
                             alt="${escapeHtml( product.name )}" 
                             loading="lazy"
                             onerror="this.onerror=null; this.src='${escapeHtml( fallbackSvg )}';">
                        ${createBadgesHtml( product )}
                    </div>
                    <div class="product-content">
                        <h3 class="product-title">${escapeHtml( product.name )}</h3>
                        <p class="product-description">${escapeHtml( product.description || '' )}</p>
                        <div class="product-meta">
                            <span class="product-price">${formattedPrice}</span>
                            ${formattedOldPrice ? `<span class="product-old-price">${formattedOldPrice}</span>` : ''}
                        </div>
                    </div>
                </a>
                <div class="product-actions">
                    <button class="product-btn add-to-cart" 
                            data-id="${product.id}" 
                            ${!isInStock ? 'disabled' : ''}
                            title="${isInStock ? 'Добавить в корзину' : 'Нет в наличии'}">
                        <i class="fas fa-shopping-cart"></i> В корзину
                    </button>
                    <button class="favorite-btn${favoriteClass}" 
                            data-id="${product.id}"
                            title="${isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}">
                        <i class="${heartIcon} fa-heart"></i>
                    </button>
                </div>
            `;

			return card;
		} catch ( error ) {
			console.error( '📊 Аккордеон: ошибка при создании карточки товара:', error );
			// Возвращаем карточку-заглушку с сообщением об ошибке
			card.innerHTML = `
                <div class="product-card-error">
                    <p>Ошибка загрузки товара</p>
                </div>
            `;
			return card;
		}
	}

	// =========================================================================
	// 7. РЕНДЕРИНГ ТОВАРОВ (ОДНОКРАТНО)
	// =========================================================================

	/**
	 * Рендерит товары в контейнер аккордеона
	 * 
	 * Важно: выполняется ТОЛЬКО ОДИН РАЗ!
	 * Флаг state.productsRendered предотвращает повторный рендеринг.
	 * Это нужно чтобы не терять состояние прокрутки.
	 */
	function renderAccordionProducts() {
		// Проверяем, не отрендерены ли уже товары
		if ( state.productsRendered ) {
			console.log( '📊 Аккордеон: товары уже отрендерены, повторный рендеринг запрещен' );
			return;
		}

		try {
			const products = getAccordionProducts();

			// Если товаров нет - показываем сообщение
			if ( products.length === 0 ) {
				productsScroll.innerHTML = `
                    <div class="no-products">
                        <p>Товары скоро появятся</p>
                        <small>Мы обновляем ассортимент. Загляните позже!</small>
                    </div>`;
				state.productsRendered = true;
				console.log( '📊 Аккордеон: товаров нет, показано сообщение' );
				return;
			}

			// Очищаем контейнер только если он пуст
			// (защита от случайной повторной инициализации)
			if ( productsScroll.children.length === 0 ) {
				// Используем DocumentFragment для улучшения производительности
				// (все элементы добавляются одной операцией)
				const fragment = document.createDocumentFragment();

				products.forEach( product => {
					const card = createProductCard( product );
					fragment.appendChild( card );
				} );

				productsScroll.appendChild( fragment );
				console.log( `📊 Аккордеон: отрендерено ${products.length} карточек товаров` );
			} else {
				console.log( '📊 Аккордеон: контейнер не пуст, рендеринг пропущен' );
			}

			// Отмечаем, что рендеринг выполнен
			state.productsRendered = true;
		} catch ( error ) {
			console.error( '📊 Аккордеон: критическая ошибка при рендеринге:', error );
			productsScroll.innerHTML = `
                <div class="products-error">
                    <p>Ошибка загрузки товаров</p>
                    <button onclick="location.reload()">Обновить страницу</button>
                </div>`;
			state.productsRendered = true;
		}
	}

	// =========================================================================
	// 8. ИЗМЕРЕНИЯ И РАСЧЕТЫ
	// =========================================================================

	/**
	 * Обновляет все измерения связанные с размерами карточек
	 * 
	 * Вызывается при:
	 * - Инициализации
	 * - Изменении размера окна (с debounce)
	 * - Добавлении/удалении карточек
	 * 
	 * Что измеряет:
	 * - Ширину одной карточки с учетом gap
	 * - Количество видимых карточек
	 * - Максимальный индекс прокрутки
	 */
	function updateMeasurements() {
		if ( !productsScroll ) return;

		try {
			const cards = productsScroll.querySelectorAll( '.product-card' );

			// Если карточек нет - сбрасываем измерения
			if ( cards.length === 0 ) {
				state.cardWidth = 0;
				state.totalItems = 0;
				state.visibleItems = 0;
				state.maxIndex = 0;
				return;
			}

			// Берем первую карточку как эталон
			const firstCard = cards[0];
			const containerStyle = window.getComputedStyle( productsScroll );

			// Получаем gap из CSS (значение по умолчанию 30px)
			const gap = parseInt( containerStyle.gap, 10 ) || 30;

			// Вычисляем ширину карточки с учетом отступа
			state.cardWidth = firstCard.offsetWidth + gap;
			state.totalItems = cards.length;

			// Сколько карточек помещается в видимой области
			state.visibleItems = Math.floor( productsScroll.clientWidth / state.cardWidth );

			// Максимальный индекс (не даем уйти в отрицательный)
			state.maxIndex = Math.max( 0, state.totalItems - state.visibleItems );

			// Корректируем текущий индекс если он выходит за границы
			if ( state.currentIndex > state.maxIndex ) {
				state.currentIndex = Math.max( 0, state.maxIndex );
			}

			console.log( `📊 Аккордеон: измерения обновлены - ширина:${state.cardWidth}px, всего:${state.totalItems}, видно:${state.visibleItems}, макс.индекс:${state.maxIndex}` );
		} catch ( error ) {
			console.error( '📊 Аккордеон: ошибка при измерении:', error );
		}
	}

	// =========================================================================
	// 9. НАВИГАЦИОННЫЕ СЕГМЕНТЫ
	// =========================================================================

	/**
	 * Создает сегменты навигационной панели под каруселью
	 * 
	 * Каждый сегмент - это индикатор позиции.
	 * Активный сегмент подсвечивается.
	 * При клике на сегмент происходит прокрутка к соответствующему товару.
	 */
	function createNavbarSegments() {
		const navbarTrack = document.querySelector( '.navbar-track' );
		if ( !navbarTrack ) {
			console.warn( '📊 Аккордеон: контейнер .navbar-track не найден' );
			return;
		}

		try {
			// Сначала обновляем измерения
			updateMeasurements();

			// Очищаем старые сегменты
			navbarTrack.innerHTML = '';
			state.segments = [];

			// Количество сегментов = количеству возможных позиций скролла
			const segmentCount = Math.max( 1, state.maxIndex + 1 );

			// Создаем сегменты
			for ( let i = 0; i < segmentCount; i++ ) {
				const segment = document.createElement( 'div' );
				segment.className = 'navbar-segment';
				segment.dataset.index = i;

				// Атрибуты доступности
				segment.setAttribute( 'role', 'tab' );
				segment.setAttribute( 'aria-label', `Перейти к группе товаров ${i + 1}` );
				segment.setAttribute( 'aria-selected', 'false' );
				segment.tabIndex = 0;

				// Обработчик клика
				segment.addEventListener( 'click', function ( e ) {
					e.stopPropagation();
					const index = parseInt( this.dataset.index, 10 );
					scrollToIndex( index );
				} );

				// Обработчик клавиатуры для доступности
				segment.addEventListener( 'keydown', function ( e ) {
					if ( e.key === 'Enter' || e.key === ' ' ) {
						e.preventDefault();
						const index = parseInt( this.dataset.index, 10 );
						scrollToIndex( index );
					}
				} );

				navbarTrack.appendChild( segment );
				state.segments.push( segment );
			}

			// Обновляем активный сегмент
			updateActiveSegment();

			console.log( `📊 Аккордеон: создано ${segmentCount} навигационных сегментов` );
		} catch ( error ) {
			console.error( '📊 Аккордеон: ошибка при создании сегментов:', error );
		}
	}

	/**
	 * Обновляет активный сегмент навигации
	 * Подсвечивает сегмент, соответствующий текущей позиции
	 */
	function updateActiveSegment() {
		if ( state.segments.length === 0 ) return;

		state.segments.forEach( ( segment, index ) => {
			const isActive = index === state.currentIndex;

			// Переключаем класс и ARIA-атрибут
			segment.classList.toggle( 'active', isActive );
			segment.setAttribute( 'aria-selected', isActive.toString() );

			// Сбрасываем анимацию для неактивных
			if ( !isActive ) {
				segment.style.animation = '';
			}
		} );
	}

	/**
	 * Обновляет текущий индекс на основе позиции скролла
	 * Вызывается при событии scroll на контейнере
	 */
	function updateCurrentIndex() {
		// Не обновляем во время программной прокрутки
		if ( state.isScrolling ) return;

		try {
			updateMeasurements();

			// Если нет измерений - сбрасываем индекс
			if ( state.cardWidth === 0 || state.maxIndex === 0 ) {
				if ( state.currentIndex !== 0 ) {
					state.currentIndex = 0;
					updateActiveSegment();
				}
				return;
			}

			// Вычисляем примерный индекс на основе позиции скролла
			const rawIndex = Math.round( productsScroll.scrollLeft / state.cardWidth );
			let newIndex;

			if ( CONFIG.loopScroll ) {
				// ===== ЦИКЛИЧЕСКАЯ ПРОКРУТКА =====

				if ( rawIndex < 0 ) {
					// Ушли влево за границу - перескакиваем в конец
					newIndex = state.maxIndex;
				} else if ( rawIndex > state.maxIndex ) {
					// Ушли вправо за границу - перескакиваем в начало
					newIndex = 0;
				} else {
					// В пределах границ
					newIndex = rawIndex;
				}

				// Корректируем физическую позицию скролла при выходе за границы
				if ( rawIndex < 0 || rawIndex > state.maxIndex ) {
					productsScroll.scrollLeft = newIndex * state.cardWidth;
				}
			} else {
				// ===== ОБЫЧНАЯ ПРОКРУТКА (С ГРАНИЦАМИ) =====
				newIndex = Math.max( 0, Math.min( rawIndex, state.maxIndex ) );
			}

			// Обновляем индекс если он изменился
			if ( newIndex !== state.currentIndex ) {
				state.currentIndex = newIndex;
				updateActiveSegment();
			}
		} catch ( error ) {
			console.error( '📊 Аккордеон: ошибка при обновлении индекса:', error );
		}
	}

	// =========================================================================
	// 10. УПРАВЛЕНИЕ ПРОКРУТКОЙ
	// =========================================================================

	/**
	 * Плавная прокрутка к указанной позиции
	 * 
	 * @param {number} position - целевая позиция скролла в пикселях
	 * @param {boolean} [instant=false] - true для мгновенной прокрутки без анимации
	 */
	function smoothScrollTo( position, instant = false ) {
		// Предотвращаем множественные одновременные скроллы
		if ( state.isScrolling && !instant ) return;
		if ( !productsScroll ) return;

		try {
			state.isScrolling = true;

			// Очищаем предыдущий таймер окончания скролла
			if ( state.timers.scrollEnd ) {
				clearTimeout( state.timers.scrollEnd );
				state.timers.scrollEnd = null;
			}

			// Выполняем прокрутку
			productsScroll.scrollTo( {
				left: position,
				behavior: instant ? 'auto' : 'smooth'
			} );

			// Устанавливаем таймер для снятия флага isScrolling
			// Время зависит от типа прокрутки
			const duration = instant ? 0 : CONFIG.transitionDuration;
			state.timers.scrollEnd = setTimeout( () => {
				state.isScrolling = false;
				state.timers.scrollEnd = null;
			}, duration );
		} catch ( error ) {
			console.error( '📊 Аккордеон: ошибка при скролле:', error );
			// В случае ошибки сбрасываем флаг
			state.isScrolling = false;
		}
	}

	/**
	 * Прокрутка к карточке с указанным индексом
	 * 
	 * @param {number} index - индекс карточки (0-based)
	 */
	function scrollToIndex( index ) {
		try {
			// Обновляем измерения на случай ресайза
			updateMeasurements();

			// Проверяем валидность индекса
			if ( index < 0 || index > state.maxIndex ) {
				console.warn( `📊 Аккордеон: индекс ${index} вне диапазона [0, ${state.maxIndex}]` );
				return;
			}

			// Игнорируем если уже скроллим или индекс не изменился
			if ( state.isScrolling ) return;
			if ( index === state.currentIndex ) return;

			// Обновляем текущий индекс
			state.currentIndex = index;
			updateActiveSegment();

			// Прокручиваем к нужной позиции
			const targetPosition = state.currentIndex * state.cardWidth;
			smoothScrollTo( targetPosition );

			// Перезапускаем автопрокрутку с новым интервалом
			stopAutoScroll();
			startAutoScroll();
		} catch ( error ) {
			console.error( '📊 Аккордеон: ошибка при скролле к индексу:', error );
		}
	}

	/**
	 * Автоматическая прокрутка к следующей карточке
	 * Вызывается по таймеру
	 */
	function autoScrollNext() {
		// Не скроллим если уже в процессе
		if ( state.isScrolling ) return;
		if ( !productsScroll ) return;

		try {
			updateMeasurements();

			// Если измерений нет или некуда скроллить - выходим
			if ( state.cardWidth === 0 || state.maxIndex === 0 ) return;

			// Вычисляем следующий индекс
			let nextIndex;
			if ( state.currentIndex >= state.maxIndex ) {
				// Достигли конца - переходим в начало
				nextIndex = 0;
			} else {
				// Идем к следующему
				nextIndex = state.currentIndex + 1;
			}

			// Обновляем состояние
			state.currentIndex = nextIndex;
			updateActiveSegment();

			// Прокручиваем
			const targetPosition = state.currentIndex * state.cardWidth;
			smoothScrollTo( targetPosition );
		} catch ( error ) {
			console.error( '📊 Аккордеон: ошибка при автоскролле:', error );
		}
	}

	// =========================================================================
	// 11. УПРАВЛЕНИЕ ТАЙМЕРАМИ
	// =========================================================================

	/**
	 * Запускает автоматическую прокрутку
	 * Использует разный интервал в зависимости от состояния hover
	 */
	function startAutoScroll() {
		// Останавливаем предыдущий таймер
		stopAutoScroll();

		// Выбираем интервал
		const interval = state.isHovering
			? CONFIG.hoverScrollInterval   // Медленнее при наведении
			: CONFIG.autoScrollInterval;    // Обычная скорость

		// Запускаем новый таймер
		state.timers.autoScroll = setInterval( autoScrollNext, interval );

		console.log( `📊 Аккордеон: автопрокрутка запущена (интервал: ${interval}мс)` );
	}

	/**
	 * Останавливает автоматическую прокрутку
	 */
	function stopAutoScroll() {
		if ( state.timers.autoScroll ) {
			clearInterval( state.timers.autoScroll );
			state.timers.autoScroll = null;
		}
	}

	/**
	 * Очищает ВСЕ таймеры
	 * Вызывается при уничтожении модуля
	 */
	function clearAllTimers() {
		stopAutoScroll();

		// Очищаем все setTimeout таймеры
		const timerKeys = ['hover', 'resize', 'scrollEnd'];
		timerKeys.forEach( key => {
			if ( state.timers[key] ) {
				clearTimeout( state.timers[key] );
				state.timers[key] = null;
			}
		} );

		console.log( '📊 Аккордеон: все таймеры очищены' );
	}

	// =========================================================================
	// 12. ОБРАБОТЧИКИ HOVER (НАВЕДЕНИЕ МЫШИ)
	// =========================================================================

	/**
	 * Обработчик наведения мыши на карточку
	 * Замедляет автопрокрутку
	 */
	function handleProductHover() {
		if ( state.isHovering ) return;

		// Очищаем таймер задержки если был
		if ( state.timers.hover ) {
			clearTimeout( state.timers.hover );
			state.timers.hover = null;
		}

		state.isHovering = true;

		// Перезапускаем с увеличенным интервалом
		stopAutoScroll();
		startAutoScroll();

		console.log( '🖱️ Аккордеон: мышь над карточкой - интервал увеличен' );
	}

	/**
	 * Обработчик ухода мыши с карточки
	 * Возвращает обычную скорость с задержкой
	 */
	function handleProductLeave() {
		// Очищаем предыдущий таймер задержки
		if ( state.timers.hover ) {
			clearTimeout( state.timers.hover );
		}

		// Задержка перед возвратом к быстрой прокрутке
		state.timers.hover = setTimeout( () => {
			state.isHovering = false;
			stopAutoScroll();
			startAutoScroll();
			state.timers.hover = null;
			console.log( '🖱️ Аккордеон: мышь ушла - обычный интервал' );
		}, CONFIG.hoverLeaveDelay );
	}

	/**
	 * Добавляет обработчики hover на все карточки
	 */
	function addProductHoverHandlers() {
		const cards = document.querySelectorAll( '.product-card' );

		cards.forEach( card => {
			// Удаляем старые обработчики (на случай повторного вызова)
			card.removeEventListener( 'mouseenter', handleProductHover );
			card.removeEventListener( 'mouseleave', handleProductLeave );

			// Добавляем новые
			card.addEventListener( 'mouseenter', handleProductHover );
			card.addEventListener( 'mouseleave', handleProductLeave );
		} );

		console.log( `📊 Аккордеон: обработчики hover добавлены на ${cards.length} карточек` );
	}

	// =========================================================================
	// 13. ОБРАБОТЧИКИ СОБЫТИЙ
	// =========================================================================

	/**
	 * Обработчик скролла контейнера
	 * Обновляет индекс и активный сегмент
	 */
	function handleContainerScroll() {
		updateCurrentIndex();
	}

	/**
	 * Обработчик наведения мыши на контейнер
	 * Останавливает автопрокрутку пока мышь над контейнером
	 */
	function handleContainerMouseEnter() {
		stopAutoScroll();
		console.log( '🖱️ Аккордеон: мышь над контейнером - прокрутка остановлена' );
	}

	/**
	 * Обработчик ухода мыши с контейнера
	 * Возобновляет автопрокрутку
	 */
	function handleContainerMouseLeave() {
		// Запускаем только если мышь не над карточкой
		if ( !state.isHovering ) {
			startAutoScroll();
			console.log( '🖱️ Аккордеон: мышь ушла с контейнера - прокрутка возобновлена' );
		}
	}

	/**
	 * Обработчик изменения размера окна
	 * С debounce для производительности
	 */
	function handleResize() {
		// Очищаем предыдущий таймер
		if ( state.timers.resize ) {
			clearTimeout( state.timers.resize );
		}

		// Устанавливаем новый с задержкой
		state.timers.resize = setTimeout( () => {
			if ( state.isInitialized ) {
				console.log( '📐 Аккордеон: окно изменено - пересчет' );
				updateMeasurements();
				createNavbarSegments();
				addProductHoverHandlers();
				stopAutoScroll();
				startAutoScroll();
			}
			state.timers.resize = null;
		}, CONFIG.resizeDebounceDelay );
	}

	// =========================================================================
	// 14. НАБЛЮДАТЕЛЬ ЗА DOM
	// =========================================================================

	/**
	 * Наблюдает за изменениями в контейнере аккордеона
	 * При добавлении/удалении карточек обновляет навигацию
	 */
	function setupDOMObserver() {
		if ( !productsScroll ) return;

		// Отключаем предыдущий наблюдатель если был
		if ( state.observer ) {
			state.observer.disconnect();
		}

		// Создаем новый
		state.observer = new MutationObserver( ( mutations ) => {
			if ( !state.isInitialized ) return;

			// Проверяем, были ли изменения с карточками
			const hasCardChanges = mutations.some( mutation => {
				if ( mutation.type !== 'childList' ) return false;

				// Проверяем добавленные узлы
				for ( const node of mutation.addedNodes ) {
					if ( node.nodeType === 1 && node.classList.contains( 'product-card' ) ) {
						return true;
					}
				}

				// Проверяем удаленные узлы
				for ( const node of mutation.removedNodes ) {
					if ( node.nodeType === 1 && node.classList.contains( 'product-card' ) ) {
						return true;
					}
				}

				return false;
			} );

			if ( hasCardChanges ) {
				console.log( '📊 Аккордеон: обнаружены изменения карточек, обновляю навигацию' );
				updateMeasurements();
				createNavbarSegments();
				addProductHoverHandlers();
			}
		} );

		// Начинаем наблюдение
		state.observer.observe( productsScroll, {
			childList: true,  // Добавление/удаление дочерних элементов
			subtree: false    // Только прямые дети (карточки)
		} );

		console.log( '📊 Аккордеон: наблюдатель DOM запущен' );
	}

	// =========================================================================
	// 15. ИНИЦИАЛИЗАЦИЯ
	// =========================================================================

	/**
	 * Главная функция инициализации аккордеона
	 * Выполняется один раз при загрузке страницы
	 */
	function initialize() {
		try {
			console.log( '📊 Аккордеон: запуск инициализации...' );

			// Шаг 1: Рендерим товары
			renderAccordionProducts();

			// Шаг 2: Настраиваем аккордеон с задержкой
			// (ждем пока DOM обновится после рендеринга)
			setTimeout( () => {
				if ( state.isInitialized ) {
					console.log( '📊 Аккордеон: уже инициализирован, повторная инициализация пропущена' );
					return;
				}

				// Измеряем размеры
				updateMeasurements();

				// Создаем навигационные сегменты
				createNavbarSegments();

				// Добавляем обработчики наведения
				addProductHoverHandlers();

				// Обновляем текущий индекс
				updateCurrentIndex();

				// Запускаем автоматическую прокрутку
				startAutoScroll();

				// Запрашиваем обновление кнопок у ButtonManager
				if ( window.buttonManager && typeof window.buttonManager.updateAllButtons === 'function' ) {
					window.buttonManager.updateAllButtons();
				}

				// Отмечаем успешную инициализацию
				state.isInitialized = true;
				console.log( '✅ Аккордеон: инициализация успешно завершена' );
			}, CONFIG.initDelay );

			// Шаг 3: Прикрепляем обработчики событий контейнера
			productsScroll.addEventListener( 'scroll', handleContainerScroll, { passive: true } );
			productsScroll.addEventListener( 'mouseenter', handleContainerMouseEnter );
			productsScroll.addEventListener( 'mouseleave', handleContainerMouseLeave );

			// Шаг 4: Обработчик ресайза окна
			window.addEventListener( 'resize', handleResize );

			// Шаг 5: Запускаем наблюдатель DOM
			setupDOMObserver();

			console.log( '📊 Аккордеон: базовая настройка завершена' );
		} catch ( error ) {
			console.error( '📊 Аккордеон: критическая ошибка при инициализации:', error );
		}
	}

	// =========================================================================
	// 16. ОЧИСТКА РЕСУРСОВ
	// =========================================================================

	/**
	 * Глобальная функция для очистки всех ресурсов аккордеона
	 * Вызывать при удалении модуля или переходе на другую страницу в SPA
	 * 
	 * Использование: window.destroyAccordion()
	 */
	window.destroyAccordion = function () {
		console.log( '📊 Аккордеон: очистка ресурсов...' );

		// Очищаем все таймеры
		clearAllTimers();

		// Удаляем обработчики с контейнера
		if ( productsScroll ) {
			productsScroll.removeEventListener( 'scroll', handleContainerScroll );
			productsScroll.removeEventListener( 'mouseenter', handleContainerMouseEnter );
			productsScroll.removeEventListener( 'mouseleave', handleContainerMouseLeave );
		}

		// Удаляем обработчик ресайза
		window.removeEventListener( 'resize', handleResize );

		// Отключаем наблюдатель DOM
		if ( state.observer ) {
			state.observer.disconnect();
			state.observer = null;
		}

		// Удаляем обработчики hover с карточек
		document.querySelectorAll( '.product-card' ).forEach( card => {
			card.removeEventListener( 'mouseenter', handleProductHover );
			card.removeEventListener( 'mouseleave', handleProductLeave );
		} );

		// Сбрасываем состояние
		state.isInitialized = false;
		state.productsRendered = false;
		state.segments = [];
		state.currentIndex = 0;

		console.log( '✅ Аккордеон: ресурсы очищены' );
	};

	// =========================================================================
	// 17. ЗАПУСК
	// =========================================================================

	// Запускаем инициализацию
	initialize();

	// Экспортируем API для внешнего использования
	window.accordionAPI = {
		refresh: function () {
			updateMeasurements();
			createNavbarSegments();
			addProductHoverHandlers();
			if ( window.buttonManager ) {
				window.buttonManager.updateAllButtons();
			}
			stopAutoScroll();
			startAutoScroll();
		},
		scrollTo: scrollToIndex,
		next: autoScrollNext,
		pause: stopAutoScroll,
		resume: startAutoScroll,
		destroy: window.destroyAccordion,
		getState: function () {
			return {
				currentIndex: state.currentIndex,
				totalItems: state.totalItems,
				visibleItems: state.visibleItems,
				maxIndex: state.maxIndex,
				isInitialized: state.isInitialized,
				isScrolling: state.isScrolling,
				isHovering: state.isHovering
			};
		}
	};

	console.log( '✅ Аккордеон: модуль загружен' );
	console.log( '💡 Аккордеон: API доступно через window.accordionAPI' );
	console.log( '   scrollTo(index) - прокрутить к индексу' );
	console.log( '   next()          - следующий слайд' );
	console.log( '   pause()         - пауза' );
	console.log( '   resume()        - продолжить' );
	console.log( '   refresh()       - обновить' );
	console.log( '   getState()      - состояние' );
	console.log( '   destroy()       - уничтожить' );

} )();