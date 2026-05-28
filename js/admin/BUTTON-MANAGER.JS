/**
 * ============================================================================
 * BUTTON-MANAGER.JS - ОБЩИЙ МОДУЛЬ УПРАВЛЕНИЯ КНОПКАМИ
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * - Единый обработчик кликов по кнопкам "В корзину" и "Избранное"
 * - Делегирование событий через document
 * - Обновление состояния всех кнопок при изменениях в store
 * - Визуальная обратная связь при добавлении в корзину/избранное
 * - Работает на ВСЕХ страницах независимо от контекста
 * 
 * ПОДКЛЮЧЕНИЕ:
 * - Подключается первым, до всех остальных модулей
 * - Не зависит от аккордеона или каталога
 * - Автоматически находит все карточки через делегирование
 * 
 * ============================================================================
 */

class ButtonManager {
	constructor() {
		// Проверяем наличие необходимых зависимостей
		if ( !window.store || !window.API ) {
			console.error( '🔘 ButtonManager: отсутствуют store или API' );
			return;
		}

		/** @type {Function|null} Обработчик делегирования кликов */
		this._clickHandler = null;

		/** @type {Object} Кэш для оптимизации */
		this._cache = {
			categoryUrls: {},
			lastUpdate: 0
		};

		/** @type {boolean} Флаг инициализации */
		this.isInitialized = false;

		this.init();
	}

	// =========================================================================
	// ИНИЦИАЛИЗАЦИЯ
	// =========================================================================

	/**
	 * Инициализирует менеджер кнопок
	 */
	init() {
		try {
			console.log( '🔘 ButtonManager: инициализация...' );

			// Настраиваем делегирование кликов
			this._setupClickDelegation();

			// Подписываемся на события store
			this._setupStoreListeners();

			// Наблюдаем за появлением новых карточек
			this._observeNewCards();

			// Обновляем начальное состояние кнопок
			setTimeout( () => {
				this.updateAllButtons();
			}, 100 );

			this.isInitialized = true;
			console.log( '✅ ButtonManager: инициализирован' );
		} catch ( error ) {
			console.error( '🔘 ButtonManager: ошибка при инициализации', error );
		}
	}

	// =========================================================================
	// ДЕЛЕГИРОВАНИЕ СОБЫТИЙ
	// =========================================================================

	/**
	 * Настраивает делегирование кликов через document
	 * @private
	 */
	_setupClickDelegation() {
		// Удаляем старый обработчик если есть
		if ( this._clickHandler ) {
			document.removeEventListener( 'click', this._clickHandler );
		}

		this._clickHandler = ( e ) => {
			try {
				// Кнопка "В корзину"
				const cartBtn = e.target.closest( '.add-to-cart' );
				if ( cartBtn && !cartBtn.disabled ) {
					e.preventDefault();
					e.stopPropagation();
					this._handleAddToCart( cartBtn );
					return;
				}

				// Кнопка "Избранное"
				const favBtn = e.target.closest( '.favorite-btn' );
				if ( favBtn ) {
					e.preventDefault();
					e.stopPropagation();
					this._handleToggleFavorite( favBtn );
					return;
				}

				// Клик по карточке (переход по ссылке)
				const cardLink = e.target.closest( '.product-card-link' );
				if ( cardLink && !e.target.closest( '.product-actions' ) ) {
					// Не блокируем навигацию, позволяем ссылке работать
					console.log( '🔘 ButtonManager: переход по ссылке товара' );
				}
			} catch ( error ) {
				console.error( '🔘 ButtonManager: ошибка в обработчике клика', error );
			}
		};

		document.addEventListener( 'click', this._clickHandler );
		console.log( '🔘 ButtonManager: делегирование кликов настроено' );
	}

	// =========================================================================
	// СЛУШАТЕЛИ STORE
	// =========================================================================

