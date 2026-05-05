/**
 * ============================================================================
 * СТРАНИЦА ИЗБРАННОГО (favorites.html)
 * ============================================================================
 * 
 * Этот класс управляет всем функционалом на странице избранного:
 * 
 * 1. ОТОБРАЖЕНИЕ:
 *    - Список избранных товаров
 *    - Количество товаров в избранном
 *    - Общая сумма избранных товаров
 * 
 * 2. УПРАВЛЕНИЕ:
 *    - Удаление отдельных товаров из избранного
 *    - Очистка всего избранного
 *    - Добавление товаров в корзину прямо из избранного
 * 
 * 3. СОЦИАЛЬНЫЕ ФУНКЦИИ:
 *    - Копирование списка избранного
 *    - Поделиться в ВКонтакте
 *    - Поделиться в Telegram
 *    - Поделиться в WhatsApp
 * 
 * 4. РЕКОМЕНДАЦИИ:
 *    - Отображение похожих товаров
 *    - Добавление рекомендаций в избранное
 * 
 * ============================================================================
 */

class FavoritesPage {
	constructor() {
		// Текущая страница (всегда 'favorites')
		this.currentPage = 'favorites';

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

		// Очищаем "битые" ссылки (товары, которые удалены из каталога)
		store.cleanInvalidReferences();

		// Отрисовываем содержимое избранного
		this.render();

		// Привязываем обработчики событий
		this.bindEvents();

		// Рендерим блок рекомендаций
		setTimeout( () => this.renderRecommendations(), 100 );

		// Слушаем обновление избранного (из других мест сайта)
		window.addEventListener( 'store:favoritesUpdated', () => {
			console.log( '🔄 Избранное обновлено, перерисовываем...' );
			this.render();
			this.renderRecommendations();
			this.updateHeaderCounters();
		} );

		// Слушаем обновление товаров (добавление/удаление из админки)
		window.addEventListener( 'store:productsUpdated', () => {
			console.log( '🔄 Товары обновлены, очищаем битые ссылки...' );
			store.cleanInvalidReferences();
			this.render();
			this.renderRecommendations();
		} );

		// Обновляем счетчик в шапке
		this.updateHeaderCounters();

		console.log( '✅ Страница избранного инициализирована' );
	}

	// =========================================================================
	// ОТОБРАЖЕНИЕ ИЗБРАННОГО
	// =========================================================================

	/**
	 * Отрисовывает содержимое избранного
	 */
	render() {
		console.log( '❤️ Рендерим избранное...' );

		// Получаем DOM-элементы
		const container = document.getElementById( 'favoritesItems' );
		const emptyState = document.getElementById( 'favoritesEmpty' );
		const countElement = document.getElementById( 'favoritesItemsCount' );
		const totalElement = document.getElementById( 'favoritesTotal' );

		// Получаем избранные товары из store
		const favorites = store.getFavorites();

		console.log( '📦 Товаров в избранном:', favorites.length );

		// Если избранное пусто
		if ( favorites.length === 0 ) {
			if ( container ) {
				container.style.display = 'none';
				container.innerHTML = '';
			}
			if ( emptyState ) emptyState.style.display = 'block';
			if ( countElement ) countElement.textContent = '0 товаров';
			if ( totalElement ) totalElement.textContent = 'на сумму 0 ₽';
			return;
		}

		// Показываем товары
		if ( container ) {
			container.style.display = 'grid';
			container.innerHTML = favorites.map( product => this.renderFavoriteCard( product ) ).join( '' );
		}
		if ( emptyState ) emptyState.style.display = 'none';

		// Рассчитываем общую сумму
		const total = favorites.reduce( ( sum, item ) => sum + item.price, 0 );
		const count = favorites.length;

		// Обновляем информацию
		if ( countElement ) {
			countElement.textContent = this.getDeclension( count, ['товар', 'товара', 'товаров'] );
		}
		if ( totalElement ) {
			totalElement.textContent = `на сумму ${API.formatPrice( total )}`;
		}

		// Обновляем счетчик в шапке
		this.updateHeaderCounters();
	}

