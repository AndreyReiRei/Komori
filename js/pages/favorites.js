/**
 * ============================================================================
 * СТРАНИЦА ИЗБРАННОГО (favorites.html)
 * ============================================================================
 * 
 * Этот класс управляет всем функционалом на странице избранного
 * 
 * ОПТИМИЗАЦИЯ:
 * - НЕ перерисовывает всю страницу без необходимости
 * - Обновляет только состояние кнопок и счетчики
 * - Использует интеллектуальную проверку реальных изменений
 * - Дебаунс перерисовок для предотвращения множественных обновлений
 * 
 * ============================================================================
 */

class FavoritesPage {
	constructor() {
		/** @type {string} Текущая страница (всегда 'favorites') */
		this.currentPage = 'favorites';

		/** @type {string} Хэш избранных товаров для отслеживания изменений */
		this.favoritesHash = null;

		/** @type {Array} Кэш свойств товаров в избранном */
		this.cachedProducts = null;

		/** @type {number} Таймер для дебаунса перерисовки */
		this.renderDebounceTimer = null;

		/** @type {boolean} Флаг, указывающий, что перерисовка уже запланирована */
		this.isRenderScheduled = false;

		// Инициализация страницы
		this.init();
	}

	// =========================================================================
	// ИНИЦИАЛИЗАЦИЯ
	// =========================================================================

	/**
	 * Главный метод инициализации страницы избранного
	 */
	init() {
		console.log( '❤️ Инициализация страницы избранного...' );

		// Очищаем "битые" ссылки
		store.cleanInvalidReferences();

		// Вычисляем начальный хэш
		this.updateFavoritesHash();

		// Отрисовываем содержимое избранного
		this.render();

		// Привязываем обработчики событий
		this.bindEvents();

		// Рендерим блок рекомендаций (если есть)
		setTimeout( () => this.renderRecommendations(), 100 );

		// Слушаем обновление избранного С УМНОЙ ПРОВЕРКОЙ
		window.addEventListener( 'store:favoritesUpdated', () => {
			this.handleFavoritesUpdated();
		} );

		// Слушаем обновление товаров С УМНОЙ ПРОВЕРКОЙ
		window.addEventListener( 'store:productsUpdated', () => {
			this.handleProductsUpdated();
		} );

		// Слушаем обновление корзины - только обновляем кнопки
		window.addEventListener( 'store:cartUpdated', () => {
			console.log( '🛒 Избранное: корзина обновлена, обновляем кнопки' );
			this.updateCartButtonsState();
			this.updateHeaderCounters();
		} );

		// Обновляем счетчик в шапке
		this.updateHeaderCounters();

		console.log( '✅ Страница избранного инициализирована' );
	}

	// =========================================================================
	// ИНТЕЛЛИГЕНТНАЯ ПРОВЕРКА ИЗМЕНЕНИЙ
	// =========================================================================

	/**
	 * Вычисляет хэш избранных товаров (учитывает ID, количество, цену)
	 * @returns {string} хэш-строка для сравнения
	 */
	computeFavoritesHash() {
		const favorites = store.getFavorites();
		const ids = favorites.map( p => p.id ).join( ',' );
		const quantities = favorites.map( p => `${p.id}:${p.quantity}` ).join( ',' );
		const prices = favorites.map( p => `${p.id}:${p.price}` ).join( ',' );
		const statuses = favorites.map( p => `${p.id}:${p.status}` ).join( ',' );
		return `${favorites.length}_${ids}_${quantities}_${prices}_${statuses}`;
	}

	/**
	 * Обновляет сохраненный хэш
	 */
	updateFavoritesHash() {
		this.favoritesHash = this.computeFavoritesHash();
	}

	/**
	 * Проверяет, изменился ли состав избранного
	 * @returns {boolean} true если изменилось
	 */
	hasFavoritesChanged() {
		const currentHash = this.computeFavoritesHash();
		const hasChanged = currentHash !== this.favoritesHash;

		if ( hasChanged ) {
			console.log( `🔍 Избранное: состав ИЗМЕНИЛСЯ (${this.favoritesHash} → ${currentHash.substring( 0, 50 )}...)` );
			this.favoritesHash = currentHash;
		}

		return hasChanged;
	}

