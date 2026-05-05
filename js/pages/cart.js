/**
 * ============================================================================
 * СТРАНИЦА КОРЗИНЫ (cart.html)
 * ============================================================================
 * 
 * Этот класс управляет всем функционалом на странице корзины:
 * 
 * 1. ОТОБРАЖЕНИЕ:
 *    - Список товаров в корзине
 *    - Количество товаров
 *    - Цены и суммы
 * 
 * 2. УПРАВЛЕНИЕ КОЛИЧЕСТВОМ:
 *    - Кнопки + / - для изменения количества
 *    - Ручной ввод количества
 *    - Блокировка при достижении максимума
 * 
 * 3. ДЕЙСТВИЯ:
 *    - Удаление отдельных товаров
 *    - Очистка всей корзины
 *    - Применение промокодов
 *    - Отмена промокодов
 * 
 * 4. РАСЧЕТЫ:
 *    - Подытог (сумма без скидки)
 *    - Скидка (в зависимости от промокода)
 *    - Итоговая сумма (с учетом скидки)
 * 
 * 5. РЕКОМЕНДАЦИИ:
 *    - Отображение похожих товаров
 *    - Добавление рекомендаций в корзину
 * 
 * ============================================================================
 */

class CartPage {
	constructor() {
		// Текущая страница (всегда 'cart')
		this.currentPage = 'cart';

		// Объект с данными примененного промокода
		// Пример: { discount: 0.1, type: 'percent', code: 'SAKURA10', id: 123 }
		this.appliedPromo = null;

		// Флаг для предотвращения множественной привязки событий
		this.eventsBound = false;

		// Инициализация страницы
		this.init();
	}

	// =========================================================================
	// ИНИЦИАЛИЗАЦИЯ
	// =========================================================================

