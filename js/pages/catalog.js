/**
 * CatalogPage - класс для отображения каталога товаров на главной странице
 * Для сайта "Комори" - азиатский магазинчик
 */

class CatalogPage {
	constructor() {
		this.productsGrid = document.querySelector( '.products-scroll, .catalog-grid .products-grid' );
		this.init();
	}

	init() {
		if ( !this.productsGrid ) return;

		this.renderProducts();
		this.setupExpandableCatalog();

		// Слушаем обновления товаров
		window.addEventListener( 'store:productsUpdated', () => {
			console.log( 'Каталог: товары обновлены' );
			this.renderProducts();
		} );

		console.log( 'CatalogPage инициализирован' );
	}

	renderProducts() {
		const products = store.getCatalogProducts( {
			showOnlyInStock: false // Можно настроить
		} );

		if ( products.length === 0 ) {
			// Если нет товаров, показываем демо
			this.showDemoProducts();
			return;
		}

		// Очищаем и заполняем сетку
		this.productsGrid.innerHTML = products.map( product => this.renderProductCard( product ) ).join( '' );
		this.attachProductEvents();
	}

	renderProductCard( product ) {
		const inCart = store.cart.find( item => item.id === product.id );
		const inCartQuantity = inCart ? inCart.quantity : 0;
		const availableQuantity = product.quantity - inCartQuantity;
		const isFavorite = store.isFavorite( product.id );

		// Определяем бейджи
		let badges = '';
		if ( product.isHit ) badges += '<span class="product-badge hit">Хит продаж</span>';
		if ( product.isNew ) badges += '<span class="product-badge new">Новинка</span>';
		if ( product.oldPrice ) {
			const discount = Math.round( ( 1 - product.price / product.oldPrice ) * 100 );
			if ( discount > 0 ) badges += `<span class="product-badge sale">-${discount}%</span>`;
		}

		return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-image">
                    <img src="${API.getSafeImageUrl( product.image )}" 
                         alt="${product.name}" 
                         loading="lazy"
                         onerror="this.src='${API.getFallbackSvg( product.name )}'">
                    ${badges ? `<div class="product-badges">${badges}</div>` : ''}
                </div>
                <div class="product-content">
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-description">${product.description || ''}</p>
                    <div class="product-meta">
                        <span class="product-price">${API.formatPrice( product.price )}</span>
                        ${product.oldPrice ? `<span class="product-old-price">${API.formatPrice( product.oldPrice )}</span>` : ''}
                    </div>
                    <div class="product-actions">
                        <button class="product-btn add-to-cart" data-id="${product.id}"
                                ${product.status !== 'in-stock' || availableQuantity <= 0 ? 'disabled' : ''}>
                            <i class="fas fa-shopping-cart"></i> В корзину
                        </button>
                        <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-id="${product.id}">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
	}