	/**
	 * Проверяет, изменились ли свойства товаров в избранном (цена, наличие, количество)
	 * @returns {boolean} true если изменились
	 */
	hasProductPropertiesChanged() {
		const favorites = store.getFavorites();

		// Если кэша нет, значит нужно обновить
		if ( !this.cachedProducts ) {
			this.cachedProducts = JSON.parse( JSON.stringify( favorites ) );
			return true;
		}

		// Проверяем каждый товар
		for ( const product of favorites ) {
			const cachedVersion = this.cachedProducts.find( p => p.id === product.id );
			if ( !cachedVersion ) {
				// Новый товар в избранном
				console.log( `🔍 Избранное: добавлен новый товар ${product.id}` );
				this.cachedProducts = JSON.parse( JSON.stringify( favorites ) );
				return true;
			}

			if ( cachedVersion.price !== product.price ||
				cachedVersion.status !== product.status ||
				cachedVersion.quantity !== product.quantity ) {
				console.log( `🔍 Избранное: свойства товара ${product.id} изменились (цена/наличие/количество)` );
				this.cachedProducts = JSON.parse( JSON.stringify( favorites ) );
				return true;
			}
		}

		// Проверяем, не был ли удален товар
		if ( this.cachedProducts.length !== favorites.length ) {
			console.log( `🔍 Избранное: количество товаров изменилось (${this.cachedProducts.length} → ${favorites.length})` );
			this.cachedProducts = JSON.parse( JSON.stringify( favorites ) );
			return true;
		}

		return false;
	}

	/**
	 * Обработчик события обновления избранного
	 */
	handleFavoritesUpdated() {
		if ( this.hasFavoritesChanged() ) {
			console.log( `📦 Избранное: состав изменился, планируем перерисовку` );
			this.scheduleRender();
		} else {
			console.log( `📦 Избранное: состав НЕ ИЗМЕНИЛСЯ, перерисовка не требуется` );
			// Но кнопки корзины всё равно нужно обновить
			this.updateCartButtonsState();
			this.updateHeaderCounters();
		}
	}

	/**
	 * Обработчик события обновления товаров
	 */
	handleProductsUpdated() {
		// Проверяем, не относятся ли изменения к товарам в избранном
		const favorites = store.getFavorites();
		const favoriteIds = favorites.map( p => p.id );

		// Проверяем, есть ли изменения в товарах, которые в избранном
		let hasRelevantChanges = false;

		for ( const product of favorites ) {
			const currentProduct = store.getProduct( product.id );
			if ( currentProduct && currentProduct.updatedAt !== product.updatedAt ) {
				hasRelevantChanges = true;
				break;
			}
		}

		if ( hasRelevantChanges || this.hasProductPropertiesChanged() ) {
			console.log( `📦 Избранное: свойства товаров изменились, планируем перерисовку` );
			this.scheduleRender();
		} else {
			console.log( `📦 Избранное: свойства товаров НЕ ИЗМЕНИЛИСЬ, перерисовка не требуется` );
			this.updateCartButtonsState();
			this.updateHeaderCounters();
		}
	}

	/**
	 * Планирует перерисовку с дебаунсом (предотвращает множественные перерисовки)
	 */
	scheduleRender() {
		// Очищаем предыдущий таймер
		if ( this.renderDebounceTimer ) {
			clearTimeout( this.renderDebounceTimer );
		}

		// Устанавливаем новый таймер
		this.renderDebounceTimer = setTimeout( () => {
			console.log( `🔄 Избранное: выполняем перерисовку` );
			this.render();
			this.renderRecommendations();
			this.isRenderScheduled = false;
			this.renderDebounceTimer = null;
		}, 150 );

		if ( !this.isRenderScheduled ) {
			this.isRenderScheduled = true;
			console.log( `⏳ Избранное: перерисовка запланирована` );
		}
	}

	// =========================================================================
	// ОБНОВЛЕНИЕ СОСТОЯНИЯ КНОПОК (БЕЗ ПЕРЕРИСОВКИ)
	// =========================================================================

