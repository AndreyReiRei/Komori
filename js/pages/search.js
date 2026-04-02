/**
 * Скрипт для поиска по сайту
 * Поиск осуществляется по всем товарам из store.js
 * Результаты отображаются в модальном окне с возможностью перехода к товару
 */

document.addEventListener( 'DOMContentLoaded', function () {
	const searchBtn = document.getElementById( 'searchBtn' );

	// Создаем модальное окно поиска с результатами
	createSearchModal();

	const searchModal = document.getElementById( 'searchModal' );
	const closeSearch = document.querySelector( '.close-search' );
	const searchInput = document.getElementById( 'searchInput' );
	const searchForm = document.getElementById( 'searchForm' );
	const searchResults = document.getElementById( 'searchResults' );

	// Открытие поиска
	if ( searchBtn ) {
		searchBtn.addEventListener( 'click', function ( e ) {
			e.preventDefault();
			openSearch();
		} );
	}

	// Закрытие поиска
	if ( closeSearch ) {
		closeSearch.addEventListener( 'click', closeSearchFunc );
	}

	// Закрытие по клику вне модального окна
	window.addEventListener( 'click', function ( e ) {
		if ( searchModal && e.target === searchModal ) {
			closeSearchFunc();
		}
	} );

	// Закрытие по Escape
	document.addEventListener( 'keydown', function ( e ) {
		if ( e.key === 'Escape' && searchModal && searchModal.style.display === 'flex' ) {
			closeSearchFunc();
		}
	} );

	// Обработка поиска
	if ( searchForm ) {
		searchForm.addEventListener( 'submit', function ( e ) {
			e.preventDefault();
			const query = searchInput.value.trim();
			if ( query ) {
				performSearch( query );
			}
		} );
	}

	// Поиск при вводе текста (с задержкой для оптимизации)
	if ( searchInput ) {
		let searchTimeout;
		searchInput.addEventListener( 'input', function ( e ) {
			clearTimeout( searchTimeout );
			const query = e.target.value.trim();
			if ( query.length >= 2 ) {
				searchTimeout = setTimeout( () => {
					performSearch( query );
				}, 300 );
			} else if ( query.length === 0 ) {
				clearResults();
			}
		} );
	}

	function openSearch() {
		if ( searchModal ) {
			searchModal.style.display = 'flex';
			setTimeout( () => {
				if ( searchInput ) searchInput.focus();
			}, 300 );

			// Блокируем прокрутку основной страницы
			document.body.style.overflow = 'hidden';
			document.body.style.position = 'fixed';
			document.body.style.width = '100%';

			clearResults();
			if ( searchInput ) searchInput.value = '';
		}
	}

	function closeSearchFunc() {
		if ( searchModal ) {
			searchModal.style.display = 'none';

			// Возвращаем прокрутку основной страницы
			document.body.style.overflow = '';
			document.body.style.position = '';
			document.body.style.width = '';

			clearResults();
			if ( searchInput ) searchInput.value = '';
		}
	}

	function clearResults() {
		const searchResults = document.getElementById( 'searchResults' );
		if ( searchResults ) {
			searchResults.innerHTML = '';
			searchResults.classList.remove( 'has-results' );
		}
		const noResultsMsg = document.getElementById( 'noResultsMessage' );
		if ( noResultsMsg ) {
			noResultsMsg.style.display = 'none';
		}
		const resultsCount = document.getElementById( 'resultsCount' );
		if ( resultsCount ) {
			resultsCount.style.display = 'none';
		}
	}

	function performSearch( query ) {
		console.log( 'Поиск по запросу:', query );

		if ( !window.store || !window.store.products ) {
			console.warn( 'Store не инициализирован или нет товаров' );
			showNoResults( query );
			return;
		}

		const allProducts = window.store.products || [];
		const searchResultsList = searchProducts( query, allProducts );
		displaySearchResults( searchResultsList, query );
	}

	function searchProducts( query, products ) {
		const lowerQuery = query.toLowerCase().trim();

		return products.filter( product => {
			const nameMatch = product.name && product.name.toLowerCase().includes( lowerQuery );
			const categoryName = getCategoryName( product.category );
			const categoryMatch = categoryName && categoryName.toLowerCase().includes( lowerQuery );
			const descriptionMatch = product.description &&
				product.description.toLowerCase().includes( lowerQuery );
			const skuMatch = product.sku &&
				product.sku.toLowerCase().includes( lowerQuery );
			const isNewMatch = product.isNew && 'новинка'.includes( lowerQuery );
			const isHitMatch = product.isHit && 'хит'.includes( lowerQuery );

			return nameMatch || categoryMatch || descriptionMatch || skuMatch ||
				isNewMatch || isHitMatch;
		} );
	}

	function getCategoryName( categoryCode ) {
		if ( window.store && window.store.categories ) {
			return window.store.categories[categoryCode] || categoryCode;
		}

		const categories = {
			'figures': 'Аниме фигурки',
			'tea': 'Японский чай',
			'sweets': 'Азиатские сладости',
			'manga': 'Манга и книги',
			'clothing': 'Аниме одежда',
			'tableware': 'Японская посуда',
			'games': 'Японские игры',
			'stationery': 'Канцелярия кавай',
			'cosmetics': 'Косметика из Азии',
			'decor': 'Азиатский декор',
			'anime': 'Аниме на дисках',
			'music': 'Азиатская музыка',
			'other': 'Другое'
		};
		return categories[categoryCode] || categoryCode;
	}

	function displaySearchResults( products, query ) {
		const searchResults = document.getElementById( 'searchResults' );
		const noResultsMsg = document.getElementById( 'noResultsMessage' );
		const resultsCount = document.getElementById( 'resultsCount' );

		if ( !searchResults ) return;

		searchResults.innerHTML = '';

		if ( products.length === 0 ) {
			showNoResults( query );
			return;
		}

		if ( noResultsMsg ) {
			noResultsMsg.style.display = 'none';
		}

		searchResults.classList.add( 'has-results' );

		if ( resultsCount ) {
			resultsCount.textContent = `Найдено ${products.length} товар${getDeclension( products.length )}`;
			resultsCount.style.display = 'block';
		}

		products.forEach( product => {
			const resultItem = createSearchResultItem( product, query );
			searchResults.appendChild( resultItem );
		} );
	}

	function getDeclension( count ) {
		if ( count % 10 === 1 && count % 100 !== 11 ) return '';
		if ( count % 10 >= 2 && count % 10 <= 4 && ( count % 100 < 10 || count % 100 >= 20 ) ) return 'а';
		return 'ов';
	}

	function createSearchResultItem( product, query ) {
		const item = document.createElement( 'div' );
		item.className = 'search-result-item';
		item.dataset.id = product.id;

		const formattedPrice = formatPrice( product.price );
		const oldPrice = product.oldPrice ? formatPrice( product.oldPrice ) : null;
		const productUrl = getProductUrl( product );
		const highlightedName = highlightMatches( product.name, query );
		const categoryName = getCategoryName( product.category );
		const highlightedCategory = highlightMatches( categoryName, query );

		item.innerHTML = `
            <div class="result-item-image">
                <img src="${getSafeImageUrl( product.image )}" 
                     alt="${escapeHtml( product.name )}"
                     onerror="this.onerror=null; this.src='${getFallbackImage()}'">
            </div>
            <div class="result-item-info">
                <div class="result-item-category">${highlightedCategory}</div>
                <div class="result-item-title">${highlightedName}</div>
                ${product.sku ? `<div class="result-item-sku">Артикул: ${escapeHtml( product.sku )}</div>` : ''}
                <div class="result-item-price">
                    <span class="current-price">${formattedPrice}</span>
                    ${oldPrice ? `<span class="old-price">${oldPrice}</span>` : ''}
                </div>
                <div class="result-item-status ${product.status === 'in-stock' ? 'in-stock' : 'out-of-stock'}">
                    <i class="fas ${product.status === 'in-stock' ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                    ${product.status === 'in-stock' ? 'В наличии' : 'Нет в наличии'}
                    ${product.quantity && product.status === 'in-stock' ? ` (${product.quantity} шт.)` : ''}
                </div>
            </div>
            <div class="result-item-actions">
                <button class="result-view-btn" data-url="${productUrl}">
                    <i class="fas fa-eye"></i> Просмотр
                </button>
                <button class="result-cart-btn ${product.status !== 'in-stock' ? 'disabled' : ''}" 
                        data-id="${product.id}"
                        ${product.status !== 'in-stock' ? 'disabled' : ''}>
                    <i class="fas fa-shopping-cart"></i> В корзину
                </button>
            </div>
        `;

		const viewBtn = item.querySelector( '.result-view-btn' );
		if ( viewBtn ) {
			viewBtn.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				const url = viewBtn.dataset.url;
				if ( url ) {
					window.location.href = url;
				}
			} );
		}

		const cartBtn = item.querySelector( '.result-cart-btn' );
		if ( cartBtn && !cartBtn.disabled ) {
			cartBtn.addEventListener( 'click', ( e ) => {
				e.preventDefault();
				e.stopPropagation();
				const productId = cartBtn.dataset.id;
				addToCartFromSearch( productId );
			} );
		}

		return item;
	}

	function addToCartFromSearch( productId ) {
		console.log( 'Добавление товара в корзину, ID:', productId );

		if ( !window.store ) {
			console.error( 'Store не инициализирован' );
			showNotification( 'Ошибка: корзина не доступна', 'error' );
			return;
		}

		const product = window.store.getProduct( productId );

		console.log( 'Найденный товар:', product );

		if ( !product ) {
			console.error( 'Товар не найден, ID:', productId );
			showNotification( 'Товар не найден', 'error' );
			return;
		}

		if ( product.status !== 'in-stock' || product.quantity <= 0 ) {
			showNotification( 'Товар отсутствует на складе', 'error' );
			return;
		}

		const result = window.store.addToCart( productId, 1 );

		console.log( 'Результат добавления в корзину:', result );

		if ( result ) {
			showNotification( 'Товар добавлен в корзину', 'success' );
			updateCartCounter();
		} else {
			showNotification( 'Не удалось добавить товар в корзину', 'error' );
		}
	}

	function updateCartCounter() {
		if ( window.store && window.store.getCartCount ) {
			const cartCount = window.store.getCartCount();
			const cartCountElement = document.getElementById( 'cartCount' );
			if ( cartCountElement ) {
				cartCountElement.textContent = cartCount;
				if ( cartCount > 0 ) {
					cartCountElement.style.display = 'flex';
				} else {
					cartCountElement.style.display = 'none';
				}
			}
		}
	}

	function formatPrice( price ) {
		if ( price === undefined || price === null ) return '0 ₽';
		return new Intl.NumberFormat( 'ru-RU' ).format( price ) + ' ₽';
	}

	function getSafeImageUrl( url ) {
		if ( !url ) return getFallbackImage();
		if ( url.startsWith( 'http' ) || url.startsWith( '/' ) || url.startsWith( 'data:' ) ) {
			return url;
		}
		return getFallbackImage();
	}

	function getFallbackImage() {
		return 'https://via.placeholder.com/100x100?text=Нет+изображения';
	}

	function getProductUrl( product ) {
		const categoryUrls = {
			'figures': '/pages html/catalog pages/figurines.html',
			'tea': '/pages html/catalog pages/tea.html',
			'sweets': '/pages html/catalog pages/sweets.html',
			'manga': '/pages html/catalog pages/manga.html',
			'clothing': '/pages html/catalog pages/clothes.html',
			'tableware': '/pages html/catalog pages/dishes.html',
			'games': '/pages html/catalog pages/games.html',
			'stationery': '/pages html/catalog pages/office.html',
			'cosmetics': '/pages html/catalog pages/cosmetics.html',
			'decor': '/pages html/catalog pages/decor.html',
			'anime': '/pages html/catalog pages/disks.html',
			'music': '/pages html/catalog pages/music.html',
			'other': '/pages html/catalog.html'
		};

		const baseUrl = categoryUrls[product.category] || '/pages html/catalog.html';
		return `${baseUrl}?product=${product.id}`;
	}

	function highlightMatches( text, query ) {
		if ( !text || !query ) return escapeHtml( text );

		const lowerText = text.toLowerCase();
		const lowerQuery = query.toLowerCase();
		const index = lowerText.indexOf( lowerQuery );

		if ( index === -1 ) return escapeHtml( text );

		const start = text.substring( 0, index );
		const match = text.substring( index, index + query.length );
		const end = text.substring( index + query.length );

		return `${escapeHtml( start )}<mark>${escapeHtml( match )}</mark>${escapeHtml( end )}`;
	}

	function escapeHtml( str ) {
		if ( !str ) return '';
		return str
			.replace( /&/g, '&amp;' )
			.replace( /</g, '&lt;' )
			.replace( />/g, '&gt;' )
			.replace( /"/g, '&quot;' )
			.replace( /'/g, '&#39;' );
	}

	function showNoResults( query ) {
		const searchResults = document.getElementById( 'searchResults' );
		const noResultsMsg = document.getElementById( 'noResultsMessage' );
		const resultsCount = document.getElementById( 'resultsCount' );

		if ( searchResults ) {
			searchResults.innerHTML = '';
			searchResults.classList.remove( 'has-results' );
		}

		if ( noResultsMsg ) {
			noResultsMsg.style.display = 'block';
			const querySpan = noResultsMsg.querySelector( '.search-query' );
			if ( querySpan ) {
				querySpan.textContent = query;
			}
		}

		if ( resultsCount ) {
			resultsCount.style.display = 'none';
		}
	}

	function showNotification( message, type = 'info' ) {
		if ( window.API && window.API.showNotification ) {
			window.API.showNotification( message, type );
			return;
		}

		const notification = document.createElement( 'div' );
		notification.className = `notification notification-${type}`;

		const icon = type === 'success' ? 'fa-check-circle' :
			type === 'error' ? 'fa-exclamation-circle' :
				'fa-info-circle';

		notification.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${escapeHtml( message )}</span>
        `;

		notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#ff3366'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10001;
            animation: slideIn 0.3s ease;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;

		document.body.appendChild( notification );

		setTimeout( () => {
			notification.style.animation = 'slideOut 0.3s ease';
			setTimeout( () => notification.remove(), 300 );
		}, 3000 );

		notification.addEventListener( 'click', () => notification.remove() );
	}

	function createSearchModal() {
		if ( document.getElementById( 'searchModal' ) ) return;

		const modalHTML = `
            <div id="searchModal" class="modal search-modal">
                <div class="modal-content search-modal-content">
                    <div class="search-header">
                        <h2><i class="fas fa-search"></i> Поиск по сайту</h2>
                        <button class="close-search">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <form id="searchForm" class="search-form">
                        <div class="search-input-wrapper">
                            <i class="fas fa-search search-icon"></i>
                            <input type="text" id="searchInput" 
                                   placeholder="Введите название товара, категорию, артикул..." 
                                   autocomplete="off">
                            <button type="submit" class="search-submit-btn">
                                <i class="fas fa-search"></i> Найти
                            </button>
                        </div>
                    </form>
                    
                    <div class="search-results-container">
                        <div id="resultsCount" class="results-header" style="display: none;"></div>
                        <div id="searchResults" class="search-results-list"></div>
                        
                        <div id="noResultsMessage" class="no-results-message" style="display: none;">
                            <i class="fas fa-search"></i>
                            <p>По запросу "<span class="search-query"></span>" ничего не найдено</p>
                            <p class="suggestion-text">Попробуйте изменить поисковый запрос или перейти в <a href="/pages html/catalog.html">каталог</a></p>
                        </div>
                    </div>
                    
                    <div class="search-suggestions">
                        <p class="suggestions-title">Популярные запросы:</p>
                        <div class="suggestions-tags">
                            <span class="suggestion-tag" data-query="Аниме фигурки">Аниме фигурки</span>
                            <span class="suggestion-tag" data-query="Японский чай">Японский чай</span>
                            <span class="suggestion-tag" data-query="Манга">Манга</span>
                            <span class="suggestion-tag" data-query="Канцелярия">Канцелярия</span>
                            <span class="suggestion-tag" data-query="Косметика">Косметика</span>
                            <span class="suggestion-tag" data-query="Фигурка Наруто">Фигурка Наруто</span>
                            <span class="suggestion-tag" data-query="Маття">Маття</span>
                            <span class="suggestion-tag" data-query="Мочи">Мочи</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

		document.body.insertAdjacentHTML( 'beforeend', modalHTML );
		addNotificationStyles();

		document.querySelectorAll( '.suggestion-tag' ).forEach( tag => {
			tag.addEventListener( 'click', function () {
				const query = this.dataset.query || this.textContent;
				const searchInput = document.getElementById( 'searchInput' );
				if ( searchInput ) {
					searchInput.value = query;
					performSearch( query );
				}
			} );
		} );
	}

	function addNotificationStyles() {
		if ( document.getElementById( 'notification-styles' ) ) return;

		const styles = `
            <style id="notification-styles">
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateX(100px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                
                @keyframes slideOut {
                    from {
                        opacity: 1;
                        transform: translateX(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(100px);
                    }
                }
            </style>
        `;

		document.head.insertAdjacentHTML( 'beforeend', styles );
	}
} );