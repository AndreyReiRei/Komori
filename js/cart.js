/**
 * Функционал страницы корзины
 * Сайт "Комори" - азиатский магазинчик
 */

class CartPage {
	constructor() {
		this.cartItems = [];
		this.init();
	}

	init() {
		this.loadCartData();
		this.bindEvents();
		this.updateCartDisplay();
	}

	loadCartData() {
		// Загрузка данных из localStorage или с сервера
		const savedCart = localStorage.getItem( 'komori_cart' );
		if ( savedCart ) {
			this.cartItems = JSON.parse( savedCart );
		} else {
			// Пример данных для демонстрации
			this.cartItems = [
				{ id: 1, name: 'Аниме фигурка Наруто', price: 2499, quantity: 1, oldPrice: 2999 },
				{ id: 2, name: 'Чай маття премиум', price: 899, quantity: 2 },
				{ id: 3, name: 'Моти клубничные', price: 550, quantity: 2, maxQuantity: 5 }
			];
		}
	}

	bindEvents() {
		// Обработчики для кнопок количества
		document.querySelectorAll( '.cart-quantity-btn.plus' ).forEach( btn => {
			btn.addEventListener( 'click', ( e ) => this.increaseQuantity( e ) );
		} );

		document.querySelectorAll( '.cart-quantity-btn.minus' ).forEach( btn => {
			btn.addEventListener( 'click', ( e ) => this.decreaseQuantity( e ) );
		} );

		// Обработчики для изменения количества через input
		document.querySelectorAll( '.cart-quantity-input' ).forEach( input => {
			input.addEventListener( 'change', ( e ) => this.changeQuantity( e ) );
		} );

		// Обработчики для удаления товара
		document.querySelectorAll( '.cart-remove-item' ).forEach( btn => {
			btn.addEventListener( 'click', ( e ) => this.removeItem( e ) );
		} );

		// Очистка корзины
		const clearCartBtn = document.getElementById( 'clearCartBtn' );
		if ( clearCartBtn ) {
			clearCartBtn.addEventListener( 'click', () => this.clearCart() );
		}

		// Применение промокода
		const applyPromoBtn = document.getElementById( 'applyPromoBtn' );
		if ( applyPromoBtn ) {
			applyPromoBtn.addEventListener( 'click', () => this.applyPromoCode() );
		}

		// Оформление заказа
		const checkoutBtn = document.getElementById( 'checkoutBtn' );
		if ( checkoutBtn ) {
			checkoutBtn.addEventListener( 'click', () => this.checkout() );
		}

		// Добавление сопутствующих товаров
		document.querySelectorAll( '.related-product-add' ).forEach( btn => {
			btn.addEventListener( 'click', ( e ) => this.addRelatedProduct( e ) );
		} );
	}

	increaseQuantity( e ) {
		const btn = e.currentTarget;
		const id = btn.dataset.id;
		const input = document.querySelector( `.cart-quantity-input[data-id="${id}"]` );
		const max = parseInt( input.getAttribute( 'max' ) ) || 99;
		let value = parseInt( input.value ) + 1;

		if ( value <= max ) {
			input.value = value;
			this.updateItemQuantity( id, value );
		}
	}

	decreaseQuantity( e ) {
		const btn = e.currentTarget;
		const id = btn.dataset.id;
		const input = document.querySelector( `.cart-quantity-input[data-id="${id}"]` );
		let value = parseInt( input.value ) - 1;

		if ( value >= 1 ) {
			input.value = value;
			this.updateItemQuantity( id, value );
		}
	}

	changeQuantity( e ) {
		const input = e.currentTarget;
		const id = input.dataset.id;
		const max = parseInt( input.getAttribute( 'max' ) ) || 99;
		let value = parseInt( input.value );

		if ( isNaN( value ) || value < 1 ) {
			value = 1;
		} else if ( value > max ) {
			value = max;
		}

		input.value = value;
		this.updateItemQuantity( id, value );
	}

	updateItemQuantity( id, quantity ) {
		// Обновляем в массиве
		const item = this.cartItems.find( item => item.id == id );
		if ( item ) {
			item.quantity = quantity;
		}

		// Обновляем сумму для этого товара
		const row = document.querySelector( `.cart-item-row[data-id="${id}"]` );
		const price = parseFloat( row.querySelector( '.cart-price-current' ).textContent.replace( /[^\d]/g, '' ) );
		const totalElement = row.querySelector( '.cart-item-total' );
		totalElement.textContent = this.formatPrice( price * quantity );

		// Обновляем общие итоги
		this.updateTotals();

		// Сохраняем в localStorage
		this.saveCart();
	}

	removeItem( e ) {
		const btn = e.currentTarget;
		const id = btn.dataset.id;

		// Анимация удаления
		const row = document.querySelector( `.cart-item-row[data-id="${id}"]` );
		row.style.animation = 'fadeOut 0.3s ease forwards';

		setTimeout( () => {
			// Удаляем из массива
			this.cartItems = this.cartItems.filter( item => item.id != id );
			row.remove();

			// Обновляем итоги
			this.updateTotals();

			// Проверяем, пуста ли корзина
			this.checkIfCartEmpty();

			// Сохраняем в localStorage
			this.saveCart();
		}, 300 );
	}