	/**
	 * Обновляет состояние кнопок "В корзину"
	 */
	updateCartButtonsState() {
		document.querySelectorAll( '.add-to-cart-btn' ).forEach( btn => {
			const productId = btn.dataset.id;
			const product = store.getProduct( productId );

			if ( !product ) return;

			const inCart = store.cart.find( item => item.id == productId );
			const inCartQuantity = inCart ? inCart.quantity : 0;
			const availableQuantity = product.quantity - inCartQuantity;

			const wasDisabled = btn.disabled;
			const shouldBeDisabled = !( product.status === 'in-stock' && availableQuantity > 0 );

			if ( wasDisabled !== shouldBeDisabled ) {
				btn.disabled = shouldBeDisabled;
			}
		} );
	}

	// =========================================================================
	// ОТОБРАЖЕНИЕ ИЗБРАННОГО
	// =========================================================================

	/**
	 * Отрисовывает содержимое избранного
	 */
	render() {
		console.log( '❤️ Рендерим избранное...' );

		const container = document.getElementById( 'favoritesItems' );
		const emptyState = document.getElementById( 'favoritesEmpty' );
		const countElement = document.getElementById( 'favoritesItemsCount' );
		const totalElement = document.getElementById( 'favoritesTotal' );

		const favorites = store.getFavorites();

		console.log( '📦 Товаров в избранном:', favorites.length );

		if ( favorites.length === 0 ) {
			if ( container ) {
				container.style.display = 'none';
				container.innerHTML = '';
			}
			if ( emptyState ) emptyState.style.display = 'block';
			if ( countElement ) countElement.textContent = '0 товаров';
			if ( totalElement ) totalElement.textContent = 'на сумму 0 ₽';

			this.updateFavoritesHash();
			return;
		}

		if ( container ) {
			container.style.display = 'grid';
			container.innerHTML = favorites.map( product => this.renderFavoriteCard( product ) ).join( '' );
		}
		if ( emptyState ) emptyState.style.display = 'none';

		const total = favorites.reduce( ( sum, item ) => sum + item.price, 0 );
		const count = favorites.length;

		if ( countElement ) {
			countElement.textContent = this.getDeclension( count, ['товар', 'товара', 'товаров'] );
		}
		if ( totalElement ) {
			totalElement.textContent = `на сумму ${API.formatPrice( total )}`;
		}

		this.updateHeaderCounters();
		this.updateFavoritesHash();

		// Сохраняем кэш свойств товаров для будущих сравнений
		this.cachedProducts = JSON.parse( JSON.stringify( favorites ) );
	}

	/**
	 * Отрисовка карточки избранного товара
	 * @param {Object} product - полный объект товара
	 * @returns {string} HTML-код карточки
	 */
	renderFavoriteCard( product ) {
		const inCart = store.cart.find( item => item.id == product.id );
		const inCartQuantity = inCart ? inCart.quantity : 0;
		const availableQuantity = product.quantity - inCartQuantity;

		const categoryUrl = store.getCategoryUrl( product.category );

		let stockClass = 'in-stock';
		let stockText = 'В наличии';
		let stockIcon = 'fa-check-circle';

		if ( product.status !== 'in-stock' || product.quantity <= 0 ) {
			stockClass = 'out-of-stock';
			stockText = 'Нет в наличии';
			stockIcon = 'fa-times-circle';
		} else if ( product.quantity <= 3 ) {
			stockClass = 'low-stock';
			stockText = 'Осталось мало';
			stockIcon = 'fa-exclamation-triangle';
		}

		let badges = '';
		if ( product.isNew ) badges += '<span class="badge new">Новинка</span>';
		if ( product.isHit ) badges += '<span class="badge hit">Хит</span>';
		if ( product.oldPrice ) {
			const discount = Math.round( ( 1 - product.price / product.oldPrice ) * 100 );
			if ( discount > 0 ) badges += `<span class="badge sale">-${discount}%</span>`;
		}

		return `
			<div class="favorite-item" data-id="${product.id}">
				${badges ? `<div class="favorite-item-badges">${badges}</div>` : ''}
				
				<button class="remove-favorite" data-id="${product.id}" title="Удалить из избранного">
					<i class="fas fa-times"></i>
				</button>
				
				<a href="${categoryUrl}" class="favorite-item-link">
					<img src="${API.getSafeImageUrl( product.image )}" 
						 alt="${product.name}" 
						 class="favorite-item-image"
						 onerror="this.src='${API.getFallbackSvg( product.name )}'">
				</a>
				
				<div class="favorite-item-info">
					<div class="favorite-item-category">
						<a href="${categoryUrl}">${store.getCategoryName( product.category )}</a>
					</div>
					<h3 class="favorite-item-title">
						<a href="${categoryUrl}">${product.name}</a>
					</h3>
					<div class="favorite-item-prices">
						<span class="favorite-item-price">${API.formatPrice( product.price )}</span>
						${product.oldPrice ? `<span class="favorite-item-old-price">${API.formatPrice( product.oldPrice )}</span>` : ''}
					</div>
					<div class="favorite-item-stock ${stockClass}">
						<i class="fas ${stockIcon}"></i>
						<span>${stockText}</span>
					</div>
				</div>
				
				<div class="favorite-item-actions">
					<button class="add-to-cart-btn" data-id="${product.id}"
							${product.status !== 'in-stock' || availableQuantity <= 0 ? 'disabled' : ''}>
						<i class="fas fa-shopping-cart"></i> В корзину
					</button>
				</div>
			</div>
		`;
	}