	/**
	 * Подписывается на события изменения store
	 * @private
	 */
	_setupStoreListeners() {
		// Сохраняем ссылки для возможности отписки
		this._storeHandlers = {
			cartUpdated: () => {
				console.log( '🔘 ButtonManager: корзина обновлена' );
				this.updateAllCartButtons();
				if ( window.API.updateHeaderCounters ) {
					window.API.updateHeaderCounters();
				}
			},
			favoritesUpdated: () => {
				console.log( '🔘 ButtonManager: избранное обновлено' );
				this.updateAllFavoriteButtons();
				if ( window.API.updateHeaderCounters ) {
					window.API.updateHeaderCounters();
				}
			},
			productsUpdated: () => {
				console.log( '🔘 ButtonManager: товары обновлены' );
				// Небольшая задержка для гарантии рендеринга новых карточек
				setTimeout( () => {
					this.updateAllButtons();
				}, 50 );
			}
		};

		// Подписываемся
		window.addEventListener( 'store:cartUpdated', this._storeHandlers.cartUpdated );
		window.addEventListener( 'store:favoritesUpdated', this._storeHandlers.favoritesUpdated );
		window.addEventListener( 'store:productsUpdated', this._storeHandlers.productsUpdated );

		console.log( '🔘 ButtonManager: слушатели store настроены' );
	}

	// =========================================================================
	// НАБЛЮДАТЕЛЬ ЗА DOM
	// =========================================================================

	/**
	 * Наблюдает за появлением новых карточек в DOM
	 * @private
	 */
	_observeNewCards() {
		// Отключаем предыдущий наблюдатель если есть
		if ( this._observer ) {
			this._observer.disconnect();
		}

		this._observer = new MutationObserver( ( mutations ) => {
			try {
				let hasNewCards = false;

				for ( const mutation of mutations ) {
					if ( mutation.type === 'childList' && mutation.addedNodes.length > 0 ) {
						for ( const node of mutation.addedNodes ) {
							if ( node.nodeType === 1 ) {
								// Проверяем, является ли узел карточкой или содержит карточки
								if ( node.classList?.contains( 'product-card' ) ||
									node.querySelector?.( '.product-card' ) ) {
									hasNewCards = true;
									break;
								}
							}
						}
					}
					if ( hasNewCards ) break;
				}

				if ( hasNewCards ) {
					console.log( '🔘 ButtonManager: обнаружены новые карточки' );
					// Debounce для предотвращения частых обновлений
					clearTimeout( this._updateTimeout );
					this._updateTimeout = setTimeout( () => {
						this.updateAllButtons();
					}, 100 );
				}
			} catch ( error ) {
				console.error( '🔘 ButtonManager: ошибка в наблюдателе DOM', error );
			}
		} );

		this._observer.observe( document.body, {
			childList: true,
			subtree: true
		} );

		console.log( '🔘 ButtonManager: наблюдатель DOM запущен' );
	}

	// =========================================================================
	// ОБРАБОТЧИКИ КЛИКОВ
	// =========================================================================

	/**
	 * Обрабатывает добавление товара в корзину
	 * @param {HTMLElement} btn - кнопка "В корзину"
	 * @private
	 */
	_handleAddToCart( btn ) {
		try {
			const productId = btn.dataset.id;
			if ( !productId ) {
				console.warn( '🔘 ButtonManager: отсутствует ID товара' );
				return;
			}

			if ( !window.store.addToCart ) {
				console.error( '🔘 ButtonManager: метод addToCart не найден' );
				return;
			}

			// Пытаемся добавить в корзину
			const result = window.store.addToCart( productId );

			if ( result ) {
				// Визуальная обратная связь
				this._showAddToCartFeedback( btn );

				// Показываем уведомление
				if ( window.API.showNotification ) {
					window.API.showNotification( '✅ Товар добавлен в корзину', 'success' );
				}

				// Обновляем счетчики в шапке
				if ( window.API.updateHeaderCounters ) {
					window.API.updateHeaderCounters();
				}

				// Обновляем состояние всех кнопок
				this.updateAllCartButtons();
			} else {
				if ( window.API.showNotification ) {
					window.API.showNotification( '❌ Не удалось добавить товар в корзину', 'error' );
				}
			}
		} catch ( error ) {
			console.error( '🔘 ButtonManager: ошибка при добавлении в корзину', error );
			if ( window.API.showNotification ) {
				window.API.showNotification( '❌ Произошла ошибка', 'error' );
			}
		}
	}