	/**
	 * Главный метод инициализации страницы корзины
	 */
	init() {
		console.log( '🛒 Инициализация страницы корзины...' );

		// Очищаем "битые" ссылки (товары, которые удалены из каталога)
		store.cleanInvalidReferences();

		// Загружаем примененный промокод из localStorage (если есть)
		this.loadPromoCode();

		// Отрисовываем содержимое корзины
		this.render();

		// Привязываем обработчики событий
		this.bindEvents();

		// Рендерим блок рекомендаций
		setTimeout( () => this.renderRecommendations(), 100 );

		// Слушаем обновление корзины (из других мест сайта)
		window.addEventListener( 'store:cartUpdated', () => {
			console.log( '🔄 Корзина обновлена, перерисовываем...' );
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

		console.log( '✅ Страница корзины инициализирована' );
	}

	// =========================================================================
	// РАБОТА С LOCALSTORAGE (ПРОМОКОДЫ)
	// =========================================================================

	/**
	 * Загружает примененный промокод из localStorage
	 */
	loadPromoCode() {
		const savedPromo = localStorage.getItem( 'appliedPromoCode' );
		if ( savedPromo ) {
			try {
				this.appliedPromo = JSON.parse( savedPromo );
				console.log( '🏷️ Загружен промокод:', this.appliedPromo );
			} catch ( e ) {
				console.error( 'Ошибка загрузки промокода:', e );
				this.appliedPromo = null;
			}
		}
	}

	/**
	 * Применяет промокод (проверяет валидность и рассчитывает скидку)
	 */
	applyPromoCode() {
		const input = document.getElementById( 'promoCodeInput' );
		const message = document.getElementById( 'promoMessage' );

		if ( !input || !message ) return;

		const code = input.value.trim().toUpperCase();

		// Загружаем промокоды из localStorage (созданные в админке)
		const promoCodes = JSON.parse( localStorage.getItem( 'komori_promocodes' ) || '[]' );

		// Ищем промокод по коду
		const promo = promoCodes.find( p => p.code === code );

		// Проверка: промокод не найден
		if ( !promo ) {
			message.style.color = '#ff4757';
			message.textContent = '❌ Неверный промокод';
			setTimeout( () => {
				if ( message.textContent === '❌ Неверный промокод' ) message.textContent = '';
			}, 3000 );
			return;
		}

		// Проверка: промокод неактивен
		if ( !promo.isActive ) {
			message.style.color = '#ff4757';
			message.textContent = '❌ Промокод неактивен';
			setTimeout( () => message.textContent = '', 3000 );
			return;
		}

		// Проверка: промокод еще не активен (дата начала)
		const now = new Date();
		if ( promo.validFrom && new Date( promo.validFrom ) > now ) {
			message.style.color = '#ff4757';
			message.textContent = '❌ Промокод еще не активен';
			setTimeout( () => message.textContent = '', 3000 );
			return;
		}

		// Проверка: срок действия промокода истек
		if ( promo.validUntil && new Date( promo.validUntil ) < now ) {
			message.style.color = '#ff4757';
			message.textContent = '❌ Срок действия промокода истек';
			setTimeout( () => message.textContent = '', 3000 );
			return;
		}

		// Проверка: минимальная сумма заказа
		const subtotal = store.getCartTotal();
		if ( promo.minOrder > 0 && subtotal < promo.minOrder ) {
			message.style.color = '#ff4757';
			message.textContent = `❌ Минимальная сумма заказа для этого промокода: ${API.formatPrice( promo.minOrder )}`;
			setTimeout( () => message.textContent = '', 3000 );
			return;
		}

		// Применяем промокод
		let discountValue;
		let discountType;

		if ( promo.type === 'percent' ) {
			discountValue = promo.discount / 100;
			discountType = 'percent';
		} else {
			discountValue = promo.discount;
			discountType = 'fixed';
		}

		this.appliedPromo = {
			discount: discountValue,
			type: discountType,
			description: promo.description,
			code: promo.code,
			id: promo.id
		};

		// Сохраняем в localStorage
		localStorage.setItem( 'appliedPromoCode', JSON.stringify( this.appliedPromo ) );

		message.style.color = '#2ecc71';
		message.textContent = `✅ Промокод "${promo.code}" применен! ${promo.description || ''}`;

		// Увеличиваем счетчик использований
		promo.usedCount = ( promo.usedCount || 0 ) + 1;
		localStorage.setItem( 'komori_promocodes', JSON.stringify( promoCodes ) );

		// Обновляем итоговые суммы
		this.updateTotals();

		// Добавляем кнопку сброса промокода
		this.addPromoCodeResetButton();

		// Очищаем поле ввода
		input.value = '';

		setTimeout( () => {
			if ( message.textContent.includes( 'Промокод применен' ) ) message.textContent = '';
		}, 3000 );
	}

	/**
	 * Сбрасывает примененный промокод
	 */
	resetPromoCode() {
		this.appliedPromo = null;
		localStorage.removeItem( 'appliedPromoCode' );

		// Очищаем поле ввода
		const promoInput = document.getElementById( 'promoCodeInput' );
		if ( promoInput ) promoInput.value = '';

		const message = document.getElementById( 'promoMessage' );
		if ( message ) {
			message.style.color = '#2ecc71';
			message.textContent = '🏷️ Промокод отменен';
			setTimeout( () => message.textContent = '', 2000 );
		}

		// Удаляем кнопку сброса
		const resetBtn = document.getElementById( 'resetPromoBtn' );
		if ( resetBtn ) resetBtn.remove();

		// Обновляем итоговые суммы
		this.updateTotals();
	}

	/**
	 * Добавляет кнопку сброса промокода
	 */
	addPromoCodeResetButton() {
		const promoSection = document.querySelector( '.promo-code-section' );
		const existingResetBtn = document.getElementById( 'resetPromoBtn' );
		if ( existingResetBtn ) return;

		const resetBtn = document.createElement( 'button' );
		resetBtn.id = 'resetPromoBtn';
		resetBtn.className = 'promo-code-reset';
		resetBtn.innerHTML = `<i class="fas fa-ticket-alt"></i> ${this.appliedPromo?.code || ''} <i class="fas fa-times"></i>`;

		resetBtn.style.cssText = `
			margin-top: 10px;
			padding: 8px 15px;
			background: transparent;
			border: 1px solid #ff3366;
			color: #ff3366;
			border-radius: 8px;
			cursor: pointer;
			font-size: 13px;
			width: 100%;
			transition: all 0.3s ease;
		`;

		resetBtn.addEventListener( 'mouseenter', () => {
			resetBtn.style.background = '#ff3366';
			resetBtn.style.color = 'white';
		} );

		resetBtn.addEventListener( 'mouseleave', () => {
			resetBtn.style.background = 'transparent';
			resetBtn.style.color = '#ff3366';
		} );

		resetBtn.addEventListener( 'click', () => this.resetPromoCode() );
		promoSection.appendChild( resetBtn );
	}

	// =========================================================================
	// ОТОБРАЖЕНИЕ КОРЗИНЫ
	// =========================================================================

	/**
	 * Отрисовывает содержимое корзины
	 */
	render() {
		console.log( '🛒 Рендерим корзину...' );

		const cartWithItems = document.getElementById( 'cartWithItems' );
		const cartEmptyState = document.getElementById( 'cartEmptyState' );
		const cartItemsList = document.getElementById( 'cartItemsList' );

		// Получаем данные из корзины
		const cartItems = store.cart;

		console.log( '📦 Товары в корзине:', cartItems );

		// Если корзина пуста
		if ( !cartItems || cartItems.length === 0 ) {
			if ( cartWithItems ) cartWithItems.style.display = 'none';
			if ( cartEmptyState ) cartEmptyState.style.display = 'block';
			this.updateTotals();
			return;
		}

		// Корзина не пуста
		if ( cartWithItems ) cartWithItems.style.display = 'grid';
		if ( cartEmptyState ) cartEmptyState.style.display = 'none';

		// Генерируем HTML для товаров
		if ( cartItemsList ) {
			cartItemsList.innerHTML = cartItems.map( item => {
				const product = store.getProduct( item.id );
				if ( !product ) return ''; // Товар не найден - пропускаем
				return this.renderCartItem( product, item.quantity );
			} ).filter( html => html !== '' ).join( '' );
		}

		this.updateTotals();
	}

	/**
	 * Отрисовка одной строки товара в корзине
	 * @param {Object} product - полный объект товара
	 * @param {number} quantity - количество
	 */
	renderCartItem( product, quantity ) {
		const isLowStock = product.quantity <= 3;
		const categoryUrl = store.getCategoryUrl( product.category );

		return `
			<div class="cart-item-row" data-id="${product.id}">
				<div class="cart-col-product">
					<div class="cart-product-info">
						<a href="${categoryUrl}" class="cart-product-image-link">
							<img src="${API.getSafeImageUrl( product.image )}" 
								alt="${product.name}"
								class="cart-product-image"
								onerror="this.src='${API.getFallbackSvg( product.name )}'">
						</a>
						<div class="cart-product-details">
							<h3 class="cart-product-title">
								<a href="${categoryUrl}">${product.name}</a>
							</h3>
							<div class="cart-product-attributes">
								<span class="cart-product-category">
									<a href="${categoryUrl}">${store.getCategoryName( product.category || '' )}</a>
								</span>
								<span class="cart-product-stock ${product.quantity > 0 ? 'in-stock' : 'out-of-stock'}">
									<i class="fas ${product.quantity > 0 ? 'fa-check-circle' : 'fa-times-circle'}"></i> 
									${product.quantity > 0 ? 'В наличии' : 'Нет в наличии'}
									${isLowStock ? '<span class="low-stock-warning"> (Осталось мало)</span>' : ''}
								</span>
							</div>
						</div>
					</div>
				</div>
				<div class="cart-col-price">
					<div class="cart-price-current">${API.formatPrice( product.price )}</div>
					${product.oldPrice ? `<div class="cart-price-old">${API.formatPrice( product.oldPrice )}</div>` : ''}
				</div>
				<div class="cart-col-quantity">
					<div class="cart-quantity-control">
						<button class="cart-quantity-btn minus" data-id="${product.id}">-</button>
						<input type="number" class="cart-quantity-input" value="${quantity}" 
							min="1" max="${product.quantity}" data-id="${product.id}">
						<button class="cart-quantity-btn plus" data-id="${product.id}" 
								${quantity >= product.quantity ? 'disabled' : ''}>+</button>
					</div>
				</div>
				<div class="cart-col-total">
					<div class="cart-item-total">${API.formatPrice( product.price * quantity )}</div>
				</div>
				<div class="cart-col-remove">
					<button class="cart-remove-item" data-id="${product.id}" title="Удалить товар">
						<i class="fas fa-times"></i>
					</button>
				</div>
			</div>
		`;
	}

	/**
	 * Обновляет итоговые суммы в боковой панели
	 */
	updateTotals() {
		// Получаем расчеты из store
		const totals = store.getCartTotals( this.appliedPromo );
		const count = store.getCartCount();

		// Заголовок страницы
		const itemsCountElement = document.querySelector( '.cart-items-count' );
		const totalAmountElement = document.querySelector( '.cart-total-amount' );

		if ( itemsCountElement ) {
			itemsCountElement.textContent = this.getDeclension( count, ['товар', 'товара', 'товаров'] );
		}
		if ( totalAmountElement ) {
			totalAmountElement.textContent = `на сумму ${API.formatPrice( totals.subtotal )}`;
		}

		// Боковая панель
		const cartSubtotal = document.getElementById( 'cartSubtotal' );
		const discountAmount = document.querySelector( '.discount-amount' );
		const cartTotalById = document.getElementById( 'cartTotal' );
		const totalAmountByClass = document.querySelector( '.total-amount' );
		const cartItemsCount = document.getElementById( 'cartItemsCount' );

		if ( cartSubtotal ) cartSubtotal.textContent = API.formatPrice( totals.subtotal );
		if ( discountAmount ) {
			discountAmount.textContent = totals.discount > 0 ? `-${API.formatPrice( totals.discount )}` : '0 ₽';
			discountAmount.style.color = totals.discount > 0 ? '#2ecc71' : '';
		}
		if ( cartTotalById ) cartTotalById.textContent = API.formatPrice( totals.total );
		if ( totalAmountByClass ) totalAmountByClass.textContent = API.formatPrice( totals.total );
		if ( cartItemsCount ) cartItemsCount.textContent = count;
	}

	/**
	 * Обновление суммы конкретного товара без перерисовки всей таблицы
	 * @param {string|number} productId - ID товара
	 * @param {number} newQuantity - новое количество
	 */
	updateItemTotal( productId, newQuantity ) {
		const row = document.querySelector( `.cart-item-row[data-id="${productId}"]` );
		if ( !row ) return;

		const product = store.getProduct( productId );
		if ( !product ) return;

		const totalElement = row.querySelector( '.cart-item-total' );
		if ( totalElement ) {
			totalElement.textContent = API.formatPrice( product.price * newQuantity );
		}

		const plusBtn = row.querySelector( '.cart-quantity-btn.plus' );
		if ( plusBtn ) {
			plusBtn.disabled = newQuantity >= product.quantity;
		}
	}

	// =========================================================================
	// ОБРАБОТЧИКИ СОБЫТИЙ
	// =========================================================================

	/**
	 * Привязывает обработчики событий
	 */
	bindEvents() {
		console.log( '🔗 Привязка событий корзины...' );

		// Удаляем старый обработчик
		if ( this.eventsBound ) {
			document.removeEventListener( 'click', this.handleDocumentClick );
		}

		// Создаем обработчик кликов через делегирование
		this.handleDocumentClick = ( e ) => {
			const target = e.target;

			// Обработка кнопки "+"
			const plusBtn = target.closest( '.cart-quantity-btn.plus' );
			if ( plusBtn && plusBtn.closest( '.cart-item-row' ) ) {
				e.preventDefault();
				const id = plusBtn.dataset.id;
				const input = plusBtn.closest( '.cart-quantity-control' ).querySelector( '.cart-quantity-input' );
				const newValue = parseInt( input.value ) + 1;

				if ( store.updateCartQuantity( id, newValue ) ) {
					input.value = newValue;
					this.updateItemTotal( id, newValue );
					this.updateTotals();
					this.renderRecommendations();
				}
				return;
			}

			// Обработка кнопки "-"
			const minusBtn = target.closest( '.cart-quantity-btn.minus' );
			if ( minusBtn && minusBtn.closest( '.cart-item-row' ) ) {
				e.preventDefault();
				const id = minusBtn.dataset.id;
				const input = minusBtn.closest( '.cart-quantity-control' ).querySelector( '.cart-quantity-input' );
				const newValue = parseInt( input.value ) - 1;

				if ( newValue >= 1 && store.updateCartQuantity( id, newValue ) ) {
					input.value = newValue;
					this.updateItemTotal( id, newValue );
					this.updateTotals();
					this.renderRecommendations();
				}
				return;
			}

			// Обработка ручного ввода
			const quantityInput = target.closest( '.cart-quantity-input' );
			if ( quantityInput && quantityInput.closest( '.cart-item-row' ) ) {
				e.preventDefault();
				const id = quantityInput.dataset.id;
				let newValue = parseInt( quantityInput.value );
				const maxValue = parseInt( quantityInput.max );
				const minValue = parseInt( quantityInput.min ) || 1;

				if ( isNaN( newValue ) ) newValue = minValue;
				if ( newValue < minValue ) newValue = minValue;
				if ( newValue > maxValue ) newValue = maxValue;

				if ( store.updateCartQuantity( id, newValue ) ) {
					quantityInput.value = newValue;
					this.updateItemTotal( id, newValue );
					this.updateTotals();
					this.renderRecommendations();
				}
				return;
			}

			// Обработка удаления товара
			const removeBtn = target.closest( '.cart-remove-item' );
			if ( removeBtn && removeBtn.closest( '.cart-item-row' ) ) {
				e.preventDefault();
				const id = removeBtn.dataset.id;
				const row = removeBtn.closest( '.cart-item-row' );

				this.animateRemove( row, () => {
					store.removeFromCart( id );
					this.renderRecommendations();
				} );
				return;
			}
		};

		document.addEventListener( 'click', this.handleDocumentClick );
		this.eventsBound = true;

		// Кнопка очистки корзины
		const clearCartBtn = document.getElementById( 'clearCartBtn' );
		if ( clearCartBtn ) {
			clearCartBtn.removeEventListener( 'click', this.handleClearCart );
			this.handleClearCart = () => {
				if ( confirm( '🗑️ Вы уверены, что хотите очистить корзину?' ) ) {
					store.clearCart();
					this.resetPromoCode();
					this.render();
					this.renderRecommendations();
					this.updateHeaderCounters();
					API.showNotification( 'Корзина очищена', 'success' );
				}
			};
			clearCartBtn.addEventListener( 'click', this.handleClearCart );
		}

		// Кнопка оформления заказа
		const checkoutBtn = document.getElementById( 'checkoutBtn' );
		if ( checkoutBtn ) {
			checkoutBtn.removeEventListener( 'click', this.handleCheckout );
			this.handleCheckout = () => this.openCheckoutModal();
			checkoutBtn.addEventListener( 'click', this.handleCheckout );
		}

		// Кнопка применения промокода
		const applyPromoBtn = document.getElementById( 'applyPromoBtn' );
		if ( applyPromoBtn ) {
			applyPromoBtn.removeEventListener( 'click', this.handleApplyPromo );
			this.handleApplyPromo = () => this.applyPromoCode();
			applyPromoBtn.addEventListener( 'click', this.handleApplyPromo );
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
		const cartIds = store.getCartProductIds();
		const favorites = store.favorites;

		// Фильтруем товары для рекомендаций
		let recommendations = allProducts
			.filter( p => {
				if ( p.status !== 'in-stock' || p.quantity <= 0 ) return false;
				if ( favorites.includes( p.id ) ) return false;
				if ( cartIds.includes( p.id ) ) return false;
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
				if ( cartIds.includes( p.id ) ) return false;
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
					<button class="recommendation-add add-to-cart" data-id="${product.id}">
						<i class="fas fa-shopping-cart"></i> В корзину
					</button>
				</div>
			</div>
		`;
	}

	/**
	 * Прикрепляет обработчики к кнопкам рекомендаций
	 */
	attachRecommendationEvents() {
		document.querySelectorAll( '.recommendation-add.add-to-cart' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleRecommendationAdd );
			this.handleRecommendationAdd = ( e ) => {
				e.preventDefault();
				const id = e.currentTarget.dataset.id;

				if ( store.addToCart( id ) ) {
					API.showNotification( '✅ Товар добавлен в корзину' );

					const originalHTML = e.currentTarget.innerHTML;
					e.currentTarget.innerHTML = '<i class="fas fa-check"></i> Добавлено';
					e.currentTarget.style.background = '#2ecc71';
					e.currentTarget.style.color = 'white';

					setTimeout( () => {
						e.currentTarget.innerHTML = originalHTML;
						e.currentTarget.style.background = '';
						e.currentTarget.style.color = '';
						this.renderRecommendations();
					}, 1500 );

					this.updateHeaderCounters();
				} else {
					API.showNotification( '❌ Не удалось добавить товар', 'error' );
				}
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
		if ( cartCount ) {
			cartCount.textContent = store.getCartCount();
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

	/**
	 * Анимация удаления элемента
	 */
	animateRemove( element, callback ) {
		if ( !element ) return;

		element.style.transition = 'all 0.3s ease';
		element.style.opacity = '0';
		element.style.transform = 'translateX(-20px)';

		setTimeout( () => {
			if ( callback ) callback();
			if ( element.parentNode ) element.remove();
		}, 300 );
	}

	/**
	 * Открывает модальное окно оформления заказа (заглушка)
	 */
	openCheckoutModal() {
		const cart = store.getCart();
		if ( cart.length === 0 ) {
			API.showNotification( '🛒 Корзина пуста', 'error' );
			return;
		}
		alert( '🚚 Функция оформления заказа в разработке' );
	}
}

// Инициализация страницы
document.addEventListener( 'DOMContentLoaded', () => {
	if ( document.querySelector( '.cart-page-content' ) ) {
		window.cartPage = new CartPage();
		console.log( '✅ Страница корзины инициализирована' );
	}
} );