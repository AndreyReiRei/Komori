/* ===== СТРАНИЦА КАТЕГОРИИ ===== */

class CategoryPage {
	constructor( categoryKey, categoryName ) {
		this.categoryKey = categoryKey;
		this.categoryName = categoryName;
		this.currentPage = 1;
		this.itemsPerPage = 12;
		this.filters = {
			sortBy: 'default',
			status: 'all'
		};

		this.init();
	}

	init() {
		this.renderProducts();
		this.bindEvents();

		// Слушаем обновления товаров
		window.addEventListener( 'store:productsUpdated', () => {
			this.renderProducts();
		} );

		console.log( `Страница категории "${this.categoryName}" инициализирована` );
	}

	bindEvents() {
		// Сортировка
		const sortSelect = document.getElementById( 'sortBy' );
		if ( sortSelect ) {
			sortSelect.addEventListener( 'change', ( e ) => {
				this.filters.sortBy = e.target.value;
				this.currentPage = 1;
				this.renderProducts();
			} );
		}

		// Фильтр по наличию
		const statusFilter = document.getElementById( 'statusFilter' );
		if ( statusFilter ) {
			statusFilter.addEventListener( 'change', ( e ) => {
				this.filters.status = e.target.value;
				this.currentPage = 1;
				this.renderProducts();
			} );
		}

		// Пагинация
		const prevBtn = document.querySelector( '.pagination-btn.prev' );
		const nextBtn = document.querySelector( '.pagination-btn.next' );

		if ( prevBtn ) {
			prevBtn.addEventListener( 'click', () => {
				if ( this.currentPage > 1 ) {
					this.currentPage--;
					this.renderProducts();
				}
			} );
		}

		if ( nextBtn ) {
			nextBtn.addEventListener( 'click', () => {
				const totalPages = this.getTotalPages();
				if ( this.currentPage < totalPages ) {
					this.currentPage++;
					this.renderProducts();
				}
			} );
		}
	}

	getFilteredProducts() {
		let products = store.products.filter( product =>
			product.category === this.categoryKey
		);

		// Фильтр по наличию
		if ( this.filters.status !== 'all' ) {
			products = products.filter( p => p.status === this.filters.status );
		}

		// Сортировка
		switch ( this.filters.sortBy ) {
			case 'price-asc':
				products.sort( ( a, b ) => a.price - b.price );
				break;
			case 'price-desc':
				products.sort( ( a, b ) => b.price - a.price );
				break;
			case 'name-asc':
				products.sort( ( a, b ) => a.name.localeCompare( b.name ) );
				break;
			case 'name-desc':
				products.sort( ( a, b ) => b.name.localeCompare( a.name ) );
				break;
			case 'newest':
				products.sort( ( a, b ) => ( b.createdAt || '' ).localeCompare( a.createdAt || '' ) );
				break;
		}

		return products;
	}

	getTotalPages() {
		const products = this.getFilteredProducts();
		return Math.ceil( products.length / this.itemsPerPage );
	}

	renderProducts() {
		const grid = document.getElementById( 'productsGrid' );
		const emptyState = document.getElementById( 'emptyState' );
		const productsCount = document.getElementById( 'productsCount' );
		const pagination = document.getElementById( 'pagination' );

		if ( !grid ) return;

		const allProducts = this.getFilteredProducts();
		const totalPages = this.getTotalPages();

		// Обновляем счетчик товаров
		if ( productsCount ) {
			const count = allProducts.length;
			const text = this.getDeclension( count, ['товар', 'товара', 'товаров'] );
			productsCount.textContent = `${count} ${text}`;
		}

		if ( allProducts.length === 0 ) {
			grid.style.display = 'none';
			if ( emptyState ) emptyState.style.display = 'block';
			if ( pagination ) pagination.style.display = 'none';
			return;
		}

		grid.style.display = 'grid';
		if ( emptyState ) emptyState.style.display = 'none';

		// Пагинация
		const start = ( this.currentPage - 1 ) * this.itemsPerPage;
		const end = start + this.itemsPerPage;
		const products = allProducts.slice( start, end );

		grid.innerHTML = products.map( product => this.renderProductCard( product ) ).join( '' );
		this.attachProductEvents();

		// Обновляем пагинацию
		this.renderPagination( totalPages );
	}