	// =========================================================================
	// ОБРАБОТЧИКИ СОБЫТИЙ
	// =========================================================================

	/**
	 * Привязывает обработчики событий для избранного
	 */
	bindEvents() {
		console.log( '🔗 Привязка событий избранного...' );

		// Используем делегирование событий (один обработчик на document)
		if ( this.documentClickHandler ) {
			document.removeEventListener( 'click', this.documentClickHandler );
		}

		this.documentClickHandler = ( e ) => {
			// УДАЛЕНИЕ ИЗ ИЗБРАННОГО
			const removeBtn = e.target.closest( '.remove-favorite' );
			if ( removeBtn ) {
				e.preventDefault();
				e.stopPropagation();
				const id = removeBtn.dataset.id;
				const card = removeBtn.closest( '.favorite-item' );

				if ( card ) {
					card.style.transition = 'all 0.3s ease';
					card.style.opacity = '0';
					card.style.transform = 'scale(0.8)';
					setTimeout( () => {
						store.toggleFavorite( id );
					}, 300 );
				} else {
					store.toggleFavorite( id );
				}
				return;
			}

			// ДОБАВЛЕНИЕ В КОРЗИНУ
			const addToCartBtn = e.target.closest( '.add-to-cart-btn' );
			if ( addToCartBtn ) {
				e.preventDefault();
				e.stopPropagation();
				const id = addToCartBtn.dataset.id;

				if ( store.addToCart( id ) ) {
					API.showNotification( '✅ Товар добавлен в корзину' );

					// Визуальный эффект (без перерисовки!)
					const originalText = addToCartBtn.innerHTML;
					addToCartBtn.innerHTML = '<i class="fas fa-check"></i> Добавлено';
					addToCartBtn.style.background = '#2ecc71';

					setTimeout( () => {
						addToCartBtn.innerHTML = originalText;
						addToCartBtn.style.background = '';
						this.updateCartButtonsState();
					}, 2000 );

					this.updateHeaderCounters();
				} else {
					API.showNotification( '❌ Не удалось добавить товар', 'error' );
				}
				return;
			}
		};

		document.addEventListener( 'click', this.documentClickHandler );

		// ОЧИСТКА ИЗБРАННОГО
		const clearBtn = document.getElementById( 'clearFavoritesBtn' );
		if ( clearBtn ) {
			clearBtn.removeEventListener( 'click', this.handleClearFavorites );
			this.handleClearFavorites = ( e ) => {
				e.preventDefault();
				if ( confirm( '❤️ Вы уверены, что хотите очистить избранное?' ) ) {
					// Анимация удаления всех карточек
					const cards = document.querySelectorAll( '.favorite-item' );
					cards.forEach( ( card, index ) => {
						setTimeout( () => {
							card.style.transition = 'all 0.3s ease';
							card.style.opacity = '0';
							card.style.transform = 'scale(0.8)';
						}, index * 100 );
					} );

					setTimeout( () => {
						store.favorites = [];
						store.saveToStorage();
						API.showNotification( 'Избранное очищено' );
						this.render();
						this.renderRecommendations();
					}, cards.length * 100 + 300 );
				}
			};
			clearBtn.addEventListener( 'click', this.handleClearFavorites );
		}

		// КОПИРОВАНИЕ СПИСКА
		const copyLinkBtn = document.getElementById( 'copyFavoritesLink' );
		if ( copyLinkBtn ) {
			copyLinkBtn.removeEventListener( 'click', this.handleCopyLink );
			this.handleCopyLink = ( e ) => {
				e.preventDefault();
				const favorites = store.getFavorites();

				if ( favorites.length === 0 ) {
					API.showNotification( 'Избранное пусто', 'error' );
					return;
				}

				const text = favorites.map( item =>
					`${item.name} - ${API.formatPrice( item.price )}`
				).join( '\n' );

				navigator.clipboard.writeText( text ).then( () => {
					API.showNotification( '📋 Список скопирован' );
					const originalHtml = copyLinkBtn.innerHTML;
					copyLinkBtn.innerHTML = '<i class="fas fa-check"></i>';
					setTimeout( () => {
						copyLinkBtn.innerHTML = originalHtml;
					}, 2000 );
				} ).catch( () => {
					API.showNotification( 'Ошибка копирования', 'error' );
				} );
			};
			copyLinkBtn.addEventListener( 'click', this.handleCopyLink );
		}

		// ПОДЕЛИТЬСЯ В СОЦСЕТЯХ
		const shareVk = document.getElementById( 'shareVk' );
		if ( shareVk ) {
			shareVk.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				this.shareToSocial( 'vk' );
			} );
		}

		const shareTelegram = document.getElementById( 'shareTelegram' );
		if ( shareTelegram ) {
			shareTelegram.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				this.shareToSocial( 'telegram' );
			} );
		}

		const shareWhatsapp = document.getElementById( 'shareWhatsapp' );
		if ( shareWhatsapp ) {
			shareWhatsapp.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				this.shareToSocial( 'whatsapp' );
			} );
		}
	}

	/**
	 * Поделиться в социальной сети
	 * @param {string} network - соцсеть ('vk', 'telegram', 'whatsapp')
	 */
	shareToSocial( network ) {
		const favorites = store.getFavorites();

		if ( favorites.length === 0 ) {
			API.showNotification( 'Избранное пусто', 'error' );
			return;
		}

		const text = `Мои избранные товары из магазина Комори:\n${favorites.map( item =>
			`${item.name} - ${API.formatPrice( item.price )}`
		).join( '\n' )}`;

		const url = window.location.href;
		let shareUrl = '';

		switch ( network ) {
			case 'vk':
				shareUrl = `https://vk.com/share.php?url=${encodeURIComponent( url )}&title=${encodeURIComponent( text )}`;
				break;
			case 'telegram':
				shareUrl = `https://t.me/share/url?url=${encodeURIComponent( url )}&text=${encodeURIComponent( text )}`;
				break;
			case 'whatsapp':
				shareUrl = `https://wa.me/?text=${encodeURIComponent( text + ' ' + url )}`;
				break;
		}

		if ( shareUrl ) {
			window.open( shareUrl, '_blank', 'width=600,height=400' );
		}
	}

	// =========================================================================
	// РЕКОМЕНДАЦИИ
	// =========================================================================

	/**
	 * Рендерит блок рекомендаций
	 */
	renderRecommendations() {
		let grid = document.getElementById( 'recommendationsGrid' );

		if ( !grid ) {
			const container = document.getElementById( 'favoritesRecommendations' );
			if ( container ) {
				grid = container.querySelector( '.recommendations-grid' );
			}
		}

		if ( !grid ) {
			console.log( '⚠️ Контейнер для рекомендаций не найден' );
			return;
		}

		const allProducts = store.products;
		const favorites = store.favorites;

		let recommendations = allProducts
			.filter( p => {
				if ( p.status !== 'in-stock' || p.quantity <= 0 ) return false;
				if ( favorites.includes( p.id ) ) return false;
				return true;
			} )
			.sort( () => 0.5 - Math.random() )
			.slice( 0, 4 );

		if ( recommendations.length < 4 ) {
			const popularProducts = allProducts.filter( p => {
				if ( p.status !== 'in-stock' || p.quantity <= 0 ) return false;
				if ( recommendations.includes( p ) ) return false;
				if ( favorites.includes( p.id ) ) return false;
				return p.isHit || p.isNew;
			} );

			const needed = 4 - recommendations.length;
			const additional = popularProducts.sort( () => 0.5 - Math.random() ).slice( 0, needed );
			recommendations = [...recommendations, ...additional];
		}

		if ( recommendations.length === 0 ) {
			grid.innerHTML = '<div class="no-recommendations"><p>😊 Пока нет рекомендаций</p></div>';
			return;
		}

		grid.innerHTML = recommendations.map( product => this.renderRecommendationCard( product ) ).join( '' );
		this.attachRecommendationEvents();
	}

	/**
	 * Отрисовка карточки рекомендации
	 * @param {Object} product - товар
	 * @returns {string} HTML-код карточки
	 */
	renderRecommendationCard( product ) {
		const categoryUrl = store.getCategoryUrl( product.category );

		return `
			<div class="recommendation-item" data-id="${product.id}">
				<a href="${categoryUrl}" class="recommendation-link">
					<img src="${API.getSafeImageUrl( product.image )}" 
						alt="${product.name}" 
						class="recommendation-image"
						loading="lazy"
						onerror="this.src='${API.getFallbackSvg( product.name )}'">
				</a>
				<div class="recommendation-content">
					<h4 class="recommendation-name">
						<a href="${categoryUrl}">${product.name}</a>
					</h4>
					<div class="recommendation-price">${API.formatPrice( product.price )}</div>
					<button class="recommendation-add add-to-favorites" data-id="${product.id}">
						<i class="fas fa-heart"></i> В избранное
					</button>
				</div>
			</div>
		`;
	}

	/**
	 * Прикрепляет обработчики к кнопкам рекомендаций
	 */
	attachRecommendationEvents() {
		document.querySelectorAll( '.recommendation-add.add-to-favorites' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleRecommendationAdd );
			this.handleRecommendationAdd = ( e ) => {
				e.preventDefault();
				const id = e.currentTarget.dataset.id;
				const isFavorite = store.toggleFavorite( id );

				API.showNotification( isFavorite ? '✅ Добавлено в избранное' : '❌ Удалено из избранного' );

				const originalHTML = e.currentTarget.innerHTML;
				e.currentTarget.innerHTML = '<i class="fas fa-check"></i> Добавлено';
				e.currentTarget.style.background = '#2ecc71';
				e.currentTarget.style.color = 'white';

				setTimeout( () => {
					e.currentTarget.innerHTML = originalHTML;
					e.currentTarget.style.background = '';
					e.currentTarget.style.color = '';
					this.renderRecommendations();
					this.render();
				}, 1500 );

				this.updateHeaderCounters();
			};
			btn.addEventListener( 'click', this.handleRecommendationAdd );
		} );
	}

	// =========================================================================
	// ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
	// =========================================================================

	/**
	 * Обновляет счетчики в шапке сайта
	 */
	updateHeaderCounters() {
		const cartCount = document.getElementById( 'cartCount' );
		const favoritesCount = document.getElementById( 'favoritesCount' );

		if ( cartCount ) {
			cartCount.textContent = store.getCartCount();
		}
		if ( favoritesCount ) {
			favoritesCount.textContent = store.favorites.length;
		}
	}

	/**
	 * Склонение слов (1 товар, 2 товара, 5 товаров)
	 * @param {number} number - число
	 * @param {Array} words - варианты слов ['товар', 'товара', 'товаров']
	 * @returns {string} правильная форма
	 */
	getDeclension( number, words ) {
		const cases = [2, 0, 1, 1, 1, 2];
		const index = ( number % 100 > 4 && number % 100 < 20 ) ? 2 : cases[Math.min( number % 10, 5 )];
		return `${number} ${words[index]}`;
	}
}

// =========================================================================
// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
// =========================================================================

document.addEventListener( 'DOMContentLoaded', () => {
	if ( document.querySelector( '.favorites-page-content' ) ) {
		window.favoritesPage = new FavoritesPage();
		console.log( '✅ Страница избранного инициализирована' );
	}
} );