	attachProductEvents() {
		// Добавление в корзину
		document.querySelectorAll( '.add-to-cart' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleAddToCart );
			this.handleAddToCart = ( e ) => {
				e.preventDefault();
				const id = e.currentTarget.dataset.id;

				if ( store.addToCart( id ) ) {
					API.showNotification( '✅ Товар добавлен в корзину' );

					// Визуальный эффект
					const originalText = e.currentTarget.innerHTML;
					e.currentTarget.innerHTML = '<i class="fas fa-check"></i> Добавлено';

					setTimeout( () => {
						e.currentTarget.innerHTML = originalText;
					}, 2000 );

					API.updateHeaderCounters();
				} else {
					API.showNotification( '❌ Не удалось добавить товар', 'error' );
				}
			};
			btn.addEventListener( 'click', this.handleAddToCart );
		} );

		// Добавление в избранное
		// В catalog.js - исправьте обработчик для избранного
		document.querySelectorAll( '.favorite-btn' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleToggleFavorite );
			this.handleToggleFavorite = ( e ) => {
				e.preventDefault();
				const id = e.currentTarget.dataset.id;
				const isFavorite = store.toggleFavorite( id );

				e.currentTarget.classList.toggle( 'active', isFavorite );

				// ИСПРАВЛЕНО
				if ( isFavorite ) {
					API.showNotification( '❤️ Товар добавлен в избранное' );
				} else {
					API.showNotification( '💔 Товар удален из избранного' );
				}

				API.updateHeaderCounters();
			};
			btn.addEventListener( 'click', this.handleToggleFavorite );
		} );
	}

	showDemoProducts() {
		// Демо-товары если в store пусто
		const demos = [
			{
				id: 'demo1',
				name: 'Аниме фигурка Наруто',
				price: 2499,
				oldPrice: 2999,
				description: 'Детализированная фигурка главного героя',
				image: 'https://via.placeholder.com/300x200',
				isHit: true,
				status: 'in-stock',
				quantity: 10
			},
			{
				id: 'demo2',
				name: 'Чай маття премиум',
				price: 890,
				description: 'Настоящий японский зелёный чай',
				image: 'https://via.placeholder.com/300x200',
				isNew: true,
				status: 'in-stock',
				quantity: 45
			},
			{
				id: 'demo3',
				name: 'Моти клубничные',
				price: 550,
				description: 'Нежные японские сладости',
				image: 'https://via.placeholder.com/300x200',
				status: 'in-stock',
				quantity: 23
			},
			{
				id: 'demo4',
				name: 'Пиала для чая "Сакура"',
				price: 890,
				oldPrice: 1190,
				description: 'Традиционная японская керамика',
				image: 'https://via.placeholder.com/300x200',
				status: 'in-stock',
				quantity: 15
			}
		];

		this.productsGrid.innerHTML = demos.map( product => this.renderProductCard( product ) ).join( '' );
		this.attachProductEvents();
	}

	// ========== РАЗВОРАЧИВАНИЕ КАТАЛОГА ==========
	setupExpandableCatalog() {
		const showAllBtn = document.querySelector( '.show-all-btn' );
		const catalogGrid = document.querySelector( '.catalog-grid' );
		const hiddenCategories = document.querySelectorAll( '.hidden-category' );

		if ( !showAllBtn || !catalogGrid ) return;

		let isExpanded = false;

		// Скрываем дополнительные категории
		hiddenCategories.forEach( item => {
			item.style.opacity = '0';
			item.style.transform = 'translateY(20px)';
			item.style.transition = 'all 0.5s ease';
			item.style.display = 'none';
		} );

		showAllBtn.addEventListener( 'click', ( e ) => {
			e.preventDefault();

			if ( isExpanded ) {
				// Сворачиваем
				hiddenCategories.forEach( item => {
					item.style.opacity = '0';
					item.style.transform = 'translateY(20px)';

					setTimeout( () => {
						item.style.display = 'none';
					}, 500 );
				} );

				setTimeout( () => {
					catalogGrid.classList.remove( 'expanded' );
				}, 500 );

				showAllBtn.classList.remove( 'expanded' );
				this.updateButtonText( showAllBtn, 'Показать все товары', 'fas fa-arrow-right' );
			} else {
				// Разворачиваем
				catalogGrid.classList.add( 'expanded' );
				showAllBtn.classList.add( 'expanded' );

				hiddenCategories.forEach( ( item, index ) => {
					setTimeout( () => {
						item.style.display = 'block';
						setTimeout( () => {
							item.style.opacity = '1';
							item.style.transform = 'translateY(0)';
						}, 50 );
					}, index * 100 );
				} );

				this.updateButtonText( showAllBtn, 'Скрыть товары', 'fas fa-arrow-up' );
			}

			isExpanded = !isExpanded;
		} );
	}

	updateButtonText( btn, text, iconClass ) {
		const span = btn.querySelector( 'span' );
		const icon = btn.querySelector( 'i' );
		if ( span ) span.textContent = text;
		if ( icon ) icon.className = iconClass;
	}
}

// Инициализация
document.addEventListener( 'DOMContentLoaded', () => {
	// Инициализируем каталог только если есть нужные элементы на странице
	if ( document.querySelector( '.products-scroll, .catalog-grid .products-grid' ) ) {
		window.catalogPage = new CatalogPage();
	}
} );