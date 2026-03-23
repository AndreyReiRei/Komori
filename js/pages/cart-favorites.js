/**
 * Страницы корзины и избранного
 */

class CartFavoritesPage {
	constructor() {
		this.currentPage = 'cart'; // 'cart' или 'favorites'
		this.init();
	}

	init() {
		// Определяем текущую страницу
		if ( document.querySelector( '.cart-page-content' ) ) {
			this.currentPage = 'cart';
			this.renderCart();
			this.bindCartEvents();
		} else if ( document.querySelector( '.favorites-page-content' ) ) {
			this.currentPage = 'favorites';
			this.renderFavorites();
			this.bindFavoritesEvents();
		}

		// Общие события
		window.addEventListener( 'store:cartUpdated', () => {
			console.log( 'Корзина обновлена' );
			if ( this.currentPage === 'cart' ) {
				this.renderCart();
			}
			this.updateHeaderCounters();
		} );

		window.addEventListener( 'store:favoritesUpdated', () => {
			console.log( 'Избранное обновлено' );
			if ( this.currentPage === 'favorites' ) {
				this.renderFavorites();
			}
			this.updateHeaderCounters();
		} );

		API.initModalHandlers();

		// Обновляем счетчики при загрузке
		this.updateHeaderCounters();
	}

	// ========== КОРЗИНА ==========
	renderCart() {
		console.log( 'Рендерим корзину' );

		const cartWithItems = document.getElementById( 'cartWithItems' );
		const cartEmptyState = document.getElementById( 'cartEmptyState' );
		const cartItemsList = document.getElementById( 'cartItemsList' );
		const cartItems = store.getCart();

		console.log( 'Товары в корзине:', cartItems );

		if ( cartItems.length === 0 ) {
			// Показываем пустую корзину
			if ( cartWithItems ) cartWithItems.style.display = 'none';
			if ( cartEmptyState ) cartEmptyState.style.display = 'block';
			this.updateCartSummary();
			return;
		}

		// Показываем корзину с товарами
		if ( cartWithItems ) cartWithItems.style.display = 'grid';
		if ( cartEmptyState ) cartEmptyState.style.display = 'none';

		// Очищаем и заполняем список товаров
		if ( cartItemsList ) {
			cartItemsList.innerHTML = cartItems.map( item => this.renderCartItem( item ) ).join( '' );
		}

		this.updateCartSummary();
		this.attachCartEvents();
	}