	/**
	 * Отрисовка карточки избранного товара
	 * @param {Object} product - полный объект товара
	 * @returns {string} HTML-код карточки
	 */
	renderFavoriteCard( product ) {
		// Проверяем, есть ли товар в корзине
		const inCart = store.cart.find( item => item.id == product.id );
		const inCartQuantity = inCart ? inCart.quantity : 0;
		const availableQuantity = product.quantity - inCartQuantity;

		// Получаем ссылку на страницу категории
		const categoryUrl = store.getCategoryUrl( product.category );

		// Определяем статус наличия товара
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

		// Формируем бейджи (Новинка, Хит, Скидка)
		let badges = '';
		if ( product.isNew ) badges += '<span class="badge new">Новинка</span>';
		if ( product.isHit ) badges += '<span class="badge hit">Хит</span>';
		if ( product.oldPrice ) {
			const discount = Math.round( ( 1 - product.price / product.oldPrice ) * 100 );
			if ( discount > 0 ) badges += `<span class="badge sale">-${discount}%</span>`;
		}

		return `
			<div class="favorite-item" data-id="${product.id}">
				<!-- Бейджи товара -->
				${badges ? `<div class="favorite-item-badges">${badges}</div>` : ''}
				
				<!-- Кнопка удаления из избранного -->
				<button class="remove-favorite" data-id="${product.id}" title="Удалить из избранного">
					<i class="fas fa-times"></i>
				</button>
				
				<!-- Ссылка на изображение ведет на страницу категории -->
				<a href="${categoryUrl}" class="favorite-item-link">
					<img src="${API.getSafeImageUrl( product.image )}" 
						 alt="${product.name}" 
						 class="favorite-item-image"
						 onerror="this.src='${API.getFallbackSvg( product.name )}'">
				</a>
				
				<!-- Информация о товаре -->
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
				
				<!-- Кнопка добавления в корзину -->
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

		// ===== УДАЛЕНИЕ ИЗ ИЗБРАННОГО =====
		document.querySelectorAll( '.remove-favorite' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleRemoveFavorite );
			this.handleRemoveFavorite = ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				const id = e.currentTarget.dataset.id;
				const card = e.currentTarget.closest( '.favorite-item' );

				// Анимация удаления
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
			};
			btn.addEventListener( 'click', this.handleRemoveFavorite );
		} );

		// ===== ДОБАВЛЕНИЕ В КОРЗИНУ ИЗ ИЗБРАННОГО =====
		document.querySelectorAll( '.add-to-cart-btn' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleAddToCart );
			this.handleAddToCart = ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				const id = e.currentTarget.dataset.id;

				if ( store.addToCart( id ) ) {
					API.showNotification( '✅ Товар добавлен в корзину' );

					// Визуальный эффект на кнопке
					const originalText = e.currentTarget.innerHTML;
					e.currentTarget.innerHTML = '<i class="fas fa-check"></i> Добавлено';
					e.currentTarget.style.background = '#2ecc71';

					setTimeout( () => {
						e.currentTarget.innerHTML = originalText;
						e.currentTarget.style.background = '';
					}, 2000 );

					this.updateHeaderCounters();
				} else {
					API.showNotification( '❌ Не удалось добавить товар', 'error' );
				}
			};
			btn.addEventListener( 'click', this.handleAddToCart );
		} );

		// ===== ОЧИСТКА ВСЕГО ИЗБРАННОГО =====
		const clearBtn = document.getElementById( 'clearFavoritesBtn' );
		if ( clearBtn ) {
			clearBtn.removeEventListener( 'click', this.handleClearFavorites );
			this.handleClearFavorites = ( e ) => {
				e.preventDefault();
				if ( confirm( '❤️ Вы уверены, что хотите очистить избранное?' ) ) {
					// Анимация для всех карточек
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

		// ===== КОПИРОВАНИЕ СПИСКА ИЗБРАННОГО =====
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

				// Формируем текст для копирования
				const text = favorites.map( item =>
					`${item.name} - ${API.formatPrice( item.price )}`
				).join( '\n' );

				navigator.clipboard.writeText( text ).then( () => {
					API.showNotification( '📋 Список скопирован в буфер обмена' );

					// Визуальный эффект
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

		// ===== ПОДЕЛИТЬСЯ В СОЦСЕТЯХ =====
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

		// Получаем все товары
		const allProducts = store.products;
		const favorites = store.favorites;
		const cartIds = store.getCartProductIds();

		// Фильтруем товары для рекомендаций
		let recommendations = allProducts
			.filter( p => {
				if ( p.status !== 'in-stock' || p.quantity <= 0 ) return false;
				if ( favorites.includes( p.id ) ) return false;
				return true;
			} )
			.sort( () => 0.5 - Math.random() )
			.slice( 0, 4 );

		// Если мало рекомендаций - добавляем популярные
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
		const favoritesCount = document.getElementById( 'favoritesCount' );
		if ( favoritesCount ) {
			favoritesCount.textContent = store.favorites.length;
		}
	}

	/**
	 * Склонение слов
	 */
	getDeclension( number, words ) {
		const cases = [2, 0, 1, 1, 1, 2];
		const index = ( number % 100 > 4 && number % 100 < 20 ) ? 2 : cases[Math.min( number % 10, 5 )];
		return `${number} ${words[index]}`;
	}
}

// Инициализация страницы
document.addEventListener( 'DOMContentLoaded', () => {
	if ( document.querySelector( '.favorites-page-content' ) ) {
		window.favoritesPage = new FavoritesPage();
		console.log( '✅ Страница избранного инициализирована' );
	}
} );