	clearCart() {
		if ( confirm( 'Вы уверены, что хотите очистить корзину?' ) ) {
			const rows = document.querySelectorAll( '.cart-item-row' );

			rows.forEach( ( row, index ) => {
				setTimeout( () => {
					row.style.animation = 'fadeOut 0.3s ease forwards';
				}, index * 100 );
			} );

			setTimeout( () => {
				this.cartItems = [];
				document.querySelector( '.cart-with-items' ).style.display = 'none';
				document.getElementById( 'cartEmptyState' ).style.display = 'block';
				this.saveCart();
			}, rows.length * 100 + 300 );
		}
	}

	updateTotals() {
		let subtotal = 0;
		let itemsCount = 0;

		document.querySelectorAll( '.cart-item-row' ).forEach( row => {
			const price = parseFloat( row.querySelector( '.cart-price-current' ).textContent.replace( /[^\d]/g, '' ) );
			const quantity = parseInt( row.querySelector( '.cart-quantity-input' ).value );
			subtotal += price * quantity;
			itemsCount += quantity;
		} );

		// Обновляем информацию в шапке
		const itemsCountElement = document.querySelector( '.cart-items-count' );
		const totalAmountElement = document.querySelector( '.cart-total-amount' );

		if ( itemsCountElement ) {
			itemsCountElement.textContent = this.getDeclension( itemsCount, ['товар', 'товара', 'товаров'] );
		}

		if ( totalAmountElement ) {
			totalAmountElement.textContent = `на сумму ${this.formatPrice( subtotal )}`;
		}

		// Обновляем суммы в боковой панели
		const subtotalElement = document.querySelector( '.cart-summary-row span:last-child' );
		if ( subtotalElement ) {
			subtotalElement.textContent = this.formatPrice( subtotal );
		}

		const totalElement = document.querySelector( '.total-amount' );
		if ( totalElement ) {
			// Учитываем скидку
			const discount = 500; // Пример скидки
			totalElement.textContent = this.formatPrice( subtotal - discount );
		}
	}

	checkIfCartEmpty() {
		const rows = document.querySelectorAll( '.cart-item-row' );
		if ( rows.length === 0 ) {
			document.querySelector( '.cart-with-items' ).style.display = 'none';
			document.getElementById( 'cartEmptyState' ).style.display = 'block';
		}
	}

	applyPromoCode() {
		const input = document.getElementById( 'promoCodeInput' );
		const message = document.getElementById( 'promoMessage' );
		const code = input.value.trim().toUpperCase();

		const promoCodes = {
			'SAKURA10': { discount: 0.1, type: 'percent' },
			'KOMORI500': { discount: 500, type: 'fixed' },
			'WELCOME': { discount: 0.15, type: 'percent' }
		};

		if ( promoCodes[code] ) {
			message.style.color = '#2ecc71';
			message.textContent = 'Промокод применен!';

			// Здесь можно применить скидку
			this.applyDiscount( promoCodes[code] );
		} else {
			message.style.color = '#ff4757';
			message.textContent = 'Неверный промокод';
		}
	}

	applyDiscount( promo ) {
		// Логика применения скидки
		console.log( 'Применена скидка:', promo );
	}

	checkout() {
		if ( this.cartItems.length === 0 ) {
			alert( 'Ваша корзина пуста' );
			return;
		}

		// Переход на страницу оформления заказа
		window.location.href = 'checkout.html';
	}

	addRelatedProduct( e ) {
		const btn = e.currentTarget;
		const id = btn.dataset.id;

		// Добавляем товар в корзину
		alert( 'Товар добавлен в корзину' );

		// Здесь можно обновить счетчик в шапке
		this.updateCartCounter();
	}

	updateCartDisplay() {
		if ( this.cartItems.length === 0 ) {
			document.querySelector( '.cart-with-items' ).style.display = 'none';
			document.getElementById( 'cartEmptyState' ).style.display = 'block';
		} else {
			document.querySelector( '.cart-with-items' ).style.display = 'grid';
			document.getElementById( 'cartEmptyState' ).style.display = 'none';
		}

		this.updateTotals();
	}

	updateCartCounter() {
		// Обновляем счетчик в шапке
		const cartCount = document.getElementById( 'cartCount' );
		if ( cartCount ) {
			const totalItems = this.cartItems.reduce( ( sum, item ) => sum + item.quantity, 0 );
			cartCount.textContent = totalItems;
		}
	}

	saveCart() {
		localStorage.setItem( 'komori_cart', JSON.stringify( this.cartItems ) );
		this.updateCartCounter();
	}

	formatPrice( price ) {
		return price.toString().replace( /\B(?=(\d{3})+(?!\d))/g, ' ' ) + ' ₽';
	}

	getDeclension( number, words ) {
		const cases = [2, 0, 1, 1, 1, 2];
		const index = ( number % 100 > 4 && number % 100 < 20 ) ? 2 : cases[Math.min( number % 10, 5 )];
		return `${number} ${words[index]}`;
	}
}

// Инициализация при загрузке страницы
document.addEventListener( 'DOMContentLoaded', function () {
	// Добавляем CSS анимацию для удаления
	if ( !document.querySelector( '#cartAnimations' ) ) {
		const style = document.createElement( 'style' );
		style.id = 'cartAnimations';
		style.textContent = `
            @keyframes fadeOut {
                from {
                    opacity: 1;
                    transform: translateX(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(-20px);
                }
            }
        `;
		document.head.appendChild( style );
	}

	// Создаем экземпляр корзины
	window.cartPage = new CartPage();
} );