	renderCartItem( item ) {
		const product = store.getProduct( item.id );
		const isLowStock = product && product.quantity <= 3;

		return `
            <div class="cart-item-row" data-id="${item.id}">
                <div class="cart-col-product">
                    <div class="cart-product-info">
                        <img src="${API.getSafeImageUrl( item.image )}" 
                             alt="${item.name}"
                             class="cart-product-image"
                             onerror="this.src='${API.getFallbackSvg( item.name )}'">
                        <div class="cart-product-details">
                            <h3 class="cart-product-title">
                                <a href="/pages html/product.html?id=${item.id}">${item.name}</a>
                            </h3>
                            <div class="cart-product-attributes">
                                <span class="cart-product-category">${store.getCategoryName( product?.category || '' )}</span>
                                <span class="cart-product-stock ${item.quantity > 0 ? 'in-stock' : 'out-of-stock'}">
                                    <i class="fas ${item.quantity > 0 ? 'fa-check-circle' : 'fa-times-circle'}"></i> 
                                    ${item.quantity > 0 ? 'В наличии' : 'Нет в наличии'}
                                    ${isLowStock ? '<span class="low-stock-warning"> (Осталось мало)</span>' : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="cart-col-price">
                    <div class="cart-price-current">${API.formatPrice( item.price )}</div>
                    ${product?.oldPrice ? `<div class="cart-price-old">${API.formatPrice( product.oldPrice )}</div>` : ''}
                </div>
                <div class="cart-col-quantity">
                    <div class="cart-quantity-control">
                        <button class="cart-quantity-btn minus" data-id="${item.id}">-</button>
                        <input type="number" class="cart-quantity-input" value="${item.quantity}" 
                               min="1" max="${item.maxQuantity || 99}" data-id="${item.id}" readonly>
                        <button class="cart-quantity-btn plus" data-id="${item.id}" 
                                ${item.quantity >= item.maxQuantity ? 'disabled' : ''}>+</button>
                    </div>
                </div>
                <div class="cart-col-total">
                    <div class="cart-item-total">${API.formatPrice( item.price * item.quantity )}</div>
                </div>
                <div class="cart-col-remove">
                    <button class="cart-remove-item" data-id="${item.id}" title="Удалить товар">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
	}

	attachCartEvents() {
		// Кнопки количества
		document.querySelectorAll( '.cart-quantity-btn.plus' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handlePlusClick );
			this.handlePlusClick = ( e ) => {
				e.preventDefault();
				const id = e.currentTarget.dataset.id;
				const input = document.querySelector( `.cart-quantity-input[data-id="${id}"]` );
				const newValue = parseInt( input.value ) + 1;
				if ( store.updateCartQuantity( id, newValue ) ) {
					this.renderCart();
				}
			};
			btn.addEventListener( 'click', this.handlePlusClick );
		} );

		document.querySelectorAll( '.cart-quantity-btn.minus' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleMinusClick );
			this.handleMinusClick = ( e ) => {
				e.preventDefault();
				const id = e.currentTarget.dataset.id;
				const input = document.querySelector( `.cart-quantity-input[data-id="${id}"]` );
				const newValue = parseInt( input.value ) - 1;
				if ( store.updateCartQuantity( id, newValue ) ) {
					this.renderCart();
				}
			};
			btn.addEventListener( 'click', this.handleMinusClick );
		} );

		// Кнопки удаления
		document.querySelectorAll( '.cart-remove-item' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleRemoveClick );
			this.handleRemoveClick = ( e ) => {
				e.preventDefault();
				const id = e.currentTarget.dataset.id;
				this.animateRemove( e.currentTarget.closest( '.cart-item-row' ), () => {
					store.removeFromCart( id );
				} );
			};
			btn.addEventListener( 'click', this.handleRemoveClick );
		} );

		// Очистка корзины
		const clearCartBtn = document.getElementById( 'clearCartBtn' );
		if ( clearCartBtn ) {
			clearCartBtn.removeEventListener( 'click', this.handleClearCart );
			this.handleClearCart = () => {
				if ( confirm( 'Очистить корзину?' ) ) {
					store.clearCart();
				}
			};
			clearCartBtn.addEventListener( 'click', this.handleClearCart );
		}

		// Оформление заказа
		const checkoutBtn = document.getElementById( 'checkoutBtn' );
		if ( checkoutBtn ) {
			checkoutBtn.removeEventListener( 'click', this.handleCheckout );
			this.handleCheckout = () => this.openCheckoutModal();
			checkoutBtn.addEventListener( 'click', this.handleCheckout );
		}

		// Применение промокода
		const applyPromoBtn = document.getElementById( 'applyPromoBtn' );
		if ( applyPromoBtn ) {
			applyPromoBtn.removeEventListener( 'click', this.handleApplyPromo );
			this.handleApplyPromo = () => this.applyPromoCode();
			applyPromoBtn.addEventListener( 'click', this.handleApplyPromo );
		}

		// Добавление сопутствующих товаров
		document.querySelectorAll( '.related-product-add' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleRelatedAdd );
			this.handleRelatedAdd = ( e ) => {
				e.preventDefault();
				const id = e.currentTarget.dataset.id;
				// Здесь можно добавить логику добавления сопутствующего товара
				console.log( 'Добавить сопутствующий товар:', id );
			};
			btn.addEventListener( 'click', this.handleRelatedAdd );
		} );
	}

	updateCartSummary() {
		// Обновляем информацию в шапке страницы
		const itemsCountElement = document.querySelector( '.cart-items-count' );
		const totalAmountElement = document.querySelector( '.cart-total-amount' );

		const count = store.getCartCount();
		const total = store.getCartTotal();

		if ( itemsCountElement ) {
			itemsCountElement.textContent = this.getDeclension( count, ['товар', 'товара', 'товаров'] );
		}

		if ( totalAmountElement ) {
			totalAmountElement.textContent = `на сумму ${API.formatPrice( total )}`;
		}

		// Обновляем итоги в боковой панели
		const summaryRows = document.querySelectorAll( '.cart-summary-row span:last-child' );
		const totalElement = document.querySelector( '.total-amount' );

		if ( summaryRows.length > 0 ) {
			summaryRows[0].textContent = API.formatPrice( total ); // Сумма товаров
		}

		if ( totalElement ) {
			// Здесь можно добавить логику скидок
			const discount = 500; // Пример скидки
			totalElement.textContent = API.formatPrice( total - discount );
		}

		// Обновляем количество товаров в боковой панели
		const summaryTitle = document.querySelector( '.cart-summary-title' );
		if ( summaryTitle ) {
			const itemsText = summaryTitle.nextElementSibling?.querySelector( 'span:first-child' );
			if ( itemsText ) {
				itemsText.textContent = `Товары (${count} шт.)`;
			}
		}
	}

	// ========== ИЗБРАННОЕ ==========
	renderFavorites() {
		const container = document.getElementById( 'favoritesItems' );
		const emptyState = document.getElementById( 'favoritesEmpty' );
		const countElement = document.getElementById( 'favoritesCount' );
		const totalElement = document.getElementById( 'favoritesTotal' );

		const favorites = store.getFavorites();

		console.log( 'Рендерим избранное:', favorites );

		if ( favorites.length === 0 ) {
			// Показываем пустое состояние
			if ( container ) {
				container.style.display = 'none';
				container.innerHTML = '';
			}
			if ( emptyState ) emptyState.style.display = 'block';

			// Обновляем счетчики
			if ( countElement ) countElement.textContent = '0 товаров';
			if ( totalElement ) totalElement.textContent = 'на сумму 0 ₽';

			// Показываем рекомендации
			this.renderRecommendations();
			return;
		}

		// Показываем товары
		if ( container ) {
			container.style.display = 'grid';
			container.innerHTML = favorites.map( product => this.renderFavoriteCard( product ) ).join( '' );
		}
		if ( emptyState ) emptyState.style.display = 'none';

		// Обновляем информацию
		const total = favorites.reduce( ( sum, item ) => sum + item.price, 0 );
		const count = favorites.length;

		if ( countElement ) {
			countElement.textContent = this.getDeclension( count, ['товар', 'товара', 'товаров'] );
		}
		if ( totalElement ) {
			totalElement.textContent = `на сумму ${API.formatPrice( total )}`;
		}

		// Обновляем счетчик в шапке
		this.updateHeaderCounters();

		// Прикрепляем события к карточкам
		this.attachFavoritesEvents();

		// Рендерим рекомендации
		this.renderRecommendations();
	}

	renderFavoriteCard( product ) {
		const inCart = store.cart.find( item => item.id === product.id );
		const inCartQuantity = inCart ? inCart.quantity : 0;
		const availableQuantity = product.quantity - inCartQuantity;

		// Определяем статус наличия
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

		// Определяем бейджи
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
                <img src="${API.getSafeImageUrl( product.image )}" 
                     alt="${product.name}" 
                     class="favorite-item-image"
                     onerror="this.src='${API.getFallbackSvg( product.name )}'">
                <div class="favorite-item-info">
                    <div class="favorite-item-category">${store.getCategoryName( product.category )}</div>
                    <h3 class="favorite-item-title">${product.name}</h3>
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

	attachFavoritesEvents() {
		// Удаление из избранного
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

		// Добавление в корзину из избранного
		document.querySelectorAll( '.add-to-cart-btn' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleAddToCart );
			this.handleAddToCart = ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				const id = e.currentTarget.dataset.id;

				if ( store.addToCart( id ) ) {
					API.showNotification( 'Товар добавлен в корзину' );

					// Визуальный эффект
					const originalText = e.currentTarget.innerHTML;
					e.currentTarget.innerHTML = '<i class="fas fa-check"></i> Добавлено';
					e.currentTarget.style.background = '#2ecc71';

					setTimeout( () => {
						e.currentTarget.innerHTML = originalText;
						e.currentTarget.style.background = '';
					}, 2000 );

					this.updateHeaderCounters();
				} else {
					API.showNotification( 'Не удалось добавить товар', 'error' );
				}
			};
			btn.addEventListener( 'click', this.handleAddToCart );
		} );
	}

	bindFavoritesEvents() {
		console.log( 'Привязка событий избранного...' );

		// Очистка избранного
		const clearBtn = document.getElementById( 'clearFavoritesBtn' );
		if ( clearBtn ) {
			console.log( 'Кнопка очистки найдена' );
			clearBtn.removeEventListener( 'click', this.handleClearFavorites );
			this.handleClearFavorites = ( e ) => {
				e.preventDefault();
				e.stopPropagation();

				if ( confirm( 'Вы уверены, что хотите очистить избранное?' ) ) {
					console.log( 'Очищаем избранное' );

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
					}, cards.length * 100 + 300 );
				}
			};
			clearBtn.addEventListener( 'click', this.handleClearFavorites );
		} else {
			console.warn( 'Кнопка clearFavoritesBtn не найдена в DOM' );
		}

		// Копирование ссылки
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

				// Создаем текст для копирования
				const text = favorites.map( item =>
					`${item.name} - ${API.formatPrice( item.price )}`
				).join( '\n' );

				navigator.clipboard.writeText( text ).then( () => {
					API.showNotification( 'Список скопирован' );

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

		// Поделиться ВКонтакте
		const shareVk = document.getElementById( 'shareVk' );
		if ( shareVk ) {
			shareVk.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				this.shareToSocial( 'vk' );
			} );
		}

		// Поделиться в Telegram
		const shareTelegram = document.getElementById( 'shareTelegram' );
		if ( shareTelegram ) {
			shareTelegram.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				this.shareToSocial( 'telegram' );
			} );
		}

		// Поделиться в WhatsApp
		const shareWhatsapp = document.getElementById( 'shareWhatsapp' );
		if ( shareWhatsapp ) {
			shareWhatsapp.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				this.shareToSocial( 'whatsapp' );
			} );
		}
	}

	shareToSocial( network ) {
		const favorites = store.getFavorites();
		if ( favorites.length === 0 ) {
			API.showNotification( 'Избранное пусто', 'error' );
			return;
		}

		const text = `Мои избранные товары из магазина Комори:\n${favorites.map( item => `${item.name} - ${API.formatPrice( item.price )}` ).join( '\n' )}`;
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

	renderRecommendations() {
		const grid = document.getElementById( 'recommendationsGrid' );
		if ( !grid ) return;

		// Получаем случайные товары для рекомендаций
		const allProducts = store.products;
		const favorites = store.favorites;

		// Исключаем товары из избранного
		const recommendations = allProducts
			.filter( p => !favorites.includes( p.id ) && p.status === 'in-stock' )
			.sort( () => 0.5 - Math.random() )
			.slice( 0, 4 );

		if ( recommendations.length === 0 ) {
			grid.innerHTML = '<p class="no-recommendations">Пока нет рекомендаций</p>';
			return;
		}

		grid.innerHTML = recommendations.map( product => `
            <div class="recommendation-item" data-id="${product.id}">
                <img src="${API.getSafeImageUrl( product.image )}" 
                    alt="${product.name}" 
                    class="recommendation-image"
                    onerror="this.src='${API.getFallbackSvg( product.name )}'">
                <h4 class="recommendation-name">${product.name}</h4>
                <span class="recommendation-price">${API.formatPrice( product.price )}</span>
                <button class="recommendation-add" data-id="${product.id}">
                    <i class="fas fa-heart"></i> В избранное
                </button>
            </div>
        `).join( '' );

		// Добавляем обработчики для рекомендаций
		document.querySelectorAll( '.recommendation-add' ).forEach( btn => {
			btn.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				const id = e.currentTarget.dataset.id;
				store.toggleFavorite( id );

				e.currentTarget.innerHTML = '<i class="fas fa-check"></i> Добавлено';
				e.currentTarget.style.background = '#2ecc71';
				e.currentTarget.style.color = 'white';

				setTimeout( () => {
					this.renderRecommendations();
				}, 2000 );
			} );
		} );
	}

	// ========== ОФОРМЛЕНИЕ ЗАКАЗА ==========
	openCheckoutModal() {
		const cart = store.getCart();
		if ( cart.length === 0 ) {
			API.showNotification( 'Корзина пуста', 'error' );
			return;
		}

		// Здесь можно открыть модальное окно оформления заказа
		alert( 'Функция оформления заказа в разработке' );
	}

	// ========== ПРОМОКОДЫ ==========
	applyPromoCode() {
		const input = document.getElementById( 'promoCodeInput' );
		const message = document.getElementById( 'promoMessage' );

		if ( !input || !message ) return;

		const code = input.value.trim().toUpperCase();

		const promoCodes = {
			'SAKURA10': { discount: 0.1, type: 'percent' },
			'KOMORI500': { discount: 500, type: 'fixed' },
			'WELCOME': { discount: 0.15, type: 'percent' }
		};

		if ( promoCodes[code] ) {
			message.style.color = '#2ecc71';
			message.textContent = 'Промокод применен!';
			this.applyDiscount( promoCodes[code] );
		} else {
			message.style.color = '#ff4757';
			message.textContent = 'Неверный промокод';
		}
	}

	applyDiscount( promo ) {
		// Логика применения скидки
		console.log( 'Применена скидка:', promo );
		this.updateCartSummary();
	}

	// ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========
	updateHeaderCounters() {
		const cartCount = document.getElementById( 'cartCount' );
		const favoritesCount = document.getElementById( 'favoritesCount' );

		if ( cartCount ) {
			const totalItems = store.getCartCount();
			cartCount.textContent = totalItems;
		}

		// Всегда обновляем счетчик избранного в шапке
		if ( favoritesCount ) {
			favoritesCount.textContent = store.favorites.length;
		}
	}

	getDeclension( number, words ) {
		const cases = [2, 0, 1, 1, 1, 2];
		const index = ( number % 100 > 4 && number % 100 < 20 ) ? 2 : cases[Math.min( number % 10, 5 )];
		return `${number} ${words[index]}`;
	}

	animateRemove( element, callback ) {
		if ( !element ) return;

		element.style.transition = 'all 0.3s ease';
		element.style.opacity = '0';
		element.style.transform = 'translateX(-20px)';

		setTimeout( () => {
			if ( callback ) callback();
			if ( element.parentNode ) {
				element.remove();
			}
		}, 300 );
	}
}

// Инициализация
document.addEventListener( 'DOMContentLoaded', () => {
	if ( document.querySelector( '.cart-page-content' ) || document.querySelector( '.favorites-page-content' ) ) {
		window.cartFavoritesPage = new CartFavoritesPage();
	}
} );