	/**
	 * Показывает визуальную обратную связь при добавлении в корзину
	 * @param {HTMLElement} btn - кнопка
	 * @private
	 */
	_showAddToCartFeedback( btn ) {
		// Сохраняем оригинальное состояние
		const originalHTML = btn.innerHTML;
		const originalBackground = btn.style.background;
		const wasDisabled = btn.disabled;

		// Показываем успех
		btn.innerHTML = '<i class="fas fa-check"></i> Добавлено';
		btn.style.background = '#2ecc71';
		btn.disabled = true;

		// Возвращаем исходное состояние через 2 секунды
		setTimeout( () => {
			btn.innerHTML = originalHTML;
			btn.style.background = originalBackground;
			btn.disabled = wasDisabled;
		}, 2000 );
	}

	/**
	 * Обрабатывает переключение избранного
	 * @param {HTMLElement} btn - кнопка избранного
	 * @private
	 */
	_handleToggleFavorite( btn ) {
		try {
			const productId = btn.dataset.id;
			if ( !productId ) {
				console.warn( '🔘 ButtonManager: отсутствует ID товара' );
				return;
			}

			if ( !window.store.toggleFavorite ) {
				console.error( '🔘 ButtonManager: метод toggleFavorite не найден' );
				return;
			}

			// Переключаем избранное
			const isFavorite = window.store.toggleFavorite( productId );

			// Обновляем внешний вид кнопки
			this._updateFavoriteButtonAppearance( btn, isFavorite );

			// Показываем уведомление
			if ( window.API.showNotification ) {
				const message = isFavorite ?
					'❤️ Товар добавлен в избранное' :
					'💔 Товар удален из избранного';
				window.API.showNotification( message, 'success' );
			}

			// Обновляем счетчики в шапке
			if ( window.API.updateHeaderCounters ) {
				window.API.updateHeaderCounters();
			}

			// Обновляем все кнопки избранного для этого товара
			this.updateAllFavoriteButtons();
		} catch ( error ) {
			console.error( '🔘 ButtonManager: ошибка при переключении избранного', error );
			if ( window.API.showNotification ) {
				window.API.showNotification( '❌ Произошла ошибка', 'error' );
			}
		}
	}

	// =========================================================================
	// ОБНОВЛЕНИЕ СОСТОЯНИЯ КНОПОК
	// =========================================================================

	/**
	 * Обновляет состояние всех кнопок на странице
	 */
	updateAllButtons() {
		this.updateAllCartButtons();
		this.updateAllFavoriteButtons();
	}

	/**
	 * Обновляет состояние всех кнопок "В корзину"
	 */
	updateAllCartButtons() {
		try {
			const buttons = document.querySelectorAll( '.add-to-cart' );
			let updatedCount = 0;

			buttons.forEach( btn => {
				if ( this._updateSingleCartButton( btn ) ) {
					updatedCount++;
				}
			} );

			if ( updatedCount > 0 ) {
				console.log( `🔘 ButtonManager: обновлено ${updatedCount} кнопок корзины` );
			}
		} catch ( error ) {
			console.error( '🔘 ButtonManager: ошибка при обновлении кнопок корзины', error );
		}
	}

	/**
	 * Обновляет состояние одной кнопки "В корзину"
	 * @param {HTMLElement} btn - кнопка
	 * @returns {boolean} true если кнопка была обновлена
	 * @private
	 */
	_updateSingleCartButton( btn ) {
		try {
			const productId = btn.dataset.id;
			if ( !productId ) return false;

			const product = window.store.getProduct ?
				window.store.getProduct( productId ) :
				null;
			if ( !product ) return false;

			const inCart = window.store.cart ?
				window.store.cart.find( item => item.id == productId ) :
				null;
			const inCartQuantity = inCart ? inCart.quantity : 0;
			const availableQuantity = ( product.quantity || 0 ) - inCartQuantity;
			const isInStock = product.status === 'in-stock' && availableQuantity > 0;

			// Обновляем состояние кнопки
			const wasDisabled = btn.disabled;
			btn.disabled = !isInStock;

			// Обновляем подсказку
			if ( !isInStock ) {
				btn.title = product.status !== 'in-stock' ?
					'Товар отсутствует' :
					'Достигнут лимит заказа';
			} else {
				btn.title = 'Добавить в корзину';
			}

			return wasDisabled !== btn.disabled;
		} catch ( error ) {
			console.error( '🔘 ButtonManager: ошибка при обновлении кнопки корзины', error );
			return false;
		}
	}