	renderProductCard( product ) {
		const inCart = store.cart.find( item => item.id === product.id );
		const inCartQuantity = inCart ? inCart.quantity : 0;
		const availableQuantity = product.quantity - inCartQuantity;
		const isFavorite = store.isFavorite( product.id );

		// Бейджи
		let badges = '';
		if ( product.isNew ) badges += '<span class="product-badge new">Новинка</span>';
		if ( product.isHit ) badges += '<span class="product-badge hit">Хит</span>';
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
                    <div class="product-stock ${product.status}">
                        ${product.status === 'in-stock' ? 'В наличии' : 'Нет в наличии'}
                        ${product.quantity > 0 ? ` (${availableQuantity} шт.)` : ''}
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
					API.showNotification( 'Товар добавлен в корзину' );

					// Визуальный эффект
					const originalText = e.currentTarget.innerHTML;
					e.currentTarget.innerHTML = '<i class="fas fa-check"></i> Добавлено';

					setTimeout( () => {
						e.currentTarget.innerHTML = originalText;
					}, 2000 );

					API.updateHeaderCounters();

					// Обновляем количество доступных товаров на карточке
					this.renderProducts();
				} else {
					API.showNotification( 'Не удалось добавить товар', 'error' );
				}
			};
			btn.addEventListener( 'click', this.handleAddToCart );
		} );

		// Добавление в избранное
		document.querySelectorAll( '.favorite-btn' ).forEach( btn => {
			btn.removeEventListener( 'click', this.handleToggleFavorite );
			this.handleToggleFavorite = ( e ) => {
				e.preventDefault();
				const id = e.currentTarget.dataset.id;
				const isFavorite = store.toggleFavorite( id );

				e.currentTarget.classList.toggle( 'active', isFavorite );
				API.showNotification( isFavorite ? 'Добавлено в избранное' : 'Удалено из избранного' );
				API.updateHeaderCounters();
			};
			btn.addEventListener( 'click', this.handleToggleFavorite );
		} );
	}

	renderPagination( totalPages ) {
		const pagination = document.getElementById( 'pagination' );
		const paginationPages = document.getElementById( 'paginationPages' );
		const prevBtn = document.querySelector( '.pagination-btn.prev' );
		const nextBtn = document.querySelector( '.pagination-btn.next' );

		if ( totalPages <= 1 ) {
			if ( pagination ) pagination.style.display = 'none';
			return;
		}

		if ( pagination ) pagination.style.display = 'flex';

		// Обновляем состояние кнопок
		if ( prevBtn ) prevBtn.disabled = this.currentPage === 1;
		if ( nextBtn ) nextBtn.disabled = this.currentPage === totalPages;

		// Генерируем номера страниц
		if ( paginationPages ) {
			let pagesHTML = '';

			if ( totalPages <= 5 ) {
				for ( let i = 1; i <= totalPages; i++ ) {
					pagesHTML += `<span class="pagination-page ${i === this.currentPage ? 'current' : ''}" data-page="${i}">${i}</span>`;
				}
			} else {
				// Сложная пагинация с многоточиями
				if ( this.currentPage <= 3 ) {
					for ( let i = 1; i <= 4; i++ ) {
						pagesHTML += `<span class="pagination-page ${i === this.currentPage ? 'current' : ''}" data-page="${i}">${i}</span>`;
					}
					pagesHTML += '<span class="pagination-dots">...</span>';
					pagesHTML += `<span class="pagination-page" data-page="${totalPages}">${totalPages}</span>`;
				} else if ( this.currentPage >= totalPages - 2 ) {
					pagesHTML += `<span class="pagination-page" data-page="1">1</span>`;
					pagesHTML += '<span class="pagination-dots">...</span>';
					for ( let i = totalPages - 3; i <= totalPages; i++ ) {
						pagesHTML += `<span class="pagination-page ${i === this.currentPage ? 'current' : ''}" data-page="${i}">${i}</span>`;
					}
				} else {
					pagesHTML += `<span class="pagination-page" data-page="1">1</span>`;
					pagesHTML += '<span class="pagination-dots">...</span>';
					for ( let i = this.currentPage - 1; i <= this.currentPage + 1; i++ ) {
						pagesHTML += `<span class="pagination-page ${i === this.currentPage ? 'current' : ''}" data-page="${i}">${i}</span>`;
					}
					pagesHTML += '<span class="pagination-dots">...</span>';
					pagesHTML += `<span class="pagination-page" data-page="${totalPages}">${totalPages}</span>`;
				}
			}

			paginationPages.innerHTML = pagesHTML;

			// Добавляем обработчики на номера страниц
			document.querySelectorAll( '.pagination-page' ).forEach( page => {
				page.addEventListener( 'click', () => {
					const pageNum = parseInt( page.dataset.page );
					if ( pageNum && pageNum !== this.currentPage ) {
						this.currentPage = pageNum;
						this.renderProducts();
					}
				} );
			} );
		}
	}

	getDeclension( number, words ) {
		const cases = [2, 0, 1, 1, 1, 2];
		const index = ( number % 100 > 4 && number % 100 < 20 ) ? 2 : cases[Math.min( number % 10, 5 )];
		return `${number} ${words[index]}`;
	}

	// Метод для определения категории по URL или data-атрибутам
	static initFromPage() {
		// Определяем категорию по URL
		const path = window.location.pathname;
		let categoryKey = 'other';
		let categoryName = 'Другое';

		// Маппинг URL к ключам категорий
		const categoryMap = {
			'figurines': { key: 'figures', name: 'Аниме фигурки' },
			'tea': { key: 'tea', name: 'Японский чай' },
			'sweets': { key: 'sweets', name: 'Азиатские сладости' },
			'dishes': { key: 'tableware', name: 'Японская посуда' },
			'manga': { key: 'manga', name: 'Манга и книги' },
			'clothes': { key: 'clothing', name: 'Аниме одежда' },
			'games': { key: 'games', name: 'Японские игры' },
			'office': { key: 'stationery', name: 'Канцелярия кавай' },
			'cosmetics': { key: 'cosmetics', name: 'Косметика из Азии' },
			'decor': { key: 'decor', name: 'Азиатский декор' },
			'disks': { key: 'anime', name: 'Аниме на дисках' },
			'music': { key: 'music', name: 'Азиатская музыка' }
		};

		// Ищем соответствие в URL
		for ( const [urlPart, data] of Object.entries( categoryMap ) ) {
			if ( path.includes( urlPart ) ) {
				categoryKey = data.key;
				categoryName = data.name;
				break;
			}
		}

		// Также можно проверять data-атрибут на body
		const body = document.body;
		if ( body.dataset.category ) {
			categoryKey = body.dataset.category;
			// Ищем название по ключу
			const categories = {
				'figures': 'Аниме фигурки',
				'tea': 'Японский чай',
				'sweets': 'Азиатские сладости',
				'tableware': 'Японская посуда',
				'manga': 'Манга и книги',
				'clothing': 'Аниме одежда',
				'games': 'Японские игры',
				'stationery': 'Канцелярия кавай',
				'cosmetics': 'Косметика из Азии',
				'decor': 'Азиатский декор',
				'anime': 'Аниме на дисках',
				'music': 'Азиатская музыка',
				'other': 'Другое'
			};
			categoryName = categories[categoryKey] || categoryKey;
		}

		return { categoryKey, categoryName };
	}
}

// Автоматическая инициализация при загрузке страницы
document.addEventListener( 'DOMContentLoaded', function () {
	// Проверяем, что мы на странице категории (есть сетка товаров)
	if ( document.getElementById( 'productsGrid' ) ) {
		const { categoryKey, categoryName } = CategoryPage.initFromPage();
		window.categoryPage = new CategoryPage( categoryKey, categoryName );
	}
} );