	/**
	 * Обновляет состояние всех кнопок "Избранное"
	 */
	updateAllFavoriteButtons() {
		try {
			const buttons = document.querySelectorAll( '.favorite-btn' );
			let updatedCount = 0;

			buttons.forEach( btn => {
				if ( this._updateSingleFavoriteButton( btn ) ) {
					updatedCount++;
				}
			} );

			if ( updatedCount > 0 ) {
				console.log( `🔘 ButtonManager: обновлено ${updatedCount} кнопок избранного` );
			}
		} catch ( error ) {
			console.error( '🔘 ButtonManager: ошибка при обновлении кнопок избранного', error );
		}
	}

	/**
	 * Обновляет состояние одной кнопки "Избранное"
	 * @param {HTMLElement} btn - кнопка
	 * @returns {boolean} true если кнопка была обновлена
	 * @private
	 */
	_updateSingleFavoriteButton( btn ) {
		try {
			const productId = btn.dataset.id;
			if ( !productId ) return false;

			const isFavorite = window.store.isFavorite ?
				window.store.isFavorite( productId ) :
				false;

			const wasActive = btn.classList.contains( 'active' );

			// Обновляем внешний вид
			this._updateFavoriteButtonAppearance( btn, isFavorite );

			return wasActive !== isFavorite;
		} catch ( error ) {
			console.error( '🔘 ButtonManager: ошибка при обновлении кнопки избранного', error );
			return false;
		}
	}

	/**
	 * Обновляет внешний вид кнопки избранного
	 * @param {HTMLElement} btn - кнопка
	 * @param {boolean} isFavorite - флаг избранного
	 * @private
	 */
	_updateFavoriteButtonAppearance( btn, isFavorite ) {
		// Обновляем класс active
		btn.classList.toggle( 'active', isFavorite );

		// Обновляем иконку
		const icon = btn.querySelector( 'i' );
		if ( icon ) {
			if ( isFavorite ) {
				icon.classList.remove( 'far' );
				icon.classList.add( 'fas' );
			} else {
				icon.classList.remove( 'fas' );
				icon.classList.add( 'far' );
			}
		}

		// Обновляем подсказку
		btn.title = isFavorite ? 'Убрать из избранного' : 'Добавить в избранное';
	}

	// =========================================================================
	// ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
	// =========================================================================

	/**
	 * Экранирует HTML-спецсимволы
	 * @param {string} str - строка для экранирования
	 * @returns {string} экранированная строка
	 */
	escapeHtml( str ) {
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
	 * Очищает ресурсы при уничтожении
	 */
	destroy() {
		console.log( '🔘 ButtonManager: очистка ресурсов...' );

		// Удаляем обработчик кликов
		if ( this._clickHandler ) {
			document.removeEventListener( 'click', this._clickHandler );
			this._clickHandler = null;
		}

		// Отписываемся от событий store
		if ( this._storeHandlers ) {
			window.removeEventListener( 'store:cartUpdated', this._storeHandlers.cartUpdated );
			window.removeEventListener( 'store:favoritesUpdated', this._storeHandlers.favoritesUpdated );
			window.removeEventListener( 'store:productsUpdated', this._storeHandlers.productsUpdated );
			this._storeHandlers = null;
		}

		// Отключаем наблюдатель DOM
		if ( this._observer ) {
			this._observer.disconnect();
			this._observer = null;
		}

		// Очищаем таймеры
		if ( this._updateTimeout ) {
			clearTimeout( this._updateTimeout );
			this._updateTimeout = null;
		}

		// Очищаем кэш
		this._cache = {
			categoryUrls: {},
			lastUpdate: 0
		};

		this.isInitialized = false;
		console.log( '✅ ButtonManager: ресурсы очищены' );
	}
}

// =========================================================================
// ИНИЦИАЛИЗАЦИЯ
// =========================================================================

// Создаем глобальный экземпляр при загрузке DOM
document.addEventListener( 'DOMContentLoaded', () => {
	try {
		if ( !window.buttonManager ) {
			window.buttonManager = new ButtonManager();
			console.log( '✅ ButtonManager: глобальный экземпляр создан' );
		}
	} catch ( error ) {
		console.error( '🔘 ButtonManager: критическая ошибка при создании', error );
	}
} );

// Экспорт для модульных систем
if ( typeof module !== 'undefined' && module.exports ) {
	module.exports = ButtonManager;
}